import { sendNewsletter } from './src/lib/email.js';

async function testEmail() {
    console.log("📧 이메일 발송 테스트 시작...");

    // 테스트용 샘플 리포트 데이터
    const sampleReport = {
        id: '2026-02-09',
        date: '2026년 2월 9일',
        title: '코스피 5,300선 돌파와 반도체 섹터의 질주',
        summary: '외국인 매수세에 힘입어 코스피가 사상 최고치를 경신했습니다. 삼성전자와 SK하이닉스가 지수를 견인하며 반도체 슈퍼사이클의 서막을 알렸습니다.',
        tags: ['#코스피신고가', '#반도체슈퍼사이클', '#외국인매수'],
        content: [
            { type: 'paragraph', text: '[시장 브리핑] 2026년 2월 9일, 국내 증시는 뜨거운 용광로와 같았습니다. \n미 연준의 금리 인하 시그널과 엔비디아의 어닝 서프라이즈가 맞물리며 기술주 중심의 폭발적인 상승세가 연출되었습니다.' },
            { type: 'heading', text: '주요 섹터 동향: 반도체와 AI' },
            { type: 'paragraph', text: '삼성전자는 12만 원을 돌파하며 "10만 전자"의 굴레를 완벽히 벗어던졌습니다. \nSK하이닉스 또한 HBM4 공급 계약 소식에 상한가를 기록하며 시장의 주인공이 되었습니다.' },
            { type: 'heading', text: '투자 전략: 파도에 올라타라' },
            { type: 'paragraph', text: '현재의 상승장은 단순한 유동성 장세가 아닌 실적 기반의 "실적 장세"입니다. \n주도주인 반도체와 AI 관련주 비중을 확대하고, 조정 시마다 매수 관점을 유지하는 것이 유효합니다.' },
            { type: 'quote', text: '달리는 말에 올라타는 것이 두렵더라도, 지금은 과감함이 필요한 시점입니다.' }
        ]
    };

    // 수신자 설정 (테스트용)
    const testSubscribers = ['jyoo21c@gmail.com'];

    try {
        await sendNewsletter(testSubscribers, sampleReport);
        console.log("✅ 테스트 이메일 발송 완료! 메일함을 확인해 주세요.");
    } catch (error) {
        console.error("❌ 이메일 발송 실패:", error);
    }
}

testEmail();
