import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { GoogleGenAI } from '@google/genai';

// Redis 클라이언트 초기화 (Upstash 및 Vercel KV 지원)
let redis = null;
try {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (url && token) {
        redis = new Redis({ url, token });
    }
} catch (e) {
    console.error("Redis Init Error:", e);
}

/**
 * 코인 시장(24/7) 상태와 캐시 만료 시간을 계산합니다.
 */
function getMarketStatus() {
    return {
        isMarketOpen: true,
        ttl: 1800, // 코인 시장은 변동성이 크므로 30분 캐시
        statusText: "24시간 실시간 데이터 분석 중"
    };
}

export async function POST(req) {
    try {
        const { symbol, name, chartData, technicalData } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY?.trim();

        if (!apiKey) {
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });
        }

        // 1. Redis 캐시 확인 (있으면 즉시 반환)
        const cacheKey = `coin_ai_analysis_${symbol}`;
        if (redis) {
            try {
                const cached = await redis.get(cacheKey);
                if (cached) {
                    console.log(`Cache Hit for ${symbol}`);
                    return NextResponse.json({ ...cached, isCached: true });
                }
            } catch (e) {
                console.error("Redis Get Error:", e);
            }
        }

        const { isMarketOpen, ttl, statusText } = getMarketStatus();

        // 2. Google AI SDK 초기화
        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
          당신은 글로벌 1위 가상자산 전문 분석가이며, 성승현 저자의 '캔들차트 추세추종 투자 원칙'을 가상자산 시장에 완벽하게 응용시킨 전문가입니다.
          제공된 '${name}(${symbol})'의 데이터를 바탕으로 아래의 **시스템 지침**을 준수하여 분석을 수행하세요.

          현재 시장 상태: ${statusText}
          (참고: 장중일 경우 현재가를 기준으로 잠재적 에너지를 분석하고, 장마감 후일 경우 확정된 종가를 기준으로 내일의 방향성을 분석하세요.)

          [시스템 지침: 캔들차트 추세추종 원칙]
          1. 5대 분석기 중심: 거래량(시작점), 캔들(심리), 파동(흐름), 추세(방향), 이평선(지지/저항)을 유기적으로 분석할 것.
          2. 종가 우선주의: 모든 판단은 확정된 '종가'를 기준으로 하며, 장중 변동성에 속지 말 것.
          3. 에너지 상쇄와 상반: 캔들의 색상과 꼬리를 통해 매수/매도 세력의 최종 에너지를 파악할 것.
          4. 실전 기술 적용:
             - 장대양봉 발생 시 4등분선(75%, 50%, 25%)을 기준으로 에너지 잔존량 평가.
             - 거래량 없는 급등락은 '구라 캔들(속임수)'로 의심하고 역발상으로 접근.
             - 시가의 위치(전일 종가/이평선 대비)를 통해 당일의 에너지를 예측.
          5. 입체적 분석: 단일 캔들이 아닌 캔들 합치기와 뽀개기를 통해 세력의 매집 흔적(역매집봉 등)을 포착할 것.

          [최근 시장 데이터] 
          최근 가격 흐름: ${JSON.stringify(chartData)}
          기술적 지표 분석: ${JSON.stringify(technicalData)}
          
          위 원칙에 근거하여 전문가다운 어조로 분석 결과를 아래 JSON 형식으로만 응답하세요:
          {
            "summary": "10자 이내의 핵심 요약 (투자 원칙 키워드 포함)",
            "detail": "3~5문장의 구체적인 기술 분석 및 대응 전략. 장대양봉 4등분선이나 에너지 상쇄 관점을 언급할 것.",
            "sentiment": "bullish | bearish | neutral"
          }
        `;

        // 무료 티어 할당량 최적화 체인 (1.5 Flash는 RPM 15로 매우 넉넉함)
        const modelChain = [
            { name: 'gemini-1.5-flash', thinking: false, search: false },
            { name: 'gemini-2.0-flash', thinking: false, search: false },
            { name: 'gemini-2.0-flash-lite-preview-02-05', thinking: false, search: false }
        ];

        const contents = [
            {
                role: 'user',
                parts: [{ text: prompt }]
            }
        ];

        // 🤖 AI 분석 요청 함수 (최적화)
        const getAIResponse = async (model, useThinking, useSearch) => {
            const config = {
                generationConfig: {
                    temperature: 0.1, // 분석의 일관성을 위해 낮춤
                    response_mime_type: "application/json"
                }
            };

            // 도구는 꼭 필요할 때만 (여기서는 할당량 보존을 위해 제외)
            if (useThinking) config.thinkingConfig = { thinkingLevel: 'HIGH' };
            if (useSearch) config.tools = [{ googleSearch: {} }];

            return await ai.models.generateContent({
                model,
                config,
                contents,
            });
        };

        let response;
        let activeModel = 'None (Local)';
        let analysis = null;

        // 1. AI 모델 체인 시도 (이미 분석된 결과는 Redis에서 처리됨)
        for (const m of modelChain) {
            try {
                process.stdout.write(`Analyzing with ${m.name}...\n`);
                response = await getAIResponse(m.name, m.thinking, m.search);
                const aiText = response.candidates?.[0]?.content?.parts?.[0]?.text;
                if (aiText) {
                    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
                    analysis = JSON.parse(jsonMatch ? jsonMatch[0] : aiText);
                    activeModel = m.name;
                    break;
                }
            } catch (error) {
                console.warn(`${m.name} fail: ${error.message}`);
                // 다음 모델로 즉시 이동
            }
        }

        // 2. 모든 AI 실패 시 로컬 엔진으로 분석 (최종 폴백)
        if (!analysis) {
            console.log("All AI models failed. Using local technical analysis engine.");
            activeModel = 'Local Engine (Safe Mode)';

            const trend = (technicalData?.trend === 'up') ? '상승' : (technicalData?.trend === 'down' ? '하락' : '횡보');
            const sentiment = (technicalData?.trend === 'up') ? 'bullish' : (technicalData?.trend === 'down' ? 'bearish' : 'neutral');

            const minLevel = (technicalData?.keyLevels && technicalData.keyLevels.length > 0)
                ? Math.min(...technicalData.keyLevels).toLocaleString()
                : "직전 저가";

            analysis = {
                summary: `${name} ${trend} 추세持續 중`,
                detail: `현재 기술적 지표상 ${trend} 흐름이 관찰됩니다. 주요 지지선인 $${minLevel} 부근의 지지 여부를 확인하며 대응하는 것이 유리합니다. 전체적인 가상자산 시장 변동성이 큰 시점이므로 분할 매수/매도 관점을 유지하시기 바랍니다.`,
                sentiment: sentiment,
                analyzedAt: Date.now()
            };
        } else {
            // AI 분석 결과에 타임스탬프 추가
            analysis.analyzedAt = Date.now();
        }

        // 4. Redis에 결과 저장
        if (redis && analysis) {
            try {
                const { ttl } = getMarketStatus();
                // analyzedAt이 포함된 상태로 저장
                await redis.set(cacheKey, { ...analysis, statusText }, { ex: ttl });
            } catch (e) {
                console.error("Redis Set Error:", e);
            }
        }

        return NextResponse.json({ ...analysis, statusText, isCached: false, redisConnected: !!redis, model: activeModel });

    } catch (error) {
        console.error("AI Analysis Final Error:", error);
        return NextResponse.json({
            summary: "AI 진단 대기 중",
            detail: `현재 분석 서버 최신화 작업 중이거나 부하가 높습니다. 잠시 후 다시 시도해 주세요. (${error.message})`,
            sentiment: "neutral",
            redisConnected: !!redis
        }, { status: 200 });
    }
}
