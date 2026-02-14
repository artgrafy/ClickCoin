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

    // 마크다운을 HTML로 변환하는 프리미엄 파서 (웹과 동일 로직)
    const mdToHtml = (text, isHeading = false) => {
        if (!text) return '';
        let html = text
            // 1. 불필요한 [레이블] 제거 (링크 제외)
            .replace(/\[[^\]]+\](?!\()/g, '')
            // 2. 기본 마크다운 스타일링 (이메일용 색상 조정)
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #000;">$1</strong>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #0A84FF; text-decoration: underline;">$1</a>');

        if (!isHeading) {
            html = html
                // 1. 지표형 레이블 사전 처리 (줄바꿈 변환 전 수행하여 태그 깨짐 방지)
                .replace(/(?<=^|\n)\s?([^.!?\n<]*?(분석|심리|지지|저항|시나리오|전략|의견|결론|종합|지표|구조|거래량|캔들|파동|추세|이평선|리스크|목표|손절|참고|기존|현재|대응|관점):)/g, '• <strong>$1</strong>')

                // 2. 지능형 단락 분리 (여백 추가)
                .replace(/\.\s+(?=다만|하지만|또한|따라서|결국|결과적으로|특히|반면|이에 따라|이와 같이|반대로|참고로|우선|끝으로)/g, '.<br/><br/>')

                // 3. 나열형 리스트 처리 (불렛 중복 방지)
                .replace(/(?<=[.>!?]|^)\s?\*\s?/g, '\n• ')
                .replace(/\s?([0-9]+\.\s)/g, '\n<strong>$1</strong>')
                .replace(/\s?(첫째|둘째|셋째|넷째|다섯째|마지막으로)(,\s?)/g, '\n<strong>$1$2</strong>')
                .replace(/\s?(또한)(,\s?)/g, '\n\n<strong>$1$2</strong>')

                // 4. 최종 줄바꿈 변환 (\n -> <br/>)
                .replace(/\n\n/g, '<br/><br/>')
                .replace(/\n/g, '<br/>');

            // 5. 중복 여백 및 불릿 정제
            html = html.replace(/(<br\/>){3,}/g, '<br/><br/>')
                .replace(/<br\/>•/g, '<br/>•')
                .replace(/^<br\/>/, '');
        }

        return html;
    };

    try {
        const { date, title, summary, content, tags } = report;

        // 메일 클라이언트 호환성을 극대화한 HTML
        const htmlContent = `
<div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6; background-color: #ffffff;">
    <header style="border-bottom: 2px solid #0A84FF; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="color: #0A84FF; margin: 0; font-size: 28px;">ClickCoin</h1>
        <p style="margin: 5px 0 0; color: #666;">${date} 오늘의 코인 정보 (Beta)</p>
    </header>
    
    <h2 style="font-size: 22px; margin-bottom: 15px; color: #000; line-height: 1.3;">${mdToHtml(title, true)}</h2>
    <div style="background: #f9f9f9; padding: 18px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #0A84FF;">
        <p style="margin: 0; font-weight: bold; font-size: 16px; line-height: 1.7; color: #222;">${mdToHtml(summary.replace(/^요약:\s*/, ''))}</p>
    </div>

    <div style="margin-bottom: 30px;">
        ${content.map(item => {
            if (item.type === 'heading') return `<h3 style="margin-top: 30px; margin-bottom: 15px; color: #000; border-left: 4px solid #0A84FF; padding-left: 12px; font-size: 18px;">${mdToHtml(item.text, true).replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim()}</h3>`;
            if (item.type === 'paragraph') {
                return `<p style="margin-bottom: 20px; line-height: 2.0; font-size: 16px; color: #444; text-align: justify;">${mdToHtml(item.text)}</p>`;
            }
            if (item.type === 'quote') return `<div style="font-style: italic; color: #555; background: #f0f0f0; padding: 20px; border-radius: 12px; text-align: center; margin: 25px 0; line-height: 1.7;">"${mdToHtml(item.text)}"</div>`;
            return '';
        }).join('')}
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; margin-bottom: 30px;">
        <p style="margin-bottom: 15px; color: #888; font-size: 14px;">${tags.map(t => `#${t.replace('#', '')}`).join(' ')}</p>
        <a href="https://success365.kr/clickcoin/" style="display: inline-block; background: #0A84FF; color: #fff; padding: 14px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px;">상세 코인 리포트 보기</a>
    </div >

    <div style="margin-top: 40px; padding: 25px; background: #f0f7ff; border-radius: 15px; border: 1px dashed #0A84FF; text-align: center;">
        <p style="margin: 0; color: #0A84FF; font-weight: bold; font-size: 15px;">📢 ClickCoin은 현재 Beta 테스트 중입니다</p>
        <p style="margin: 10px 0 0; color: #666; font-size: 13px; line-height: 1.6;">
            리포트의 품질이나 개선이 필요한 점이 있다면 이 메일에 답장으로 자유롭게 의견을 보내주세요.<br/>
            사용자님의 소중한 피드백이 더 나은 서비스를 만듭니다.
        </p>
    </div>

    <footer style="margin-top: 50px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #f0f0f0; padding-top: 30px;">
        <p style="margin-bottom: 10px;">본 메일은 ClickCoin 시황 서비스 구독자분들께 발송되었습니다.</p>
        <p style="margin-bottom: 5px;">본 정보는 참고용이며, 모든 투자의 최종 책임은 본인에게 있습니다.</p>
        <p>&copy; 2026 ClickCoin. All rights reserved.</p>
    </footer>
</div>
            `;

        // 각 구독자별 개별 발송 (Rate Limit 준수를 위해 순차 발송 + 딜레이)
        let sentCount = 0;
        for (const email of subscribers) {
            try {
                await resend.emails.send({
                    from: 'ClickCoin <daily@success365.kr>',
                    to: [email],
                    replyTo: 'jyoo21c@gmail.com',
                    subject: `[오늘의 코인] ${date}: ${title.replace(/[\[\]]/g, '')}`,
                    html: htmlContent,
                });
                sentCount++;
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
