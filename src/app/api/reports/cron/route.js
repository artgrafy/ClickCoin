import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

let redis = null;
try {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (url && token) {
        redis = new Redis({ url, token });
    }
} catch (e) { }

export async function GET() {
    try {
        const apiKey = process.env.GEMINI_API_KEY?.trim();
        if (!apiKey) throw new Error("API Key missing");

        const today = new Date();
        // 코인 시장은 24/7이므로 주말 제한 없이 생성 가능

        const dateStr = today.toISOString().split('T')[0];
        const displayDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

        const ai = new GoogleGenAI({ apiKey });
        const modelChain = [
            { name: 'gemini-2.0-flash-thinking-preview-01-21', thinking: true },
            { name: 'gemini-2.0-flash', thinking: false },
            { name: 'gemini-1.5-flash', thinking: false }
        ];

        const prompt = `당신은 글로벌 1위 가상자산 전문 분석가이며, 성승현 저자의 '캔들차트 추세추종 투자 원칙'을 가상자산 시장에 완벽하게 응용시킨 전문가입니다. 
        '${displayDate}'의 코인 시장 상황을 아래의 **전문 리포트 작성 지침**을 바탕으로 심층 분석하여 리포트를 작성하세요.
        
        [시스템 지침: 리포트 구성 원칙]
        1. 핵심 요약(Summary): 당일 시장을 관통하는 가장 중요한 기술적 결론과 대응 전략을 요약하여 작성하세요.
        2. 원칙 적용: 5대 분석기(거래량, 캔들, 파동, 추세, 이평선), 에너지 상쇄, 장대양봉 4등분선(75%, 50%, 25%) 관점을 분석 기저에 두어야 합니다.
        3. 구조화된 지식: 단순 현상 나열이 아닌, 현상의 '원인'과 '익일 대응책'을 인과관계에 따라 설명하세요.
        
        [본문 섹션 구성]
        - [시장 브리핑] 당일 지수 및 캔들 에너지 총평.
        - [수급 및 테마 육성] 자금의 흐름과 세력의 매집 흔적.
        - [전략적 분석] 주요 종목의 기술적 위치와 4등분선 기준 대응.
        - [최종 권고] 투자자가 유지해야 할 심리와 구체적인 시나리오.

        [수행 지침]
        1. 구글 검색을 활용하여 해당 날짜의 실제 지수와 뉴스 데이터를 확인하되, 목소리는 냉철한 시장 전문가여야 합니다.
        2. 각 문단(paragraph)은 정보가 매우 풍부해야 하며(최소 6문장 이상), 전문 투자 용어를 적극 사용하세요.
        
        반드시 다음 구조의 JSON으로만 응답하세요:
        {
          "id": "${dateStr}",
          "date": "${displayDate}",
          "title": "코인 시장의 흐름과 통찰력이 돋보이는 분석 리포트",
          "tags": ["#비트코인", "#차트분석", "#코인전략"],
          "summary": "시장 전체를 요약하는 핵심 전문 의견 (summary용)",
          "content": [
            { "type": "paragraph", "text": "[시장 총평] 캔들 및 거래량 에너지 진단 문단..." },
            { "type": "heading", "text": "기술적 심층 분석: 5대 분석기 관점" },
            { "type": "paragraph", "text": "시장 흐름과 에너지 상쇄 현상 분석 문단..." },
            { "type": "heading", "text": "주요 수급 및 주도 테마의 진의 파악" },
            { "type": "paragraph", "text": "세력의 매집 흔적과 특징주 에너지 분석 문단..." },
            { "type": "heading", "text": "향후 시나리오별 실전 대응 가이드" },
            { "type": "paragraph", "text": "시가 위치 및 4등분선 기준 대응 전략 문단..." },
            { "type": "quote", "text": "전문가로서 남기는 마지막 핵심 제언" }
          ]
        }`;

        const getAIResponse = async (model, useThinking) => {
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
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    newReport = JSON.parse(jsonMatch ? jsonMatch[0] : text);
                    newReport.createdAt = new Date().toISOString(); // 작성 시간 추가
                    break;
                }
            } catch (err) { }
        }

        if (newReport && redis) {
            const existing = await redis.get('coin_market_reports') || [];
            const filtered = existing.filter(r => r.id !== dateStr);
            const updated = [newReport, ...filtered].slice(0, 30);
            await redis.set('coin_market_reports', updated);

            // 📬 뉴스레터 발송 (비동기)
            try {
                const subscribers = await redis.smembers('coin_newsletter_subscribers');
                if (subscribers && subscribers.length > 0) {
                    const { sendNewsletter } = await import('@/lib/email');
                    await sendNewsletter(subscribers, newReport);
                }
            } catch (mailError) {
                console.error("Newsletter delivery failed:", mailError);
            }

            return NextResponse.json({ message: "Success", id: dateStr });
        }

        throw new Error("Report generation failed");
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
