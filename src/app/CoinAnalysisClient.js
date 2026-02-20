'use client';
import { useState, useEffect, useMemo } from 'react';
import { STOCK_LIST } from '@/lib/stocks';
import { StockChart } from '@/components/StockChart';
import { Search, TrendingUp, RefreshCw, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NewsletterForm from '@/components/NewsletterForm';
import MiniNewsletterForm from '@/components/MiniNewsletterForm';

export default function CoinAnalysisClient({ symbol: initialSymbol }) {
    const router = useRouter();
    const [selectedStock, setSelectedStock] = useState(
        STOCK_LIST.find(s => s.symbol === initialSymbol || s.name === initialSymbol) || { name: '비트코인', symbol: 'BTC-USD' }
    );
    const [mcpData, setMcpData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState(null);
    const [reports, setReports] = useState([]);
    const [visibleCount, setVisibleCount] = useState(6);
    const [isScanning, setIsScanning] = useState(false);
    const [scanType, setScanType] = useState(null);
    const [scannedSymbols, setScannedSymbols] = useState(null);

    const API_BASE = '/clickcoin/api';

    useEffect(() => {
        if (initialSymbol) {
            const stock = STOCK_LIST.find(s => s.symbol === initialSymbol || s.name === initialSymbol);
            if (stock && stock.symbol !== selectedStock.symbol) {
                setSelectedStock(stock);
            }
        }
    }, [initialSymbol]);

    useEffect(() => {
        if (!selectedStock) return;
        async function fetchMcpData() {
            setLoading(true);
            setError(null);
            setMcpData(null);
            try {
                const res = await fetch(`${API_BASE}/stock/${selectedStock.symbol}?t=${Date.now()}`);
                const data = await res.json().catch(() => null);

                if (!res.ok) {
                    throw new Error(data?.info || data?.error || `서버 응답 오류 (상태코드: ${res.status})`);
                }

                if (!data) throw new Error('데이터를 파싱할 수 없습니다.');
                setMcpData(data);
            } catch (err) {
                console.error('Fetch Error:', err);
                setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        }
        fetchMcpData();
    }, [selectedStock]);

    const sortedReports = useMemo(() => {
        return [...reports].sort((a, b) => new Date(b.id) - new Date(a.id));
    }, [reports]);

    const latestReport = sortedReports[0];

    const filteredStocks = useMemo(() => {
        let base = STOCK_LIST;
        if (scannedSymbols !== null) {
            base = STOCK_LIST.filter(s => scannedSymbols.includes(s.symbol));
        }
        if (!search) return base;
        return base.filter(s =>
            s.name.includes(search) || s.symbol.includes(search.toUpperCase())
        );
    }, [search, scannedSymbols]);

    useEffect(() => {
        async function fetchReports() {
            try {
                const res = await fetch(`${API_BASE}/reports`);
                if (res.ok) {
                    const data = await res.json();
                    setReports(data);
                }
            } catch (e) { }
        }
        fetchReports();
    }, [API_BASE]);

    const handleStockSelect = (stock) => {
        setSelectedStock(stock);
        router.push(`/${stock.name}`);
    };

    const handleScan = async (type) => {
        setIsScanning(true);
        setScanType(type);
        try {
            const res = await fetch(`${API_BASE}/scan?type=${type}`);
            const data = await res.json();
            setScannedSymbols(data.symbols);
        } catch (e) {
            alert('스캔 실패');
        } finally {
            setIsScanning(false);
        }
    };

    const clearFilter = () => {
        setScannedSymbols(null);
        setScanType(null);
    };

    const formatReportDate = (report) => {
        if (!report.createdAt) return report.date;
        const d = new Date(report.createdAt);
        const timeStr = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${report.date} ${timeStr}`;
    };

    return (
        <main className="container">
            <header style={{
                paddingTop: '1rem',
                paddingBottom: '0.4rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'between',
                flexWrap: 'wrap',
                gap: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ background: 'rgba(255,59,48,0.15)', padding: '10px', borderRadius: '12px' }}>
                        <TrendingUp size={28} color="#FF3B30" />
                    </div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>ClickCoin <span style={{ fontSize: '0.4em', background: 'rgba(255,59,48,0.12)', color: '#FF3B30', padding: '4px 10px', borderRadius: '8px' }}>MCP HUB</span></h1>
                </div>

                <div className="header-subscribe">
                    <MiniNewsletterForm appType="coin" />
                </div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.6rem' }}>
                <section className="glass-panel">
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleScan('msb')} disabled={isScanning} className={`scan-btn ${scanType === 'msb' ? 'active alert-pulse' : ''}`} style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}>⚡️ 폭풍 전야</button>
                        <button onClick={() => handleScan('popular')} disabled={isScanning} className={`scan-btn ${scanType === 'popular' ? 'active' : ''}`}>인기 TOP 10</button>
                        <button onClick={() => handleScan('rising')} disabled={isScanning} className={`scan-btn ${scanType === 'rising' ? 'active' : ''}`}>상승 TOP 10</button>
                        <button onClick={() => handleScan('volume')} disabled={isScanning} className={`scan-btn ${scanType === 'volume' ? 'active' : ''}`}>거래량 TOP 10</button>
                        {scannedSymbols && <button onClick={clearFilter} className="scan-btn"><XCircle size={16} /> 초기화</button>}
                    </div>

                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={20} />
                        <input
                            type="text" className="search-input" style={{ paddingLeft: '48px' }}
                            placeholder="코인 검색..."
                            value={search} onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="stock-grid" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredStocks.map(stock => (
                            <div
                                key={stock.symbol} className={`stock-chip ${selectedStock?.symbol === stock.symbol ? 'active' : ''}`}
                                onClick={() => handleStockSelect(stock)}
                            >
                                {stock.name}
                            </div>
                        ))}
                    </div>
                </section>

                {selectedStock ? (
                    <section className="glass-panel animate-enter">
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>{selectedStock.name} <span style={{ fontSize: '0.9rem', opacity: 0.5 }}>{selectedStock.symbol}</span></h2>

                        {loading ? (
                            <div style={{ minHeight: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <RefreshCw className="loader" size={24} />
                            </div>
                        ) : error ? (
                            <div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#f23645', gap: '1rem' }}>
                                <XCircle size={48} opacity={0.5} />
                                <p>{error}</p>
                                <button onClick={() => setSelectedStock({ ...selectedStock })} className="scan-btn">다시 시도</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {mcpData && (
                                    <div style={{ padding: '1.2rem 1.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.95rem', lineHeight: '1.7' }}>
                                        <div style={{ color: 'var(--accent-green)', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <TrendingUp size={18} /> AI 전략 브리핑
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.85)' }}>
                                            {(() => {
                                                const { trend, strength, rsi, marketStructure, srLevels } = mcpData;
                                                const trendText = trend === 'bullish' ? '<span style="color:#089981;font-weight:700;">강세</span>' : trend === 'bearish' ? '<span style="color:#f23645;font-weight:700;">약세</span>' : '<span style="color:#d1d4dc;font-weight:700;">중립</span>';

                                                let msg = `현재 **${selectedStock.name}**은(는) 전체적으로 ${trendText} 흐름을 보이고 있으며, AI 진단 강도는 **${strength}%**로 예측됩니다. `;

                                                if (marketStructure.hasMSB) {
                                                    msg += `차트상에서 최근 **구조적 변화(MSB)**가 포착되었는데, 이는 기존 추세의 힘이 빠지고 새로운 방향성이 결정되는 중요한 변곡점에 와 있음을 의미합니다. `;
                                                } else {
                                                    msg += trend === 'bullish' ? `현재 상승 모멘텀이 안정적으로 유지되고 있어 긍정적인 흐름이 기대되는 구간입니다. ` : trend === 'bearish' ? `매도 압력이 우세한 상황이므로 리스크 관리에 집중하며 보수적으로 접근할 필요가 있습니다. ` : `방향성을 탐색하는 횡보 국면으로, 주요 가격대 돌파 전까지는 관망이 유리해 보입니다. `;
                                                }

                                                if (rsi > 70) {
                                                    msg += `보조지표인 RSI가 **${rsi.toFixed(1)}**로 **과매수** 구간에 진입하여 단기적 가격 조정이나 쉬어가는 흐름에 주의해야 합니다. `;
                                                } else if (rsi < 30) {
                                                    msg += `RSI가 **${rsi.toFixed(1)}**로 **과매도** 영역에 머물러 있어, 주요 지지선 근처에서 기술적 반등이 나올 가능성이 높은 시점입니다. `;
                                                } else {
                                                    msg += `RSI는 **${rsi.toFixed(1)}**로 중립적인 위치에 있어 급격한 변동보다는 현재의 추세를 이어갈 가능성이 높습니다. `;
                                                }

                                                if (srLevels?.length > 0) {
                                                    const nearestVal = srLevels[0];
                                                    let nearest;
                                                    if (nearestVal >= 1000) {
                                                        nearest = Math.round(nearestVal).toLocaleString();
                                                    } else if (nearestVal >= 1) {
                                                        nearest = nearestVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                    } else if (nearestVal >= 0.1) {
                                                        nearest = nearestVal.toFixed(4);
                                                    } else {
                                                        nearest = nearestVal.toFixed(6);
                                                    }
                                                    msg += `데이터 분석 결과, 현재 시장 참여자들이 가장 강력하게 의식하고 있는 주요 가격대는 **${nearest}**선입니다. 이 구간에서의 지지 여부나 돌파 강도를 확인하며 스윙 전략을 세우시는 것을 추천드립니다.`;
                                                }

                                                return <p dangerouslySetInnerHTML={{ __html: msg.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff;">$1</strong>') }} />;
                                            })()}
                                        </div>
                                    </div>
                                )}
                                <StockChart data={mcpData} stockName={selectedStock.name} />
                            </div>
                        )}
                    </section>
                ) : (
                    <div className="glass-panel" style={{ textAlign: 'center', opacity: 0.3, padding: '40px' }}>
                        <p>코인을 선택하면 본진 MCP 서버의 정밀 분석이 시작됩니다.</p>
                    </div>
                )}
            </div>

            <section id="report-view" style={{ marginTop: '3rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>코인 리포트</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    {latestReport && (
                        <article className="glass-panel" style={{ border: '1px solid rgba(48, 209, 88, 0.15)' }}>
                            <div style={{ opacity: 0.4, fontSize: '0.85rem', marginBottom: '10px' }}>{formatReportDate(latestReport)}</div>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.2rem' }}>{latestReport.title}</h3>
                            <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
                                {latestReport.content.find(c => c.type === 'paragraph')?.text?.substring(0, 180)}...
                            </p>
                            <Link href={`/report/${latestReport.id}`} className="btn-primary">자세히 보기 <ArrowRight size={18} /></Link>
                        </article>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.2rem' }}>
                        {sortedReports.slice(1, visibleCount + 1).map(report => (
                            <Link key={report.id} href={`/report/${report.id}`} className="blog-card">
                                <div style={{ opacity: 0.4, fontSize: '0.75rem', marginBottom: '8px' }}>{formatReportDate(report)}</div>
                                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '10px' }}>{report.title}</h4>
                                <p style={{ opacity: 0.6, fontSize: '0.85rem', WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {report.content.find(c => c.type === 'paragraph')?.text || report.summary}
                                </p>
                            </Link>
                        ))}
                    </div>

                    {sortedReports.length > visibleCount + 1 && (
                        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                            <button onClick={() => setVisibleCount(prev => prev + 6)} className="btn-more">과거 기록 더보기</button>
                        </div>
                    )}
                </div>
            </section>

            {/* Newsletter Subscription */}
            <section className="animate-enter" style={{ marginTop: '4rem' }}>
                <div className="glass-panel" style={{
                    background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.1), rgba(94, 92, 230, 0.1))',
                    textAlign: 'center',
                    padding: '3.5rem 1.5rem',
                    border: '1px solid rgba(10, 132, 255, 0.2)',
                    borderRadius: '24px'
                }}>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.6rem', letterSpacing: '-0.02em' }}>핵심을 보는 당신을 위한 클릭코인</h2>
                    <p style={{ opacity: 0.7, fontSize: '1rem', marginBottom: '2.5rem' }}>
                        클릭코인만의 정밀 AI 코인 시황 정보지를 받아보세요.
                    </p>

                    <NewsletterForm appType="coin" />

                    <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', opacity: 0.4 }}>
                        스팸 걱정 마세요. 언제든 구독 해지가 가능합니다.
                    </p>
                </div>
            </section>

            <footer style={{ marginTop: '5rem', padding: '4rem 0', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', opacity: 0.5, lineHeight: 1.8, marginBottom: '2.5rem' }}>
                    <p>
                        ClickCoin은 변동성이 큰 가상자산 시장을 AI 기술로 분석하여 정보를 제공합니다. <br />
                        당사는 가상자산의 매수나 매도를 권유하지 않으며, <br />
                        가상자산 투자는 원금 손실 위험이 매우 큼을 인지하시기 바랍니다.
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '1.5rem', fontWeight: 600, opacity: 0.6 }}>
                    <Link href="/policy" style={{ color: 'inherit', textDecoration: 'none' }}>개인정보처리방침</Link>
                    <span style={{ opacity: 0.2 }}>|</span>
                    <a href="mailto:jyoo21c@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>Contact Info</a>
                </div>

                <p style={{ opacity: 0.3, letterSpacing: '0.05em' }}>© 2026 ClickCoin (Beta). All rights reserved.</p>
            </footer>


            <style jsx>{`
        .scan-btn { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease; }
        .scan-btn.active { background: var(--accent-blue); border-color: var(--accent-blue); }
        .alert-pulse { animation: pulse-green 2s infinite; }
        @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(48, 209, 88, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(48, 209, 88, 0); }
            100% { box-shadow: 0 0 0 0 rgba(48, 209, 88, 0); }
        }
        .btn-primary { background: var(--accent-blue); color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 8px; }
        .btn-more { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 12px 30px; border-radius: 12px; cursor: pointer; }
      `}</style>
        </main>
    );
}
