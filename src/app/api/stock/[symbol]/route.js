import YahooFinance from 'yahoo-finance2';
import { NextResponse } from 'next/server';

const yahooFinance = new YahooFinance();

export async function GET(request, { params }) {
    const { symbol } = await params;
    const stockSymbol = symbol;

    try {
        const today = new Date();
        const past = new Date();
        // Calculate enough days back to get 120 trading days (weekends + holidays)
        past.setDate(today.getDate() - 250);

        // Ensure we're using the instance method
        const result = await yahooFinance.historical(stockSymbol, {
            period1: past,
            period2: new Date(),
            interval: '1d',
        });

        if (!result || result.length === 0) {
            return NextResponse.json({ error: 'No data found' }, { status: 404 });
        }

        const chartData = result.map(quote => ({
            time: quote.date.toISOString().split('T')[0],
            open: quote.open,
            high: quote.high,
            low: quote.low,
            close: quote.close,
            volume: quote.volume,
        }));

        // Slice request: 120 days
        const latest120 = chartData.slice(-120);

        return NextResponse.json(latest120);
    } catch (error) {
        console.error('Stock fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch data', details: error.message }, { status: 500 });
    }
}
