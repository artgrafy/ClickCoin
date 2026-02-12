import { MARKET_REPORTS } from '@/lib/reports';
import { STOCK_LIST } from '@/lib/stocks';

export default function sitemap() {
    const baseUrl = 'https://success365.kr/clickcoin';

    // 코인 상세 페이지 주소들 (코인명 기반으로 변경)
    const coins = STOCK_LIST.map((coin) => ({
        url: `${baseUrl}/${encodeURIComponent(coin.name)}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.7,
    }));

    // 리포트 상세 페이지 주소들
    const reports = MARKET_REPORTS.map((report) => ({
        url: `${baseUrl}/report/${report.id}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.8,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 1,
        },
        ...coins,
        ...reports,
    ];
}
