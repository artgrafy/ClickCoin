import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PolicyPage() {
    return (
        <main className="container" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
            <header style={{ marginBottom: '2rem' }}>
                <Link
                    href="/"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--accent-blue)',
                        textDecoration: 'none',
                        fontSize: '1rem',
                        fontWeight: 500
                    }}
                >
                    <ArrowLeft size={20} /> 클릭코인 메인으로
                </Link>
            </header>

            <article className="glass-panel animate-enter" style={{ padding: 'clamp(1.5rem, 5vw, 3.5rem)', lineHeight: '1.8' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '2.5rem', color: '#fff', letterSpacing: '-0.02em' }}>
                    개인정보처리방침
                </h1>

                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    <section>
                        <h2 style={{ color: '#fff', fontSize: '1.1rem', borderLeft: '3px solid rgba(255,255,255,0.2)', paddingLeft: '1rem', marginBottom: '0.8rem', fontWeight: 700 }}>
                            1. 수집하는 개인정보 및 목적
                        </h2>
                        <p>본 사이트는 사용자의 별도 정보를 서버에 저장하지 않습니다. 다만, 구글 애드센스(Google AdSense) 등 제3자 광고 서비스 제공 과정에서 사용자의 관심사에 맞는 광고를 노출하기 위해 '쿠키(Cookie)' 기술을 사용합니다.</p>
                    </section>

                    <section>
                        <h2 style={{ color: '#fff', fontSize: '1.1rem', borderLeft: '3px solid rgba(255,255,255,0.2)', paddingLeft: '1rem', marginBottom: '0.8rem', fontWeight: 700 }}>
                            2. 구글 애드센스 쿠키 및 광고 정책
                        </h2>
                        <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <li>Google을 포함한 제3자 판매자는 쿠키를 사용하여 사용자의 이전 방문을 바탕으로 광고를 게재합니다.</li>
                            <li>Google의 광고 쿠키를 사용하면 Google과 그 파트너가 본 사이트 또는 다른 사이트 방문을 바탕으로 사용자에게 광고를 게재할 수 있습니다.</li>
                            <li>사용자는 <a href="https://www.google.com/settings/ads" target="_blank" style={{ color: 'var(--accent-blue)', opacity: 0.8 }}>광고 설정</a>을 방문하여 개인 맞춤 광고를 해제할 수 있습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{ color: '#fff', fontSize: '1.1rem', borderLeft: '3px solid rgba(255,255,255,0.2)', paddingLeft: '1rem', marginBottom: '0.8rem', fontWeight: 700 }}>
                            3. 개인정보 보호 노력
                        </h2>
                        <p>저희는 사용자의 익명성을 존중하며, 어떠한 경우에도 수집된 익명 데이터를 외부로 유출하거나 판매하지 않습니다. 서비스 보안과 안정성을 위해 최선을 다하고 있습니다.</p>
                    </section>

                    <section>
                        <h2 style={{ color: '#fff', fontSize: '1.1rem', borderLeft: '3px solid rgba(255,255,255,0.2)', paddingLeft: '1rem', marginBottom: '0.8rem', fontWeight: 700 }}>
                            4. 투자 유의사항 및 면책고지
                        </h2>
                        <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <li>본 서비스에서 제공하는 모든 정보는 기술적 분석에 기반한 참고 자료일 뿐, 투자를 권유하거나 종목을 추천하는 것이 아닙니다.</li>
                            <li>시스템에 의해 계산되는 지표는 과거 데이터를 바탕으로 하며, 미래의 수익률을 보장하지 않습니다.</li>
                            <li>모든 투자 결정의 책임은 투자자 본인에게 있으며, 본 사이트는 이용자의 투자 결과에 대해 어떠한 법적 책임도 지지 않습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 style={{ color: '#fff', fontSize: '1.1rem', borderLeft: '3px solid rgba(255,255,255,0.2)', paddingLeft: '1rem', marginBottom: '0.8rem', fontWeight: 700 }}>
                            5. 관리자 연락처
                        </h2>
                        <p>개인정보 처리와 관련된 의문사항이나 요청 사항이 있으시면 아래 이메일로 연락 주시기 바랍니다.</p>
                        <p style={{ marginTop: '10px', fontWeight: 600 }}>Email: <a href="mailto:jyoo21c@gmail.com" style={{ color: 'var(--accent-blue)', textDecoration: 'none', opacity: 0.8 }}>jyoo21c@gmail.com</a></p>
                    </section>

                    <p style={{ marginTop: '2rem', fontSize: '0.85rem', opacity: 0.4 }}>공고 일자: 2026년 1월 30일 <br /> 시행 일자: 2026년 1월 30일</p>
                </div>
            </article>
        </main>
    );
}
