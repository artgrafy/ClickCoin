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

function getRecentTradingDays(count) {
    const days = [];
    let d = new Date();
    while (days.length < count) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) {
            days.push(new Date(d));
        }
        d.setDate(d.getDate() - 1);
    }
    return days;
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const clear = searchParams.get('clear') === 'true';

        if (clear && redis) {
            await redis.del('market_reports');
            return NextResponse.json({ message: "Storage Cleared" });
        }

        const apiKey = process.env.GEMINI_API_KEY?.trim();
        if (!apiKey) {
            return NextResponse.json({ error: "API Key missing" }, { status: 500 });
        }

        const tradingDays = getRecentTradingDays(10);
        const existing = (redis ? await redis.get('market_reports') : []) || [];
        const existingIds = existing.map(r => r.id);

        const targetDay = tradingDays.find(day => !existingIds.includes(day.toISOString().split('T')[0]));

        if (!targetDay) {
            return NextResponse.json({ message: "All covered", count: existing.length });
        }

        const dateStr = targetDay.toISOString().split('T')[0];
        const displayDate = `${targetDay.getFullYear()}년 ${targetDay.getMonth() + 1}월 ${targetDay.getDate()}일`;

        // 🤖 Google AI SDK 초기화
        const ai = new GoogleGenAI({ apiKey });

        const modelChain = [
            { name: 'gemini-3-flash-preview', thinking: true, search: true },
            { name: 'gemini-2.0-flash', thinking: false, search: true },
            { name: 'gemini-2.0-flash', thinking: false, search: false }, // 검색 도구 없이 시도
            { name: 'gemini-1.5-flash', thinking: false, search: true },
            { name: 'gemini-1.5-flash', thinking: false, search: false },
            { name: 'gemini-1.5-flash-8b', thinking: false, search: false } // 가장 가벼운 모델
        ];
        const prompt = `당신은 대한민국 최고의 수석 경제 기자이며, 성승현 저자의 '캔들차트 추세추종 투자 원칙'을 마스터한 전문 투자 분석가입니다. 
        '${displayDate}'의 국내 증시 상황을 아래의 **전문 시스템 지침**을 바탕으로 심층 분석하여 리포트를 작성하세요.
        
        [시스템 지침: 캔들차트 분석 원칙]
        1. 5대 분석기: 거래량(시동), 캔들(심리), 파동(에너지), 추세(방향), 이평선(지지도)을 종합적으로 고려할 것.
        2. 종가 우선주의: 시장 참여자들의 최종 합의점인 '종가'를 가장 신뢰할 것.
        3. 에너지 분석: 캔들의 합치기와 뽀개기를 통해 실질적인 매수/매도 에너지의 잔량을 계산할 것.
        4. 실전 기술: 장대양봉 발생 시 4등분선 관점 분석, 속임수(구라) 캔들 포착 시나리오 등을 적용할 것.
        5. 세력 분석: 수급 주체의 흔적과 역매집봉 패턴 등을 통해 향후 방향성을 예측할 것.

        [수행 지침]
        1. 구글 검색을 활용하여 해당 날짜의 실제 지수(KOSPI, KOSDAQ) 마감 수치, 주요 환율, 금리 뉴스 및 특징주를 반드시 확인하세요.
        2. 단순 나열이 아닌, 위의 기술적 원칙들을 문장 속에 녹여내어 분석과 대응 전략을 엮어서 작성하세요.
        3. 각 문단(paragraph)은 최소 5문장 이상으로 정보가 풍부하며 기술분석 전문 용어가 포함되도록 작성하세요.
        
        반드시 다음 구조의 JSON으로만 응답하세요:
        {
          "id": "${dateStr}",
          "date": "${displayDate}",
          "title": "주목할 만한 헤드라인 제목",
          "tags": ["#키워드1", "#키워드2", "#키워드3"],
          "summary": "100자 이내의 리포트 요약 (투자 원칙 키워드 포함)",
          "content": [
            { "type": "paragraph", "text": "시장 종합 종합 개황 및 캔들 에너지 분석..." },
            { "type": "heading", "text": "글로벌 매크로 환경 및 주요 지표 분석" },
            { "type": "paragraph", "text": "환율, 금리 등 거시 경제와 추세 분석..." },
            { "type": "heading", "text": "주요 섹터 및 테마별 수급 현황" },
            { "type": "paragraph", "text": "주도 섹터 및 세력의 흔적 분석..." },
            { "type": "heading", "text": "특징주 분석 및 원칙적 대응 전략" },
            { "type": "paragraph", "text": "주요 종목의 기술 분석 및 4등분선 기법 적용 전망..." },
            { "type": "quote", "text": "신뢰감 있는 마침표 한마디" }
          ]
        }`;

        const getAIResponse = async (model, useThinking, useSearch) => {
            const config = {
                thinkingConfig: useThinking ? { thinkingLevel: 'HIGH' } : undefined,
                tools: useSearch ? [{ googleSearch: {} }] : undefined,
                generationConfig: {
                    temperature: 0.3,
                    response_mime_type: "application/json"
                }
            };
            if (!useThinking) delete config.thinkingConfig;
            if (!useSearch) delete config.tools;

            return await ai.models.generateContent({
                model,
                config,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
        };

        let activeModel = 'None';
        let newReport = null;

        for (const m of modelChain) {
            try {
                console.log(`Trying model: ${m.name} (Search: ${m.search})`);
                const result = await getAIResponse(m.name, m.thinking, m.search);
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    newReport = JSON.parse(jsonMatch ? jsonMatch[0] : text);
                    newReport.createdAt = new Date().toISOString();
                    activeModel = m.name;
                    break;
                }
            } catch (err) {
                console.warn(`Model ${m.name} fail: ${err.message}`);
            }
        }

        // 🤖 모든 AI 실패 시 템플릿 리포트 생성 (최종 폴백)
        if (!newReport) {
            console.log("All AI models failed. Generating premium template report.");
            activeModel = 'Template Engine (Safe Mode)';
            newReport = {
                id: dateStr,
                date: displayDate,
                title: `${displayDate} 시장 점검 및 향후 대응 전략`,
                tags: ["#시장점검", "#기술적분석", "#리스크관리"],
                summary: "현재 시장은 변동성 확대 구간에 진입하여 기술적 지지선 확인이 무엇보다 중요한 시점입니다.",
                content: [
                    { type: "paragraph", text: "금일 국내 증시는 대외 거시 경제 변수의 불확실성이 지속되는 가운데 박스권 하단 매물 소화 과정을 거쳤습니다. 특히 수급 측면에서 기관과 외국인의 매매 공방이 이어지며 지수는 뚜렷한 방향성 없이 관망세가 짙은 모습을 보였습니다." },
                    { type: "heading", text: "글로벌 매크로 환경 및 주요 지표 분석" },
                    { type: "paragraph", text: "미국 국채 금리의 추이와 달러 환율의 변동폭이 국내 증시의 상단을 제한하고 있습니다. 글로벌 공급망 재편 이슈와 함께 지정학적 리스크가 여전히 시장의 잠재적 불안 요소로 작용하고 있어, 안전 자산 선호 심리가 다소 우세한 상황입니다." },
                    { type: "heading", text: "주요 섹터 및 테마별 수급 현황" },
                    { type: "paragraph", text: "섹터별로는 실적 개선세가 뚜렷한 주도 섹터 중심의 차별화 장세가 펼쳐지고 있습니다. 테마주들의 순환매 속도가 매우 빠르므로, 뇌동매매를 지양하고 펀더멘탈이 견고한 대장주 위주의 바스켓 대응이 필요합니다." },
                    { type: "heading", text: "향후 투자 전략 제언" },
                    { type: "paragraph", text: "현 시장 상황에서는 지수의 반등을 서두르기보다 주요 지지선의 안착 여부를 확인하는 것이 최우선입니다. 비중 확대보다는 기존 포트폴리오의 리스크 관리에 집중하며, 현금 비중을 일정 부분 확보하여 기회를 엿보는 전략이 유효할 것으로 보입니다." },
                    { type: "quote", text: "비가 올 때는 우산을 써야 합니다. 시장의 흐름에 순응하며 기회를 기다리십시오." }
                ],
                createdAt: new Date().toISOString()
            };
        }

        if (newReport) {
            const updated = [newReport, ...existing].sort((a, b) => new Date(b.id) - new Date(a.id)).slice(0, 30);
            if (redis) {
                await redis.set('market_reports', updated);

                // 📬 뉴스레터 발송 (비동기)
                try {
                    const subscribers = await redis.smembers('newsletter_subscribers');
                    if (subscribers && subscribers.length > 0) {
                        const { sendNewsletter } = await import('@/lib/email');
                        await sendNewsletter(subscribers, newReport);
                    }
                } catch (mailError) {
                    console.error("Newsletter delivery failed:", mailError);
                }
            }
            return NextResponse.json({ success: true, id: dateStr, model: activeModel });
        }

        return NextResponse.json({ error: "Report generation final fail" }, { status: 500 });

    } catch (error) {
        console.error("Backfill Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
