import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Tag, BookOpen, TrendingUp } from 'lucide-react';
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

async function getReport(id) {
    // 1. 먼저 로컬 파일(Human)에서 찾기
    const staticReport = STATIC_REPORTS.find(r => r.id === id);
    if (staticReport) return staticReport;

    // 2. 없으면 Redis(AI)에서 찾기
    if (redis) {
        const aiReports = await redis.get('coin_market_reports') || [];
        return aiReports.find(r => r.id === id);
    }
    return null;
}

export async function generateMetadata({ params }) {
    const { id } = await params;
    const report = await getReport(id);
    if (!report) return { title: '리포트 없음' };
    return { title: `${report.title} | 클릭코인 코인 정보` };
}

export default async function ReportPage({ params }) {
    const { id } = await params;
    const report = await getReport(id);

    if (!report) notFound();

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
                        <div style={{ background: 'var(--accent-green)', width: '4px', height: '4px', borderRadius: '50%' }}></div>
                        <span style={{ color: 'var(--accent-green)', fontWeight: 800, letterSpacing: '0.05em' }}>PREMIUM REPORT</span>
                    </div>

                    <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 2.8rem)', fontWeight: 900, lineHeight: 1.25, marginBottom: '2rem', letterSpacing: '-0.03em' }}>
                        {report.title}
                    </h1>

                    {/* 핵심 요약 (Summary) Callout */}
                    {report.summary && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(94, 92, 230, 0.15), rgba(10, 132, 255, 0.1))',
                            border: '1px solid rgba(94, 92, 230, 0.3)',
                            borderRadius: '20px',
                            padding: '1.8rem',
                            marginBottom: '3rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-blue)' }}></div>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 800, color: '#5E5CE6', marginBottom: '0.8rem', textTransform: 'uppercase' }}>
                                <TrendingUp size={18} /> Executive Summary
                            </h3>
                            <p style={{ fontSize: '1.1rem', lineHeight: 1.7, fontWeight: 600, color: 'rgba(255,255,255,0.95)', margin: 0 }}>
                                {report.summary}
                            </p>
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
                            <p key={idx} style={{ fontSize: '1.1rem', lineHeight: 1.9, opacity: 0.85, margin: 0, textAlign: 'justify', letterSpacing: '-0.01em' }}>{block.text}</p>
                        );
                        if (block.type === 'heading') return (
                            <div key={idx} style={{ marginTop: '2rem', marginBottom: '0.5rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '8px', height: '24px', background: 'var(--accent-green)', borderRadius: '2px' }}></div>
                                    {block.text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu, '').trim()}
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
                                <p style={{ fontSize: '1.25rem', fontWeight: 700, fontStyle: 'italic', margin: 0, color: 'var(--accent-yellow)', lineHeight: 1.6 }}>{block.text}</p>
                                <span style={{ position: 'absolute', bottom: '0rem', right: '2rem', fontSize: '4rem', opacity: 0.1, fontFamily: 'serif' }}>"</span>
                            </div>
                        );
                        return null;
                    })}
                </div>
            </article>

            <footer style={{ marginTop: '6rem', padding: '3rem', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <p style={{ opacity: 0.5, fontSize: '0.85rem', lineHeight: 1.6 }}>
                    본 리포트는 클릭코인의 독자적인 기술 분석 시스템과 전문가의 분석을 바탕으로 작성되었습니다.<br />
                    모든 투자의 최종 책임은 본인에게 있으며, 본 정보는 참고용으로만 활용하시기 바랍니다.
                </p>
            </footer>
        </main>
    );
}
