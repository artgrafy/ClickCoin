import CoinAnalysisClient from '../CoinAnalysisClient';
import { STOCK_LIST } from '@/lib/stocks';

export async function generateMetadata({ params }) {
    const { symbol } = await params;
    const decodedSymbol = decodeURIComponent(symbol);
    const stock = STOCK_LIST.find(s => s.symbol === decodedSymbol);
    const name = stock ? stock.name : decodedSymbol;

    const today = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const title = `${name} 차트 분석 | ClickCoin`;
    const description = `${name} ${today} 차트 분석 완료! 지금 확인하세요.`;

    return {
        title,
        description,
        alternates: {
            canonical: `https://success365.kr/clickcoin/${decodedSymbol}`,
        },
        openGraph: {
            title,
            description,
            url: `https://success365.kr/clickcoin/${decodedSymbol}`,
            siteName: 'ClickCoin',
            images: [
                {
                    url: 'https://success365.kr/og-image.png', // Main Logo
                    width: 1200,
                    height: 630,
                },
            ],
            locale: 'ko_KR',
            type: 'website',
        },
    };
}

export default async function Page({ params }) {
    const { symbol } = await params;
    const decodedSymbol = decodeURIComponent(symbol);
    const stock = STOCK_LIST.find(s => s.symbol === decodedSymbol);
    const name = stock ? stock.name : decodedSymbol;
    const today = new Date().toISOString().split('T')[0];

    // JSON-LD for Financial Report
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FinancialReport',
        'name': `${name} AI 차트 분석 리포트`,
        'description': `${name} (${decodedSymbol})의 실시간 AI 기술적 분석 및 매매 전략 리포트입니다.`,
        'datePublished': today,
        'publisher': {
            '@type': 'Organization',
            'name': 'ClickCoin',
            'logo': {
                '@type': 'ImageObject',
                'url': 'https://success365.kr/og-image.png'
            }
        },
        'mainEntityOfPage': {
            '@type': 'WebPage',
            '@id': `https://success365.kr/clickcoin/${decodedSymbol}`
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <CoinAnalysisClient symbol={decodedSymbol} />
        </>
    );
}
