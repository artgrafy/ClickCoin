'use client';
import { useState, useEffect, useMemo } from 'react';
import { STOCK_LIST } from '@/lib/stocks';
import { StockChart } from '@/components/StockChart';
import { Search, TrendingUp, BarChart2, RefreshCw, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [selectedStock, setSelectedStock] = useState({ name: '비트코인', symbol: 'BTC-USD' });
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
    if (!selectedStock) return;
    async function fetchMcpData() {
      setLoading(true);
      setError(null);
      setMcpData(null);
      try {
        const res = await fetch(`${API_BASE}/stock/${selectedStock.symbol}`);
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        setMcpData(data);
      } catch (err) {
        setError('데이터 로딩 실패');
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
      <header style={{ paddingTop: '1rem', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(255,59,48,0.15)', padding: '10px', borderRadius: '12px' }}>
            <TrendingUp size={28} color="#FF3B30" />
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>ClickCoin <span style={{ fontSize: '0.4em', background: 'rgba(255,59,48,0.12)', color: '#FF3B30', padding: '4px 10px', borderRadius: '8px' }}>MCP HUB</span></h1>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.6rem' }}>
        <section className="glass-panel">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button onClick={() => handleScan('popular')} disabled={isScanning} className={`scan-btn ${scanType === 'popular' ? 'active' : ''}`}>인기 Top 10</button>
            <button onClick={() => handleScan('rising')} disabled={isScanning} className={`scan-btn ${scanType === 'rising' ? 'active' : ''}`}>상승 Top 10</button>
            <button onClick={() => handleScan('volume')} disabled={isScanning} className={`scan-btn ${scanType === 'volume' ? 'active' : ''}`}>거래량 Top 10</button>
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
                onClick={() => setSelectedStock(stock)}
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
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {mcpData && (
                  <div style={{ padding: '1rem 1.4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.92rem', lineHeight: '1.6' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--accent-green)' }}>AI ANALYSIS:</span>
                      <span style={{ color: mcpData.trend === 'bullish' ? '#089981' : mcpData.trend === 'bearish' ? '#f23645' : '#d1d4dc' }}>
                        [{mcpData.trend === 'bullish' ? '강세' : mcpData.trend === 'bearish' ? '약세' : '보합'}]
                      </span>
                      <span style={{ opacity: 0.5 }}>(신뢰도 {mcpData.strength}%)</span>
                      <span style={{ opacity: 0.8 }}>
                        {(() => {
                          const hasMSB = mcpData.marketStructure.hasMSB;
                          const trend = mcpData.trend;
                          if (hasMSB) return `구조적 변화(MSB) 포착, 추세 변곡점 주의.`;
                          if (trend === 'bullish') return `상승 모멘텀 유지 중, 안정적 흐름 기대.`;
                          if (trend === 'bearish') return `하락 압력 우세, 보수적 접근 권고.`;
                          return `방향성 탐색 중, 주요 가격대 돌파 확인 필요.`;
                        })()}
                      </span>
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

      {/* Reports Section - Restored */}
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

      <footer style={{ marginTop: '3rem', paddingBottom: '3rem', textAlign: 'center', opacity: 0.4, fontSize: '0.8rem' }}>
        <p>© 2026 ClickCoin (Beta). All rights reserved.</p>
      </footer>

      <style jsx>{`
        .scan-btn { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: flex; alignItems: center; gap: 8px; }
        .scan-btn.active { background: var(--accent-blue); border-color: var(--accent-blue); }
        .btn-primary { background: var(--accent-blue); color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 8px; }
        .btn-more { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 12px 30px; border-radius: 12px; cursor: pointer; }
      `}</style>
    </main>
  );
}
