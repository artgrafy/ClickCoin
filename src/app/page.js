'use client';
import { useState, useEffect, useMemo } from 'react';
import { STOCK_LIST } from '@/lib/stocks';
import { StockChart } from '@/components/StockChart';
import { Search, TrendingUp, BarChart2, RefreshCw, XCircle, ArrowRight } from 'lucide-react';
// import { MARKET_REPORTS } from '@/lib/reports';
import Link from 'next/link';
import { calculateZigZag } from '@/lib/indicators';

export default function Home() {
  const [selectedStock, setSelectedStock] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [analysisCache, setAnalysisCache] = useState({}); // 클라이언트 사이드 캐시

  const [isScanning, setIsScanning] = useState(false);
  const [scannedSymbols, setScannedSymbols] = useState(null);
  const [scanTimestamp, setScanTimestamp] = useState(null);
  const [reports, setReports] = useState([]); // 🗒️ 주식 일보 리포트 캐시
  const [visibleCount, setVisibleCount] = useState(6); // 👁️ 표시할 지난 리포트 개수

  // 🔗 API 경로 접두사 고정
  const API_BASE = '/clickcoin/api';

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

  // 🤖 기술분석 데이터 계산
  const techAnalysis = useMemo(() => {
    if (!chartData || chartData.length < 20) return null;
    const { analysis } = calculateZigZag(chartData);
    return analysis;
  }, [chartData]);

  useEffect(() => {
    if (!selectedStock) return;
    async function fetchData() {
      setLoading(true);
      setError(null);
      setAiAnalysis(null);
      try {
        const res = await fetch(`${API_BASE}/stock/${selectedStock.symbol}`);
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        setChartData(data);

        // 🤖 AI 분석 호출 (클라이언트 캐시 먼저 확인)
        if (analysisCache[selectedStock.symbol]) {
          setAiAnalysis({ ...analysisCache[selectedStock.symbol], isCached: true });
          return;
        }

        setIsAiLoading(true);
        const { analysis: techData } = calculateZigZag(data);
        const aiRes = await fetch(`${API_BASE}/ai/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: selectedStock.symbol,
            name: selectedStock.name,
            chartData: data.slice(-10),
            technicalData: techData
          })
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          setAiAnalysis(aiData);
          setAnalysisCache(prev => ({ ...prev, [selectedStock.symbol]: aiData }));
        }
      } catch (err) {
        setError('데이터 로딩 실패');
      } finally {
        setLoading(false);
        setIsAiLoading(false);
      }
    }
    fetchData();
  }, [selectedStock]);

  // 🗒️ 코인 정보 리포트 가져오기
  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch(`${API_BASE}/reports`);
        if (res.ok) {
          const data = await res.json();
          setReports(data);
        }
      } catch (e) {
        console.error("Failed to fetch reports");
      }
    }
    fetchReports();
  }, [API_BASE]);

  const [scanType, setScanType] = useState(null); // 'rebound', 'breakout', 'volume'

  const handleScan = async (type) => {
    setIsScanning(true);
    setScanType(type);
    try {
      const res = await fetch(`${API_BASE}/scan?type=${type}`);
      const data = await res.json();
      setScannedSymbols(data.symbols);
      setScanTimestamp(data.timestamp);
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

  // 🕒 분석 시간 포맷팅 (예: 26.02.03 15:30)
  const formatAnalysisTime = (timestamp) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    const yr = String(d.getFullYear()).slice(-2);
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${yr}.${mo}.${day} ${hh}:${mm}`;
  };

  // 🕒 리포트 날짜 및 시간 포맷팅
  const formatReportDate = (report) => {
    if (!report.createdAt) return report.date;
    const d = new Date(report.createdAt);
    const timeStr = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${report.date} ${timeStr}`;
  };

  return (
    <main className="container">
      {/* Header Section */}
      <header style={{ paddingTop: 'clamp(1rem, 3vw, 2rem)', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(255,59,48,0.15)', padding: '10px', borderRadius: '12px' }}>
                <TrendingUp size={28} color="#FF3B30" />
              </div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ClickCoin
                <span style={{
                  fontSize: '0.4em',
                  background: 'rgba(255, 59, 48, 0.12)',
                  color: '#FF3B30',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  border: '1px solid rgba(255, 59, 48, 0.2)',
                  textTransform: 'uppercase'
                }}>Beta</span>
              </h1>
            </div>
            <p style={{ opacity: 0.5, fontSize: '1rem', maxWidth: '400px', lineHeight: '1.5' }}>
              바로 오늘, 바로 당신을 위한 미니멀 코인 분석
            </p>
          </div>

        </div>
      </header>

      {/* Main Analysis Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
        <section className="glass-panel">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleScan('popular')}
              disabled={isScanning}
              style={{
                background: scanType === 'popular' ? '#FF9F0A' : 'rgba(255,159,10,0.1)',
                color: scanType === 'popular' ? 'white' : '#FF9F0A',
                border: `1px solid ${scanType === 'popular' ? '#FF9F0A' : 'rgba(255,159,10,0.2)'}`,
                padding: '10px 16px', borderRadius: '10px',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              {isScanning && scanType === 'popular' ? <RefreshCw className="loader" size={14} /> : '🔥 인기 Top 10'}
            </button>
            <button
              onClick={() => handleScan('rising')}
              disabled={isScanning}
              style={{
                background: scanType === 'rising' ? '#FF3B30' : 'rgba(255,59,48,0.1)',
                color: scanType === 'rising' ? 'white' : '#FF3B30',
                border: `1px solid ${scanType === 'rising' ? '#FF3B30' : 'rgba(255,59,48,0.2)'}`,
                padding: '10px 16px', borderRadius: '10px',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              {isScanning && scanType === 'rising' ? <RefreshCw className="loader" size={14} /> : '🚀 상승 Top 10'}
            </button>
            <button
              onClick={() => handleScan('volume')}
              disabled={isScanning}
              style={{
                background: scanType === 'volume' ? '#5E5CE6' : 'rgba(94,92,230,0.1)',
                color: scanType === 'volume' ? 'white' : '#5E5CE6',
                border: `1px solid ${scanType === 'volume' ? '#5E5CE6' : 'rgba(94,92,230,0.2)'}`,
                padding: '10px 16px', borderRadius: '10px',
                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              {isScanning && scanType === 'volume' ? <RefreshCw className="loader" size={14} /> : '📊 거래량 Top 10'}
            </button>

            {scannedSymbols && (
              <button
                onClick={clearFilter}
                style={{
                  background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', padding: '10px 12px',
                  borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <XCircle size={16} /> 초기화
              </button>
            )}
          </div>

          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={20} />
            <input
              type="text" className="search-input" style={{ paddingLeft: '48px' }}
              placeholder="종목명 또는 코드를 검색하세요..."
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="stock-grid" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredStocks.map(stock => (
              <div
                key={stock.symbol} className={`stock-chip ${selectedStock?.symbol === stock.symbol ? 'active' : ''}`}
                onClick={() => setSelectedStock(stock)}
              >
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{stock.name}</span>
                <span className="symbol">{stock.symbol}</span>
              </div>
            ))}
          </div>
        </section>

        {selectedStock ? (
          <section className="glass-panel animate-enter">
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 800, margin: 0 }}>{selectedStock.name}</h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{
                    color: 'var(--accent-green)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: 'rgba(48,209,88,0.1)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    letterSpacing: '0.02em'
                  }}>
                    {selectedStock.symbol} 일봉 {aiAnalysis?.analyzedAt ? formatAnalysisTime(aiAnalysis.analyzedAt) : ''}
                  </span>
                </div>
              </div>
            </div>
            {loading ? (
              <div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', opacity: 0.5 }}>
                <RefreshCw className="loader" size={24} />
                <p style={{ fontSize: '0.9rem' }}>데이터 분석 중...</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* AI 분석 코멘트 패널 */}
                {(isAiLoading || aiAnalysis) && (
                  <div className="animate-enter" style={{
                    padding: '1.5rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: !aiAnalysis ? 'var(--accent-yellow)' :
                          aiAnalysis.sentiment === 'bullish' ? 'var(--accent-red)' :
                            aiAnalysis.sentiment === 'bearish' ? 'var(--accent-blue)' : 'var(--accent-yellow)',
                        boxShadow: `0 0 10px ${!aiAnalysis ? 'rgba(255,214,10,0.5)' :
                          aiAnalysis.sentiment === 'bullish' ? 'rgba(255,59,48,0.5)' : 'rgba(10,132,255,0.5)'}`
                      }}></div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.5, letterSpacing: '0.05em' }}>
                        {isAiLoading ? '리포트 생성 중...' : '클릭코인 미니멀 분석 리포트'}
                      </span>
                      {aiAnalysis?.statusText && !isAiLoading && (
                        <span style={{ fontSize: '0.7rem', opacity: 0.4, border: '1px solid rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                          {aiAnalysis.statusText}
                        </span>
                      )}
                      {aiAnalysis?.isCached && !isAiLoading && (
                        <span title="캐시된 분석 데이터" style={{
                          fontSize: '0.75rem', padding: '2px',
                          color: 'var(--accent-yellow)', filter: 'drop-shadow(0 0 4px rgba(255,214,10,0.4))'
                        }}>⚡</span>
                      )}
                    </div>
                    {isAiLoading ? (
                      <div style={{ height: '60px', display: 'flex', alignItems: 'center', opacity: 0.3 }}>
                        <p style={{ fontSize: '0.9rem' }}>데이터를 바탕으로 리포트를 작성하고 있습니다...</p>
                      </div>
                    ) : (
                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff' }}>
                          {aiAnalysis.summary}
                        </h3>
                        <p style={{ fontSize: '0.95rem', lineHeight: 1.6, opacity: 0.7, margin: 0 }}>
                          {aiAnalysis.detail}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ width: '100%' }}><StockChart data={chartData} /></div>
              </div>
            )}
          </section>
        ) : (
          <div className="glass-panel" style={{ minHeight: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', opacity: 0.3, padding: '20px' }}>
            <BarChart2 size={24} />
            <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>분석할 종목을 선택해 주세요</p>
          </div>
        )}
      </div>

      {/* Blog/Report Section */}
      <section id="report-view" className="animate-enter">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--accent-green)', color: '#000', padding: '6px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 }}>LATEST</div>
          <h2 style={{ fontSize: 'clamp(1.2rem, 4vw, 1.5rem)', fontWeight: 700, margin: 0 }}>코인 정보</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {latestReport && (
            <article className="glass-panel" style={{ border: '1px solid rgba(48, 209, 88, 0.15)' }}>
              <div style={{ opacity: 0.4, fontSize: '0.85rem', marginBottom: '10px' }}>{formatReportDate(latestReport)}</div>
              <h3 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 800, marginBottom: '1.2rem', lineHeight: 1.3 }}>{latestReport.title}</h3>

              <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
                {latestReport.content.find(c => c.type === 'paragraph')?.text?.substring(0, 180)}...
              </p>

              <Link
                href={`/report/${latestReport.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  background: 'var(--accent-blue)', color: 'white', textDecoration: 'none',
                  padding: '12px 24px', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem'
                }}
              >
                자세히 보기 <ArrowRight size={18} />
              </Link>
            </article>
          )}

          <div style={{ marginTop: '2rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, opacity: 0.7 }}>이전 정보</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(280px, 30vw, 350px), 1fr))', gap: '1.2rem' }}>
            {sortedReports.slice(1, visibleCount + 1).map(report => (
              <Link key={report.id} href={`/report/${report.id}`} className="blog-card">
                <div style={{ opacity: 0.4, fontSize: '0.75rem', marginBottom: '8px' }}>{formatReportDate(report)}</div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '10px', lineHeight: 1.4 }}>{report.title}</h4>
                <p style={{ opacity: 0.6, fontSize: '0.85rem', lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {report.content.find(c => c.type === 'paragraph')?.text || report.summary}
                </p>
                <div style={{ marginTop: 'auto', paddingTop: '1.2rem', color: 'var(--accent-blue)', fontSize: '0.8rem', fontWeight: 600 }}>
                  자세히 보기 &rarr;
                </div>
              </Link>
            ))}
          </div>

          {sortedReports.length > visibleCount + 1 && (
            <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
              <button
                onClick={() => setVisibleCount(prev => prev + 6)}
                className="hover-scale"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '12px 30px',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                과거 기록 더보기 <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Subscription */}
      <section className="animate-enter" style={{ marginTop: 'var(--section-gap)' }}>
        <div className="glass-panel" style={{
          background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.1), rgba(94, 92, 230, 0.1))',
          textAlign: 'center',
          padding: '3rem 1.5rem',
          border: '1px solid rgba(10, 132, 255, 0.2)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>핵심을 보는 당신을 위한 클릭코인</h2>
          <p style={{ opacity: 0.6, fontSize: '0.95rem', marginBottom: '2rem' }}>
            클릭코인의 정보지를 받아보세요.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const email = e.target.email.value;
              const btn = e.target.querySelector('button');
              btn.disabled = true;
              try {
                const res = await fetch(`${API_BASE}/newsletter/subscribe`, {
                  method: 'POST',
                  body: JSON.stringify({ email }),
                  headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.ok) {
                  alert(data.message);
                  e.target.reset();
                } else {
                  alert(data.error);
                }
              } catch (err) {
                alert('연결 중 오류가 발생했습니다.');
              } finally {
                btn.disabled = false;
              }
            }}
            style={{
              display: 'flex',
              gap: '10px',
              maxWidth: '500px',
              margin: '0 auto',
              flexWrap: 'wrap'
            }}
          >
            <input
              name="email"
              type="email"
              placeholder="이메일 주소를 입력하세요"
              required
              style={{
                flex: '1 1 280px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '12px 20px',
                borderRadius: '12px',
                color: 'white',
                fontSize: '0.95rem',
                minWidth: '0' // flex-shrink 대응
              }}
            />
            <button
              type="submit"
              className="hover-scale"
              style={{
                flex: '1 1 120px',
                background: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              신청 하기
            </button>
          </form>
          <p style={{ marginTop: '1.2rem', fontSize: '0.75rem', opacity: 0.3 }}>
            스팸 걱정 마세요. 언제든 구독 해지가 가능합니다.
          </p>
        </div>
      </section>

      <footer style={{ marginTop: '3rem', padding: '3rem 0', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', opacity: 0.4, fontSize: '0.85rem' }}>
        <p style={{ marginBottom: '1.5rem', opacity: 0.8, fontSize: '0.75rem', lineHeight: 1.6 }}>
          ClickCoin은 기술 분석 기반 정보를 제공하며, 투자 권유 사이트가 아닙니다. <br />
          모든 투자의 최종 결정과 책임은 본인에게 있습니다.
        </p>
        <p>&copy; 2026 ClickCoin (Beta). All rights reserved.</p>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <Link href="/policy" style={{ color: 'inherit', textDecoration: 'none' }}>개인정보처리방침</Link>
          <span style={{ opacity: 0.3 }}>|</span>
          <a href="mailto:jyoo21c@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>Contact: jyoo21c@gmail.com</a>
        </div>
      </footer>
    </main>
  );
}
