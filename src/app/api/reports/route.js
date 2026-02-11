import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { MARKET_REPORTS as STATIC_REPORTS } from '@/lib/reports';

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
        // 1. Redis 캐시 먼저 확인
        let aiReports = [];
        if (redis) {
            aiReports = await redis.get('coin_market_reports') || [];
        }

        // 2. 캐시가 비어있으면 본진 Hub에서 가져오기
        if (aiReports.length === 0) {
            console.log('[ClickCoin] Cache Miss. Fetching from Hub...');
            const hubUrl = (process.env.SUCCESS365_HUB_URL || 'https://success365.kr').replace(/\/$/, '');
            const mcpKey = process.env.INTERNAL_MCP_API_KEY || 'Success365_Secret_2026_50c4229bf417a672';

            try {
                // 1. 본진 Hub에 리포트 생성 요청
                // User-Agent 헤더 포함 (cPanel ModSecurity WAF 403 차단 방지)
                // trailingSlash: true 대응을 위해 URL 끝에 / 추가
                const res = await fetch(`${hubUrl}/api/mcp/reports/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-mcp-key': mcpKey,
                        'User-Agent': 'ClickCoin-MCP-Bot/1.0 (Chrome-Lighthouse; compatible; internal-cron)',
                    },
                    body: JSON.stringify({ type: 'coin' })
                });
                if (res.ok) {
                    aiReports = await res.json();
                    // 로컬 Redis에 백필 (비동기)
                    if (redis && aiReports.length > 0) {
                        redis.set('coin_market_reports', aiReports).catch(console.error);
                    }
                } else if (res.status === 403) {
                    console.error(`[ClickCoin] ❌ 403 Forbidden - Hub 캐시 조회 차단됨. UA 화이트리스트 확인 필요.`);
                }
            } catch (e) {
                console.error('[ClickCoin] Hub Fetch Error:', e.message);
            }
        }

        // 3. 로컬 파일(Human) 데이터와 병합
        const combined = [...aiReports];
        const aiIds = new Set(aiReports.map(r => r.id));

        STATIC_REPORTS.forEach(hR => {
            if (!aiIds.has(hR.id)) {
                combined.push(hR);
            }
        });

        // 4. 날짜 역순 정렬
        const sorted = combined.sort((a, b) => new Date(b.id || b.date) - new Date(a.id || a.date));

        return NextResponse.json(sorted);
    } catch (error) {
        console.error('[ClickCoin Reports API] Error:', error);
        return NextResponse.json(STATIC_REPORTS);
    }
}
