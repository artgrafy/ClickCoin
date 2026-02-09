import { MARKET_REPORTS } from '@/lib/reports';

export default function sitemap() {
    const baseUrl = 'https://clickstock.success365.kr';

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
        ...reports,
    ];
}
