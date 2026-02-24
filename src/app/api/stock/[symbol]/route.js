
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { symbol } = await params;
    let mcpUrl = process.env.MCP_SERVER_URL || 'https://success365.kr/api/mcp/';
    if (!mcpUrl.endsWith('/')) mcpUrl += '/';
    const mcpKey = process.env.INTERNAL_MCP_API_KEY || 'Success365_Secret_2026_50c4229bf417a672';

    try {
        // 본진 MCP 서버(Success365)에 분석 요청
        const mcpRequestUrl = mcpUrl;
        const response = await fetch(mcpRequestUrl, {
            method: 'POST',
            cache: 'no-store', // 최신 로직 반영을 위해 캐시 무력화
            headers: {
                'Content-Type': 'application/json',
                'x-mcp-key': mcpKey
            },
            body: JSON.stringify({
                tool: 'get_coin_status',
                params: {
                    symbol: symbol,
                    interval: '1d'
                }
            })
        });

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { error: responseText };
        }

        if (!response.ok) {
            const errorDetail = data.details || data.error || responseText;
            throw new Error(`MCP Server Error (${response.status}): ${errorDetail}`);
        }

        return NextResponse.json(data.result);
    } catch (error) {
        console.error('MCP Proxy Error:', error);
        return NextResponse.json({ error: 'Failed to fetch analysis from Hub', info: error.message }, { status: 500 });
    }
}
