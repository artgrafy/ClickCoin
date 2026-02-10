
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    const { symbol } = await params;
    const mcpUrl = process.env.MCP_SERVER_URL || 'http://localhost:3000/api/mcp';
    const mcpKey = process.env.INTERNAL_MCP_API_KEY;

    try {
        // 본진 MCP 서버(Success365)에 분석 요청
        const response = await fetch(mcpUrl, {
            method: 'POST',
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

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MCP Server Error: ${errorText}`);
        }

        const data = await response.json();

        return NextResponse.json(data.result);
    } catch (error) {
        console.error('MCP Proxy Error:', error);
        return NextResponse.json({ error: 'Failed to fetch analysis from Hub', info: error.message }, { status: 500 });
    }
}
