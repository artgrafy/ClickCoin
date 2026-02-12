import CoinAnalysisClient from '../CoinAnalysisClient';
import { STOCK_LIST } from '@/lib/stocks';

export async function generateMetadata({ params }) {
    const { symbol } = await params;
    const decodedSymbol = decodeURIComponent(symbol);
    const stock = STOCK_LIST.find(s => s.symbol === decodedSymbol);
    const name = stock ? stock.name : decodedSymbol;

    return {
        title: `${name} 차트 분석 | ClickCoin`,
        description: `${name} (${decodedSymbol})의 실시간 AI 차트 분석 및 매매 전략 리포트입니다.`,
        alternates: {
            canonical: `https://success365.kr/clickcoin/${decodedSymbol}`,
        },
    };
}

export default async function Page({ params }) {
    const { symbol } = await params;
    return <CoinAnalysisClient symbol={decodeURIComponent(symbol)} />;
}
