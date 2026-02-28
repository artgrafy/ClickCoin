import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { STOCK_LIST } from '@/lib/stocks';
import { calculateZigZag, checkBreakout, checkHighVolume } from '@/lib/indicators';
import { Redis } from '@upstash/redis';

const yahooFinance = new YahooFinance();

// Redis Initialize
let redis = null;
try {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (url && token) {
        redis = new Redis({ url, token });
    }
} catch (e) { }

/**
 * 본진(Success365) Hub 서버의 코인 분석 주기와 동기화된 TTL을 계산합니다.
 */
function getMarketStatus() {
    return { ttl: 60 * 60 * 12 }; // 코인은 상시 12시간 유지
}

async function getStockData(symbol, hubResult = null) {
    try {
        const result = await yahooFinance.historical(symbol, {
            period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 정확한 구조 파악을 위해 1년치 데이터 확보
            period2: new Date(),
            interval: '1d',
        });

        // 데이터 정제 및 오늘 봉 삭제 (본진 Hub 서버와 동기화)
        let candles = result.map(d => ({
            time: d.date.toISOString().split('T')[0],
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume
        }));

        const todayKST = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
        if (candles.length > 0 && candles[candles.length - 1].time === todayKST) {
            candles = candles.slice(0, -1);
        }

        if (candles.length < 2) return null;

        const latest = candles[candles.length - 1];
        const prev = candles[candles.length - 2];

        const changePercent = ((latest.close - prev.close) / prev.close) * 100;
        const volume = latest.volume;
        const value = latest.close * latest.volume; // 거래대금

        // MSB 판정 (본진 데이터가 있으면 본진 기준, 없으면 로컬 로직 fallback)
        let hasMSB = false;
        const zigZag = calculateZigZag(candles); // Calculate zigZag unconditionally
        if (hubResult?.marketStructure) {
            hasMSB = hubResult.marketStructure.hasMSB;
        } else {
            // 최근 5일 이내에 MSB 마커(추세반전)가 있는지 체크 (로컬 엔진 동기화)
            hasMSB = zigZag.hasRecentMSB;
        }

        return {
            symbol,
            changePercent,
            volume,
            value,
            hasMSB
        };
    } catch (e) {
        return null;
    }
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'rising';
    // 🚀 캐시 버전업: v102 (6개월 스윙 트레이딩 최적화 버전)
    const cacheKey = `coin_scan_results_v102_${type}`;

    // 1. Check Redis Cache
    if (redis) {
        try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                return NextResponse.json({
                    symbols: cachedData.symbols,
                    type,
                    cached: true,
                    timestamp: cachedData.timestamp
                });
            }
        } catch (error) {
            console.error("Redis get error:", error);
        }
    }

    // 2. Fresh Scan
    const allData = [];
    const chunkSize = 12;

    // 본진 배치 분석 데이터 미리 가져오기 (마커/MSB 데이터 동기화)
    let hubBatchData = {};
    try {
        const mcpKey = process.env.INTERNAL_MCP_API_KEY || 'Success365_Secret_2026_50c4229bf417a672';
        const hubBase = process.env.SUCCESS365_HUB_URL || 'https://success365.kr';
        const hubRes = await fetch(`${hubBase}/api/mcp/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-mcp-key': mcpKey },
            body: JSON.stringify({
                tool: 'get_batch_status',
                params: { symbols: STOCK_LIST.map(s => s.symbol), isCoin: true }
            })
        });
        if (hubRes.ok) {
            const data = await hubRes.json();
            hubBatchData = data.result || {};
        }
    } catch (e) {
        console.error("Hub Batch Fetch Error:", e);
    }

    try {
        for (let i = 0; i < STOCK_LIST.length; i += chunkSize) {
            const chunk = STOCK_LIST.slice(i, i + chunkSize);
            const promises = chunk.map(stock => getStockData(stock.symbol, hubBatchData[stock.symbol]));
            const results = await Promise.all(promises);
            results.forEach(res => {
                if (res) allData.push(res);
            });
            if (i + chunkSize < STOCK_LIST.length) {
                await new Promise(r => setTimeout(r, 50));
            }
        }

        // 3. 타입별 정렬 및 Top 10 추출
        let sorted = [];
        if (type === 'rising') {
            sorted = [...allData].sort((a, b) => b.changePercent - a.changePercent);
        } else if (type === 'volume') {
            sorted = [...allData].sort((a, b) => b.volume - a.volume);
        } else if (type === 'popular') {
            sorted = [...allData].sort((a, b) => b.value - a.value);
        } else if (type === 'msb') {
            // 폭풍 전야: MSB가 포착된 종목들 중 거래대금이 큰 순서
            sorted = allData.filter(d => d.hasMSB).sort((a, b) => b.value - a.value);
        }

        const top10Symbols = sorted.slice(0, 10).map(item => item.symbol);

        const resultData = {
            symbols: top10Symbols,
            type,
            timestamp: Date.now()
        };

        // 4. Save to Redis
        if (redis) {
            try {
                const { ttl } = getMarketStatus();
                await redis.set(cacheKey, resultData, { ex: ttl });
            } catch (error) {
                console.error("Redis set error:", error);
            }
        }

        return NextResponse.json({
            symbols: top10Symbols,
            type,
            cached: false,
            timestamp: resultData.timestamp
        });

    } catch (error) {
        console.error("Scan error:", error);
        return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
    }
}
