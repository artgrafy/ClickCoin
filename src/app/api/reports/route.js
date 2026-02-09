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
        // 1. 서버 저장소(AI) 데이터 가져오기
        let aiReports = [];
        if (redis) {
            aiReports = await redis.get('market_reports') || [];
        }

        // 2. 로컬 파일(Human) 데이터와 병합 (ID가 같으면 로컬 파일 우선)
        const combined = [...STATIC_REPORTS];

        aiReports.forEach(aiR => {
            if (!combined.some(hR => hR.id === aiR.id)) {
                combined.push(aiR);
            }
        });

        // 3. 날짜 역순 정렬
        const sorted = combined.sort((a, b) => new Date(b.id) - new Date(a.id));

        return NextResponse.json(sorted);
    } catch (error) {
        return NextResponse.json(STATIC_REPORTS); // 에러 시 로컬 파일이라도 반환
    }
}
