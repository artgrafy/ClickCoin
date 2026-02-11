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
        console.log('[ClickCoin Cron] Triggering Hub Report Generation...');

        const hubUrl = (process.env.SUCCESS365_HUB_URL || 'https://success365.kr').replace(/\/$/, '');
        const mcpKey = process.env.INTERNAL_MCP_API_KEY || 'Success365_Secret_2026_50c4229bf417a672';

        // 1. 본진 Hub에 리포트 생성 요청
        const res = await fetch(`${hubUrl}/api/mcp/reports`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-mcp-key': mcpKey
            },
            body: JSON.stringify({ type: 'coin' })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(`Hub Gen Failed: ${err.error}`);
        }

        const { report } = await res.json();
        console.log('[ClickCoin Cron] Hub Gen Success:', report.title);

        // 2. 뉴스레터 발송 (성공한 리포트 기반)
        if (redis) {
            try {
                const subscribers = await redis.smembers('coin_newsletter_subscribers');
                if (subscribers && subscribers.length > 0) {
                    const { sendNewsletter } = await import('@/lib/email');
                    await sendNewsletter(subscribers, report);
                    console.log(`[ClickCoin Cron] Newsletter sent to ${subscribers.length} subs`);
                }
            } catch (mailError) {
                console.error("[ClickCoin Cron] Newsletter failed:", mailError);
            }
        }

        return NextResponse.json({ message: "Success", title: report.title });

    } catch (error) {
        console.error('[ClickCoin Cron] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
