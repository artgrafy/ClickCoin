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
 * 코인 시장(24/7) 상태와 캐시 만료 시간을 계산합니다.
 */
function getMarketStatus() {
    return { isMarketOpen: true, ttl: 1800 };
}

async function getStockData(symbol) {
    try {
        const result = await yahooFinance.historical(symbol, {
            period1: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 최근 1주일
            period2: new Date(),
            interval: '1d',
        });

        if (!result || result.length < 2) return null;

        const latest = result[result.length - 1];
        const prev = result[result.length - 2];

        const changePercent = ((latest.close - prev.close) / prev.close) * 100;
        const volume = latest.volume;
        const value = latest.close * latest.volume; // 거래대금

        return {
            symbol,
            changePercent,
            volume,
            value
        };
    } catch (e) {
        return null;
    }
}

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'rising'; // 기본값 상승순
    const cacheKey = `scan_results_${type}`;

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

    // 2. Fresh Scan (모든 종목 데이터 수집)
    const allData = [];
    const chunkSize = 10;

    try {
        for (let i = 0; i < STOCK_LIST.length; i += chunkSize) {
            const chunk = STOCK_LIST.slice(i, i + chunkSize);
            const promises = chunk.map(stock => getStockData(stock.symbol));
            const results = await Promise.all(promises);
            results.forEach(res => {
                if (res) allData.push(res);
            });
            if (i + chunkSize < STOCK_LIST.length) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        // 3. 타입별 정렬 및 Top 10 추출
        let sorted = [];
        if (type === 'rising') {
            sorted = [...allData].sort((a, b) => b.changePercent - a.changePercent);
        } else if (type === 'volume') {
            sorted = [...allData].sort((a, b) => b.volume - a.volume);
        } else if (type === 'popular') {
            // 인기 = 거래대금 기준
            sorted = [...allData].sort((a, b) => b.value - a.value);
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
