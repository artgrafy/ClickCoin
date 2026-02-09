import { Resend } from 'resend';

export async function sendNewsletter(subscribers, report) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is missing. Skipping email send.");
        return;
    }

    if (!subscribers || subscribers.length === 0) {
        console.log("No subscribers to send to.");
        return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { date, title, summary, content, tags } = report;

        // 메일 클라이언트 호환성을 극대화한 HTML (표준 스타일 사용)
        const htmlContent = `
<div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6; background-color: #ffffff;">
    <header style="border-bottom: 2px solid #0A84FF; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="color: #0A84FF; margin: 0; font-size: 28px;">ClickCoin</h1>
        <p style="margin: 5px 0 0; color: #666;">${date} 오늘의 코인 정보 (Beta)</p>
    </header>
    
    <h2 style="font-size: 22px; margin-bottom: 15px; color: #000;">${title}</h2>
    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #0A84FF;">
        <p style="margin: 0; font-weight: bold;">${summary.replace(/^요약:\s*/, '')}</p>
    </div>

    <div style="margin-bottom: 30px;">
        ${content.map(item => {
            if (item.type === 'heading') return `<h3 style="margin-top: 25px; color: #000; border-left: 4px solid #0A84FF; padding-left: 10px;">${item.text}</h3>`;
            if (item.type === 'paragraph') {
                // [시장 브리핑] 같은 접두어 제거 및 줄바꿈 처리
                let cleanedText = item.text.replace(/^\[.*?\]\s*/, '');
                // 개행 문자를 <br/>로 변환하여 가독성 개선
                cleanedText = cleanedText.replace(/\n/g, '<br/>');
                return `<p style="margin-bottom: 15px; line-height: 1.8;">${cleanedText}</p>`;
            }
            if (item.type === 'quote') return `<div style="font-style: italic; color: #555; background: #eee; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">"${item.text}"</div>`;
            return '';
        }).join('')}
    </div>

    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; margin-bottom: 30px;">
        <p style="margin-bottom: 10px; color: #888; font-size: 14px;">${tags.join(' ')}</p>
        <a href="https://success365.kr/clickcoin/" style="display: inline-block; background: #0A84FF; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">코인 분석하기</a>
    </div >

    <div style="margin-top: 40px; padding: 20px; background: #f0f7ff; border-radius: 12px; border: 1px dashed #0A84FF; text-align: center;">
        <p style="margin: 0; color: #0A84FF; font-weight: bold; font-size: 15px;">📢 ClickCoin은 현재 Beta 테스트 중입니다</p>
        <p style="margin: 10px 0 0; color: #666; font-size: 13px; line-height: 1.5;">
            리포트의 품질이나 개선이 필요한 점이 있다면 이 메일에 답장으로 자유롭게 의견을 보내주세요.<br/>
            사용자님의 소중한 피드백이 더 나은 서비스를 만듭니다.
        </p>
    </div>

    <footer style="margin-top: 50px; font-size: 12px; color: #999; text-align: center;">
        <p>본 메일은 ClickCoin 시황 서비스 구독자분들께 발송되었습니다.</p>
        <p>&copy; 2026 ClickCoin. All rights reserved.</p>
    </footer>
</div >
            `;

        // 각 구독자별 개별 발송 (Rate Limit 준수를 위해 순차 발송 + 딜레이)
        let sentCount = 0;
        for (const email of subscribers) {
            try {
                await resend.emails.send({
                    from: 'ClickCoin <daily@success365.kr>',
                    to: [email],
                    replyTo: 'jyoo21c@gmail.com',
                    subject: `[ClickCoin] ${date} 오늘의 코인 정보: ${title} `,
                    html: htmlContent,
                });
                sentCount++;
                // Resend 무료 티어 Rate Limit (초당 2건) 준수를 위해 500ms 대기
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (err) {
                console.error(`Failed to send to ${email}: `, err);
            }
        }

        console.log(`Newsletter sent to ${sentCount} / ${subscribers.length} subscribers.`);
    } catch (error) {
        console.error("Failed to prepare newsletter:", error);
    }
}
