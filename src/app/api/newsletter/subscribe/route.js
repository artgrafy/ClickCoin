import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

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

export async function POST(req) {
    try {
        const { email } = await req.json();

        // 간단한 이메일 유효성 검사
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return NextResponse.json({ error: "올바른 이메일 주소를 입력해주세요." }, { status: 400 });
        }

        if (!redis) {
            return NextResponse.json({ error: "데이터베이스 연결 실패" }, { status: 500 });
        }

        // Redis SADD (Set에 추가하여 중복 방지)
        await redis.sadd('coin_newsletter_subscribers', email);

        return NextResponse.json({ success: true, message: "구독이 완료되었습니다! 최신 시황 리포트를 보내드릴게요." });
    } catch (error) {
        return NextResponse.json({ error: "구독 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
