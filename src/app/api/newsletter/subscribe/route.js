import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { email } = await req.json();

        // 1. 유효성 검사
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return NextResponse.json({ error: "올바른 이메일 주소를 입력해주세요." }, { status: 400 });
        }

        // 2. 통합 허브 API 호출 정보
        const hubUrl = (process.env.SUCCESS365_HUB_URL || 'https://success365.kr').replace(/\/$/, '');
        const mcpKey = process.env.INTERNAL_MCP_API_KEY || 'Success365_Secret_2026_50c4229bf417a672';

        console.log(`[ClickCoin] Requesting Hub Subscribe: ${email}`);

        // 3. 타임아웃 처리가 포함된 Fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

        try {
            const response = await fetch(`${hubUrl}/api/mcp/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-mcp-key': mcpKey
                },
                body: JSON.stringify({
                    email,
                    app_type: 'coin'
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const result = await response.json();

            if (!response.ok) {
                console.error('[ClickCoin] Hub Error:', result.error);
                return NextResponse.json({ error: result.error || "구독 서비스 응답 오류" }, { status: response.status });
            }

            console.log(`[ClickCoin] Hub Sync Success: ${email}`);
            return NextResponse.json({
                success: true,
                message: "구독이 완료되었습니다! 최신 시황 리포트를 보내드릴게요."
            });

        } catch (fetchError) {
            clearTimeout(timeoutId);
            const isTimeout = fetchError.name === 'AbortError';
            console.error(`[ClickCoin] Hub Fetch Failed (${isTimeout ? 'Timeout' : 'Network Error'}):`, fetchError.message);

            return NextResponse.json({
                error: isTimeout ? "서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요." : "통합 서버 연결에 실패했습니다."
            }, { status: 503 });
        }

    } catch (error) {
        console.error("[ClickCoin] Internal Error:", error);
        return NextResponse.json({ error: "구독 처리 중 오류가 발생했습니다." }, { status: 500 });
    }
}
