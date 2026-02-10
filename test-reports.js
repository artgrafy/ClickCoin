
const { Redis } = require('@upstash/redis');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.production.local' });

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('🔄 ClickCoin Report Test Start...');
console.log('Redis URL:', UPSTASH_REDIS_REST_URL ? 'OK' : 'MISSING');
console.log('Gemini Key:', GEMINI_API_KEY ? 'OK' : 'MISSING');

async function testReportGeneration() {
    try {
        if (!GEMINI_API_KEY) throw new Error("API Key missing");

        const redis = new Redis({
            url: UPSTASH_REDIS_REST_URL,
            token: UPSTASH_REDIS_REST_TOKEN,
        });

        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const displayDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const modelChain = [
            { name: 'gemini-2.0-flash-thinking-preview', thinking: true },
            { name: 'gemini-2.0-flash', thinking: false },
            { name: 'gemini-2.0-pro-exp-02-05', thinking: false }
        ];

        const prompt = `당신은 대한민국 최고의 가상자산 전문 애널리스트입니다. 
        '${displayDate}'의 가상자산 시장 상황을 아래의 지침에 따라 심층 분석하여 리포트를 작성하세요.
        
        [분석 지침]
        1. 비트코인(BTC) 및 이더리움(ETH)의 현재 가격 흐름과 주요 지지/저항 라인을 분석하세요.
        2. 시장을 주도하는 알트코인 테마와 수급 현황을 파악하세요.
        3. 주요 거시경제 일정(FOMC, CPI 등)이 시장에 미치는 영향을 서술하세요.
        4. 투자자가 취해야 할 구체적인 대응 전략을 제시하세요.
        
        반드시 다음 구조의 JSON으로만 응답하세요:
        {
          "id": "${dateStr}",
          "date": "${displayDate}",
          "title": "가상자산 시장 분석 리포트 제목",
          "tags": ["#비트코인", "#알트코인", "#시장전망"],
          "summary": "핵심 요약 (한 줄)",
          "content": [
            { "type": "paragraph", "text": "시장 총평..." },
            { "type": "heading", "text": "주요 코인 분석" },
            { "type": "paragraph", "text": "BTC/ETH 및 알트코인 분석 내용..." },
            { "type": "heading", "text": "대응 전략" },
            { "type": "paragraph", "text": "구체적인 투자 전략..." }
          ]
        }`;

        const getAIResponse = async (model, useThinking) => {
            console.log(`🤖 Trying model: ${model} (Thinking: ${useThinking})...`);
            const config = {
                thinkingConfig: useThinking ? { thinkingLevel: 'HIGH' } : undefined,
                tools: [{ googleSearch: {} }],
                generationConfig: { temperature: 0.3, response_mime_type: "application/json" }
            };
            if (!useThinking) delete config.thinkingConfig;

            return await ai.models.generateContent({
                model,
                config,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
        };

        let newReport = null;
        for (const m of modelChain) {
            try {
                const result = await getAIResponse(m.name, m.thinking);
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    console.log('AI Raw Output Length:', text.length);
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    newReport = JSON.parse(jsonMatch ? jsonMatch[0] : text);
                    console.log('✅ Report Generated Successfully!');
                    break;
                }
            } catch (err) {
                console.error(`❌ Model ${m.name} failed:`, err.message);
                if (err.response) {
                    console.error('Full Error Response:', JSON.stringify(err.response, null, 2));
                }
            }
        }

        if (newReport) {
            console.log('📝 Report Title:', newReport.title);

            // Check Redis saving
            const key = 'coin_market_reports';
            const existing = await redis.get(key) || [];
            console.log(`📊 Existing reports in Redis: ${existing.length}`);

            const filtered = existing.filter(r => r.id !== dateStr);
            const updated = [newReport, ...filtered].slice(0, 30);
            await redis.set(key, updated);
            console.log('💾 Saved to Redis.');

            // Newsletter simulation
            const subKey = 'coin_newsletter_subscribers';
            const subscribers = await redis.smembers(subKey);
            console.log(`📬 Subscribers found: ${subscribers.length}`);

            console.log('✅ Test Completed Successfully');
        } else {
            console.error('❌ Failed to generate report with all models.');
        }

    } catch (error) {
        console.error('🔥 Fatal Error:', error);
    }
}

testReportGeneration();
