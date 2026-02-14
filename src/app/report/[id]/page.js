import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Tag, BookOpen, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Redis } from '@upstash/redis';
import { MARKET_REPORTS as STATIC_REPORTS } from '@/lib/reports';

let redis = null;
try {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (url && token) {
        redis = new Redis({ url, token });
    }
} catch (e) { }

async function getReportData(id) {
    let all = [...STATIC_REPORTS];
    if (redis) {
        const aiReports = await redis.get('coin_market_reports') || [];
        all = [...all, ...aiReports];
    }
    // 날짜 역순 정렬 (최신순)
    all.sort((a, b) => b.id.localeCompare(a.id));

    const currentIndex = all.findIndex(r => r.id === id);
    if (currentIndex === -1) return { report: null };

    return {
        report: all[currentIndex],
        prevReport: currentIndex < all.length - 1 ? all[currentIndex + 1] : null, // 이전글 (과거)
        nextReport: currentIndex > 0 ? all[currentIndex - 1] : null // 다음글 (최신)
    };
}

async function getReport(id) {
    const data = await getReportData(id);
    return data.report;
}

export async function generateMetadata({ params }) {
    const { id } = await params;
    const report = await getReport(id);
    if (!report) return { title: '리포트 없음' };
    return { title: `${report.title} | 클릭코인 코인 정보` };
}

export default async function ReportPage({ params }) {
    const { id } = await params;
    const { report, prevReport, nextReport } = await getReportData(id);

    if (!report) notFound();

    const mdToHtml = (text, isHeading = false) => {
        if (!text) return '';
        let html = text
            // 불필요한 [레이블] 제거 (링크 제외)
            .replace(/\[[^\]]+\](?!\()/g, '')
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff;">$1</strong>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: var(--accent-blue); text-decoration: underline;">$1</a>');

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

    return (
        <main className="container" style={{ paddingTop: '2rem', paddingBottom: '6rem' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-blue)', textDecoration: 'none', marginBottom: '2.5rem', fontWeight: 600 }}>
                <ArrowLeft size={18} /> 목록으로 돌아가기
            </Link>

            <article className="animate-enter">
                <header style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '1.2rem', opacity: 0.6, fontSize: '0.9rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '6px' }}>
                            <Clock size={14} /> {report.date}
                        </span>
                        <div style={{ background: 'var(--accent-yellow)', width: '4px', height: '4px', borderRadius: '50%' }}></div>
                        <span style={{ color: 'var(--accent-yellow)', fontWeight: 800, letterSpacing: '0.05em' }}>PREMIUM REPORT</span>
                    </div>

                    <h1
                        style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)', fontWeight: 900, lineHeight: 1.25, marginBottom: '2rem', letterSpacing: '-0.03em' }}
                        dangerouslySetInnerHTML={{ __html: mdToHtml(report.title).replace(/•\s?|<br\/>/g, '') }}
                    />

                    {/* 핵심 요약 (Summary) Callout */}
                    {report.summary && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(255, 214, 10, 0.15), rgba(255, 159, 10, 0.1))',
                            border: '1px solid rgba(255, 214, 10, 0.3)',
                            borderRadius: '20px',
                            padding: '1.8rem',
                            marginBottom: '3rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-yellow)' }}></div>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 800, color: 'var(--accent-yellow)', marginBottom: '0.8rem', textTransform: 'uppercase' }}>
                                <TrendingUp size={18} /> Executive Summary
                            </h3>
                            <p
                                style={{ fontSize: '1.1rem', lineHeight: 1.8, fontWeight: 600, color: 'rgba(255,255,255,0.95)', margin: 0 }}
                                dangerouslySetInnerHTML={{ __html: mdToHtml(report.summary) }}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {report.tags?.map(tag => (
                            <span key={tag} style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', fontSize: '0.8rem', opacity: 0.8, fontWeight: 500 }}>{tag}</span>
                        ))}
                    </div>
                </header>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {report.content?.map((block, idx) => {
                        if (block.type === 'paragraph') return (
                            <p
                                key={idx}
                                style={{ fontSize: '1.12rem', lineHeight: 2.0, opacity: 0.85, margin: 0, textAlign: 'justify', letterSpacing: '-0.01em' }}
                                dangerouslySetInnerHTML={{ __html: mdToHtml(block.text) }}
                            />
                        );
                        if (block.type === 'heading') return (
                            <div key={idx} style={{ marginTop: '2.5rem', marginBottom: '0.5rem' }}>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '8px', height: '24px', background: 'var(--accent-yellow)', borderRadius: '2px' }}></div>
                                    <span dangerouslySetInnerHTML={{ __html: mdToHtml(block.text).replace(/•\s?|<br\/>/g, '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim() }} />
                                </h2>
                            </div>
                        );
                        if (block.type === 'quote') return (
                            <div key={idx} style={{
                                padding: '2.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '24px',
                                border: '1px solid rgba(255, 255, 255, 0.05)', margin: '1.5rem 0',
                                textAlign: 'center', position: 'relative'
                            }}>
                                <span style={{ position: 'absolute', top: '1rem', left: '2rem', fontSize: '4rem', opacity: 0.1, fontFamily: 'serif' }}>"</span>
                                <p
                                    style={{ fontSize: '1.3rem', fontWeight: 700, fontStyle: 'italic', margin: 0, color: 'var(--accent-yellow)', lineHeight: 1.7 }}
                                    dangerouslySetInnerHTML={{ __html: mdToHtml(block.text) }}
                                />
                                <span style={{ position: 'absolute', bottom: '0rem', right: '2rem', fontSize: '4rem', opacity: 0.1, fontFamily: 'serif' }}>"</span>
                            </div>
                        );
                        return null;
                    })}
                </div>

                {/* 리포트 이동 네비게이션 */}
                <div style={{
                    marginTop: '5rem',
                    padding: '2.5rem 0',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {prevReport ? (
                        <Link href={`/report/${prevReport.id}`} style={{
                            padding: '1.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            textDecoration: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'all 0.3s ease'
                        }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--accent-yellow)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <ChevronLeft size={16} /> 이전 리포트
                            </span>
                            <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 600, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {prevReport.title.replace(/[\[\]]/g, '')}
                            </span>
                        </Link>
                    ) : (
                        <div style={{ padding: '1.5rem', opacity: 0.2 }}>
                            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>첫 번째 리포트입니다</span>
                        </div>
                    )}

                    {nextReport ? (
                        <Link href={`/report/${nextReport.id}`} style={{
                            padding: '1.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '20px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            textDecoration: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '8px',
                            transition: 'all 0.3s ease',
                            textAlign: 'right'
                        }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--accent-yellow)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                다음 리포트 <ChevronRight size={16} />
                            </span>
                            <span style={{ fontSize: '1rem', color: '#fff', fontWeight: 600, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {nextReport.title.replace(/[\[\]]/g, '')}
                            </span>
                        </Link>
                    ) : (
                        <div style={{ padding: '1.5rem', opacity: 0.2, textAlign: 'right' }}>
                            <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>최신 리포트입니다</span>
                        </div>
                    )}
                </div>
            </article>

            <footer style={{ marginTop: '6rem', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <p style={{ opacity: 0.6, fontSize: '0.9rem', lineHeight: 1.8 }}>
                    본 리포트는 클릭코인의 독자적인 기술 분석 시스템과 전문가의 분석을 바탕으로 작성되었습니다.<br />
                    모든 투자의 최종 책임은 본인에게 있으며, 본 정보는 참고용으로만 활용하시기 바랍니다.
                </p>
                <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', opacity: 0.4 }}>© 2026 ClickCoin Premium Analysis. All rights reserved.</p>
            </footer>
        </main >
    );
}
