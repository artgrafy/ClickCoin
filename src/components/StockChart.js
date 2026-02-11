'use client';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';

export const StockChart = ({ data, stockName, colors: {
    backgroundColor = '#131722',
} = {} }) => {
    const chartContainerRef = useRef();
    const legendRef = useRef();
    const chartRef = useRef(null);
    const canvasRef = useRef(null);
    const scaleMargins = useRef({ top: 0.05, bottom: 0.3 }); // 주 차트 공간 확대
    const smcData = useRef({ fvgs: [], obs: [], msbLines: [], srLevels: [] });

    useEffect(() => {
        if (!chartContainerRef.current || !data || !data.candles) return;

        // --- 1. 데이터 정화 ---
        const candleMap = new Map();
        data.candles.forEach(c => {
            const time = typeof c.time === 'string' ? c.time : new Date(c.time * 1000).toISOString().split('T')[0];
            const isFlat = Number(c.open) === Number(c.close) && Number(c.high) === Number(c.low);
            if (!isFlat && Number(c.close) > 0) {
                candleMap.set(time, {
                    time,
                    open: Number(c.open),
                    high: Number(c.high),
                    low: Number(c.low),
                    close: Number(c.close),
                    volume: Number(c.volume || 0)
                });
            }
        });

        const cleanCandles = Array.from(candleMap.values()).sort((a, b) => (a.time > b.time ? 1 : -1));
        if (cleanCandles.length === 0) return;

        // --- 2. 차트 초기화 ---
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor: '#d1d4dc',
                fontSize: 11,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            },
            width: chartContainerRef.current.clientWidth,
            height: window.innerWidth < 768 ? 450 : 600,
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            crosshair: {
                mode: 1,
                vertLine: { labelBackgroundColor: '#2b2b43', style: LineStyle.Dashed },
                horzLine: { labelBackgroundColor: '#2b2b43', style: LineStyle.Dashed },
            },
            handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: false },
            handleScroll: { mouseWheel: true, pressedMouseMove: true },
            timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)', rightOffset: 50 },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                autoScale: true,
                visible: true,
                scaleMargins: scaleMargins.current
            },
            leftPriceScale: { visible: false },
            localization: {
                locale: 'ko-KR',
                priceFormatter: (p) => p < 10 ? p.toFixed(4) : p.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
                timeFormatter: (t) => {
                    const d = new Date(t);
                    return `${String(d.getFullYear()).slice(-2)}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
                }
            },
        });

        // --- 3. 시리즈 설정 ---
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#089981', downColor: '#f23645', borderVisible: false,
            wickUpColor: '#089981', wickDownColor: '#f23645',
            priceLineVisible: true, lastPriceLineVisible: true,
            priceLineStyle: LineStyle.Dashed,
        });
        candlestickSeries.setData(cleanCandles);

        // 거래량
        const volumeSeries = chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
            priceLineVisible: false,
            lastPriceLineVisible: false,
        });
        chart.priceScale('volume').applyOptions({
            scaleMargins: { top: 0.74, bottom: 0.15 },
            visible: true,
            borderColor: 'rgba(255, 255, 255, 0.1)',
        });
        volumeSeries.setData(cleanCandles.map(c => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(8, 153, 129, 0.3)' : 'rgba(242, 54, 69, 0.3)'
        })));

        // RSI
        const calculateRSI = (data, count = 14) => {
            let res = [];
            let avgG = 0, avgL = 0;
            for (let i = 1; i < data.length; i++) {
                let diff = data[i].close - data[i - 1].close;
                let g = Math.max(0, diff), l = Math.max(0, -diff);
                if (i <= count) { avgG += g; avgL += l; if (i === count) { avgG /= count; avgL /= count; } }
                else { avgG = (avgG * (count - 1) + g) / count; avgL = (avgL * (count - 1) + l) / count; }
                if (i >= count) res.push({ time: data[i].time, value: 100 - (100 / (1 + (avgG / (avgL || 1)))) });
            }
            return res;
        };

        const rsiSeries = chart.addLineSeries({ color: '#9c27b0', lineWidth: 1, priceScaleId: 'rsi', priceLineVisible: false, lastPriceLineVisible: false });
        const rsiData = calculateRSI(cleanCandles);
        rsiSeries.setData(rsiData);
        chart.priceScale('rsi').applyOptions({
            scaleMargins: { top: 0.87, bottom: 0.02 },
            visible: true,
            borderColor: 'rgba(255, 255, 255, 0.1)',
        });
        // RSI 가이드 라인 (70, 30) - 선명하게 강화
        rsiSeries.createPriceLine({ price: 70, color: 'rgba(242, 54, 69, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '70' });
        rsiSeries.createPriceLine({ price: 30, color: 'rgba(8, 153, 129, 0.5)', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: '30' });

        const zigzagSeries = chart.addLineSeries({ color: 'rgba(255, 215, 0, 0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastPriceLineVisible: false });

        const calculateSMC = (candles) => {
            const points = [], fvgs = [], obs = [], msbLines = [];
            let lastType = null, lastH = null, lastL = null;
            const depth = candles.length > 50 ? 10 : 5;
            for (let i = 2; i < candles.length - depth; i++) {
                const cP2 = candles[i - 2], cP1 = candles[i - 1], cC = candles[i];
                if (cP2.high < cC.low) {
                    let m = false; for (let k = i + 1; k < candles.length; k++) if (candles[k].low < cC.low) { m = true; break; }
                    if (!m) fvgs.push({ type: 'bullish', top: cC.low, bottom: cP2.high, time: cP1.time });
                } else if (cP2.low > cC.high) {
                    let m = false; for (let k = i + 1; k < candles.length; k++) if (candles[k].high > cC.high) { m = true; break; }
                    if (!m) fvgs.push({ type: 'bearish', top: cP2.low, bottom: cC.high, time: cP1.time });
                }
                if (i >= depth) {
                    let isH = true, isL = true;
                    for (let j = 1; j <= depth; j++) {
                        if (candles[i - j].high > candles[i].high || (i + j < candles.length && candles[i + j].high > candles[i].high)) isH = false;
                        if (candles[i - j].low < candles[i].low || (i + j < candles.length && candles[i + j].low < candles[i].low)) isL = false;
                    }
                    if (isH) {
                        const val = candles[i].high; const lbl = lastH === null ? 'H' : (val > lastH ? 'HH' : 'LH');
                        if (lastType === 'H') { if (val > points[points.length - 1].value) points[points.length - 1] = { time: candles[i].time, value: val, type: 'H', label: lbl, index: i }; }
                        else { points.push({ time: candles[i].time, value: val, type: 'H', label: lbl, index: i }); lastType = 'H'; }
                        lastH = val;
                    } else if (isL) {
                        const val = candles[i].low; const lbl = lastL === null ? 'L' : (val < lastL ? 'LL' : 'HL');
                        if (lastType === 'L') { if (val < points[points.length - 1].value) points[points.length - 1] = { time: candles[i].time, value: val, type: 'L', label: lbl, index: i }; }
                        else { points.push({ time: candles[i].time, value: val, type: 'L', label: lbl, index: i }); lastType = 'L'; }
                        lastL = val;
                    }
                }
            }
            const markers = []; let activeLH = null, activeHL = null, lhIdx = -1, hlIdx = -1, lhTime = null, hlTime = null;
            points.forEach((p, idx) => {
                markers.push({ time: p.time, position: p.type === 'H' ? 'aboveBar' : 'belowBar', color: '#FFD700', shape: 'none', text: p.label, size: 0 });
                if (p.label === 'LH') { activeLH = p.value; lhIdx = p.index; lhTime = p.time; }
                if (p.label === 'HL') { activeHL = p.value; hlIdx = p.index; hlTime = p.time; }
                const end = idx < points.length - 1 ? points[idx + 1].index : candles.length;
                for (let k = p.index + 1; k < end; k++) {
                    const c = candles[k];
                    if (activeLH && c.close > activeLH) {
                        markers.push({ time: c.time, position: 'belowBar', color: '#3b82f6', shape: 'arrowUp', text: 'MSB', size: 1.5 });
                        msbLines.push({ start: lhTime, end: c.time, level: activeLH, type: 'bullish' });
                        let rx = k, mv = c.low; for (let n = k; n >= lhIdx; n--) if (candles[n].low < mv) { mv = candles[n].low; rx = n; }
                        for (let n = rx; n >= Math.max(0, rx - 5); n--) if (candles[n].close < candles[n].open) { obs.push({ type: 'bullish', top: candles[n].open, bottom: candles[n].close, time: candles[n].time }); break; }
                        activeLH = null;
                    }
                    if (activeHL && c.close < activeHL) {
                        markers.push({ time: c.time, position: 'aboveBar', color: '#f59e0b', shape: 'arrowDown', text: 'MSB', size: 1.5 });
                        msbLines.push({ start: hlTime, end: c.time, level: activeHL, type: 'bearish' });
                        let rx = k, xv = c.high; for (let n = k; n >= hlIdx; n--) if (candles[n].high > xv) { xv = candles[n].high; rx = n; }
                        for (let n = rx; n >= Math.max(0, rx - 5); n--) if (candles[n].close > candles[n].open) { obs.push({ type: 'bearish', top: candles[n].close, bottom: candles[n].open, time: candles[n].time }); break; }
                        activeHL = null;
                    }
                }
            });

            // S/R Levels (Swing Trader Optimized: 150봉 분석, 60봉 가중치 3배)
            const lastIdx = candles.length - 1;
            const currentPrice = candles[lastIdx].close;
            const lookback = 150, recentLimit = 60;

            const candidates = [];
            // 피벗 포인트 가중치
            points.forEach(p => {
                if (p.index > lastIdx - lookback) {
                    candidates.push({ val: p.value, weight: (p.index > lastIdx - recentLimit ? 3 : 1) });
                }
            });
            // OB 가중치
            obs.forEach(o => {
                const oIdx = candles.findIndex(c => c.time === o.time);
                if (oIdx > lastIdx - lookback) {
                    candidates.push({ val: (o.top + o.bottom) / 2, weight: (oIdx > lastIdx - recentLimit ? 3 : 1) });
                }
            });

            const srLevels = [];
            if (candidates.length > 0) {
                const threshold = currentPrice * 0.005;
                const clusters = [];
                candidates.forEach(cnd => {
                    let found = false;
                    for (let c of clusters) { if (Math.abs(c.price - cnd.val) < threshold) { c.score += cnd.weight; c.sum += cnd.val; c.count++; c.price = c.sum / c.count; found = true; break; } }
                    if (!found) clusters.push({ price: cnd.val, score: cnd.weight, sum: cnd.val, count: 1 });
                });
                // 현재가 +-20% 이내 강력한 라인 3개
                srLevels.push(...clusters
                    .filter(c => Math.abs(c.price - currentPrice) / currentPrice < 0.2)
                    .sort((a, b) => b.score - a.score).slice(0, 3).map(c => c.price)
                );
            }
            return { points, markers, fvgs, obs, msbLines, srLevels };
        };

        const smc = calculateSMC(cleanCandles);
        smcData.current = { fvgs: smc.fvgs, obs: smc.obs, msbLines: smc.msbLines, srLevels: smc.srLevels };
        zigzagSeries.setData(smc.points.map(p => ({ time: p.time, value: p.value })));
        candlestickSeries.setMarkers(smc.markers.sort((a, b) => (a.time > b.time ? 1 : -1)));

        // S/R Levels
        smc.srLevels.forEach(lvl => {
            candlestickSeries.createPriceLine({
                price: lvl,
                color: 'rgba(255, 255, 255, 0.25)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'S/R LEVEL',
            });
        });

        const drawSMC = () => {
            const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return;
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            const ts = chart.timeScale(), rightEdge = ctx.canvas.width, barSpacing = ts.options().barSpacing, boxWidth = 30 * barSpacing;

            // 영역 구분선 (Separator Lines)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            const ySep1 = ctx.canvas.height * 0.72;
            ctx.moveTo(0, ySep1); ctx.lineTo(rightEdge, ySep1);
            const ySep2 = ctx.canvas.height * 0.85;
            ctx.moveTo(0, ySep2); ctx.lineTo(rightEdge, ySep2);
            ctx.stroke();

            ctx.setLineDash([5, 5]);
            smcData.current.msbLines.forEach(l => {
                const x1 = ts.timeToCoordinate(l.start), x2 = ts.timeToCoordinate(l.end), y = candlestickSeries.priceToCoordinate(l.level);
                if (x1 !== null && x2 !== null && y !== null) { ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.strokeStyle = l.type === 'bullish' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(245, 158, 11, 0.6)'; ctx.stroke(); }
            });
            ctx.setLineDash([]);
            const renderBox = (items, colorBase, label) => {
                items.slice(-15).forEach(f => {
                    const x = ts.timeToCoordinate(f.time), yT = candlestickSeries.priceToCoordinate(f.top), yB = candlestickSeries.priceToCoordinate(f.bottom);
                    if (x !== null && yT !== null && yB !== null) {
                        const dw = Math.min(boxWidth, rightEdge - x);
                        if (dw > 0) {
                            ctx.fillStyle = f.type === 'bullish' ? `rgba(8, 153, 129, ${colorBase})` : `rgba(242, 54, 69, ${colorBase})`;
                            ctx.fillRect(x, Math.min(yT, yB), dw, Math.abs(yT - yB));
                            if (colorBase > 0.15) { ctx.strokeStyle = f.type === 'bullish' ? 'rgba(8, 153, 129, 0.4)' : 'rgba(242, 54, 69, 0.4)'; ctx.strokeRect(x, Math.min(yT, yB), dw, Math.abs(yT - yB)); }
                            ctx.fillStyle = f.type === 'bullish' ? 'rgba(8, 153, 129, 0.8)' : 'rgba(242, 54, 69, 0.8)';
                            ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
                            ctx.fillText(label || (f.type === 'bullish' ? 'Bu-OB' : 'Be-OB'), x + dw - 5, Math.min(yT, yB) + 12);
                        }
                    }
                });
            };
            renderBox(smcData.current.fvgs, 0.12, 'FVG'); renderBox(smcData.current.obs, 0.22);
        };

        chart.timeScale().subscribeVisibleTimeRangeChange(drawSMC);
        chart.subscribeCrosshairMove(drawSMC);

        const container = chartContainerRef.current, legend = legendRef.current;
        const setLegend = (c, v, r) => {
            if (!c || !legend) return;
            const clr = c.close >= c.open ? '#089981' : '#f23645';
            const pf = (v) => v < 10 ? v.toFixed(4) : v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

            const vStr = v ? (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(1) + 'K' : Math.floor(v)) : '-';
            const rVal = r !== undefined ? Number(r).toFixed(1) : '-';
            const rColor = r > 70 ? '#f23645' : r < 30 ? '#089981' : '#9c27b0';

            legend.innerHTML = `<div style="display:flex; flex-direction:column; gap:4px; font-family:'Inter', sans-serif;">
                <div style="font-size:1.1rem; color:#fff;">${stockName} <span style="font-size:0.8rem; color:#089981;">일봉</span></div>
                <div style="display:flex; gap:12px; font-size:0.75rem; flex-wrap: wrap; align-items: center;">
                    <span style="color:rgba(255,255,255,0.4)">O <span style="color:${clr}">${pf(c.open)}</span></span>
                    <span style="color:rgba(255,255,255,0.4)">H <span style="color:${clr}">${pf(c.high)}</span></span>
                    <span style="color:rgba(255,255,255,0.4)">L <span style="color:${clr}">${pf(c.low)}</span></span>
                    <span style="color:rgba(255,255,255,0.4)">C <span style="color:${clr}">${pf(c.close)}</span></span>
                    <span style="color:rgba(255,255,255,0.1)">|</span>
                    <span style="color:rgba(255,255,255,0.4)">VOL <span style="color:#26a69a">${vStr}</span></span>
                    <span style="color:rgba(255,255,255,0.4)">RSI(14) <span style="color:${rColor}">${rVal}</span></span>
                </div></div>`;
        };
        const lastC = cleanCandles[cleanCandles.length - 1];
        setLegend(lastC, lastC.volume, rsiData[rsiData.length - 1]?.value);

        chart.subscribeCrosshairMove((p) => {
            const c = p.time ? p.seriesData.get(candlestickSeries) : cleanCandles[cleanCandles.length - 1];
            const v = p.time ? p.seriesData.get(volumeSeries) : { value: cleanCandles[cleanCandles.length - 1].volume };
            const r = p.time ? p.seriesData.get(rsiSeries) : { value: rsiData[rsiData.length - 1]?.value };
            if (c) setLegend(c, v?.value, r?.value);
        });

        const handleWheel = (e) => {
            const rect = container.getBoundingClientRect();
            if (e.clientX - rect.left > rect.width * 0.92) {
                e.preventDefault();
                const factor = e.deltaY < 0 ? 0.9 : 1.1;
                scaleMargins.current.top = Math.min(0.48, Math.max(0.01, scaleMargins.current.top * factor));
                scaleMargins.current.bottom = Math.min(0.48, Math.max(0.01, scaleMargins.current.bottom * factor));
                chart.priceScale('right').applyOptions({ scaleMargins: scaleMargins.current });
                drawSMC();
            }
        };
        container.addEventListener('wheel', handleWheel, { passive: false });

        const handleResize = () => {
            const w = chartContainerRef.current.clientWidth, h = window.innerWidth < 768 ? 450 : 600;
            chart.resize(w, h); if (canvasRef.current) { canvasRef.current.width = w; canvasRef.current.height = h; }
            drawSMC();
        };
        window.addEventListener('resize', handleResize); handleResize();
        chart.timeScale().setVisibleLogicalRange({ from: cleanCandles.length - 80, to: cleanCandles.length + 20 });
        chartRef.current = chart;
        return () => { container.removeEventListener('wheel', handleWheel); window.removeEventListener('resize', handleResize); chart.remove(); };
    }, [data, backgroundColor, stockName]);

    return (
        <div style={{ position: 'relative', width: '100%', borderRadius: '20px', overflow: 'hidden', background: '#131722', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div ref={legendRef} style={{ position: 'absolute', left: '20px', top: '20px', zIndex: 100, pointerEvents: 'none' }} />
            <div ref={chartContainerRef} style={{ width: '100%' }} />
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }} />
        </div>
    );
};
