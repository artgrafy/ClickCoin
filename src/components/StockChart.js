'use client';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';

export const StockChart = ({ data, stockName, colors: {
    backgroundColor = '#131722',
} = {} }) => {
    const chartContainerRef = useRef();
    const legendRef = useRef();
    const chartRef = useRef(null);
    const scaleMargins = useRef({ top: 0.12, bottom: 0.12 });

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
                    close: Number(c.close)
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
            height: window.innerWidth < 768 ? 400 : 550,
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
            timeScale: { borderColor: 'rgba(255, 255, 255, 0.1)', rightOffset: 30 },
            rightPriceScale: { borderColor: 'rgba(255, 255, 255, 0.1)', autoScale: true, scaleMargins: scaleMargins.current },
            localization: {
                locale: 'ko-KR',
                priceFormatter: (p) => p < 10 ? p.toFixed(4) : Math.floor(p).toLocaleString(),
                timeFormatter: (t) => {
                    const d = new Date(t);
                    const y = String(d.getFullYear()).slice(-2);
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const r = String(d.getDate()).padStart(2, '0');
                    return `${y}/${m}/${r}`;
                }
            },
        });

        // --- 3. 줌 커스텀 로직 ---
        const container = chartContainerRef.current;
        const handleWheel = (e) => {
            const rect = container.getBoundingClientRect();
            if (e.clientX - rect.left > rect.width * 0.92) {
                e.preventDefault();
                const factor = e.deltaY < 0 ? 0.9 : 1.1;
                scaleMargins.current.top = Math.min(0.48, Math.max(0.01, scaleMargins.current.top * factor));
                scaleMargins.current.bottom = Math.min(0.48, Math.max(0.01, scaleMargins.current.bottom * factor));
                chart.priceScale('right').applyOptions({ scaleMargins: scaleMargins.current });
            }
        };
        container.addEventListener('wheel', handleWheel, { passive: false });

        // --- 4. 시리즈 및 SMC 로직 (MSB 포함) ---
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#089981', downColor: '#f23645', borderVisible: false,
            wickUpColor: '#089981', wickDownColor: '#f23645',
            priceLineVisible: true, lastPriceLineVisible: true,
            priceLineStyle: LineStyle.Dashed,
        });
        candlestickSeries.setData(cleanCandles);

        const zigzagSeries = chart.addLineSeries({
            color: 'rgba(255, 215, 0, 0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed,
            priceLineVisible: false, lastPriceLineVisible: false,
        });

        const calculateSMC = (candles) => {
            const points = [];
            let lastType = null;
            let lastH = null, lastL = null;
            const depth = 10;

            for (let i = depth; i < candles.length - depth; i++) {
                let isH = true, isL = true;
                for (let j = 1; j <= depth; j++) {
                    if (candles[i - j].high > candles[i].high || candles[i + j].high > candles[i].high) isH = false;
                    if (candles[i - j].low < candles[i].low || candles[i + j].low < candles[i].low) isL = false;
                }
                if (isH) {
                    const price = candles[i].high;
                    const lbl = lastH === null ? 'H' : (price > lastH ? 'HH' : 'LH');
                    if (lastType === 'H') {
                        if (price > points[points.length - 1].value) points[points.length - 1] = { time: candles[i].time, value: price, type: 'H', label: lbl, index: i };
                    } else { points.push({ time: candles[i].time, value: price, type: 'H', label: lbl, index: i }); lastType = 'H'; }
                    lastH = price;
                } else if (isL) {
                    const price = candles[i].low;
                    const lbl = lastL === null ? 'L' : (price < lastL ? 'LL' : 'HL');
                    if (lastType === 'L') {
                        if (price < points[points.length - 1].value) points[points.length - 1] = { time: candles[i].time, value: price, type: 'L', label: lbl, index: i };
                    } else { points.push({ time: candles[i].time, value: price, type: 'L', label: lbl, index: i }); lastType = 'L'; }
                    lastL = price;
                }
            }

            const smcMarkers = [];
            let activeLH = null, activeHL = null;
            points.forEach((p, pIdx) => {
                smcMarkers.push({ time: p.time, position: p.type === 'H' ? 'aboveBar' : 'belowBar', color: '#FFD700', shape: 'none', text: p.label, size: 0 });
                if (p.label === 'LH') activeLH = p.value;
                if (p.label === 'HL') activeHL = p.value;

                const startIdx = p.index + 1;
                const endIdx = pIdx < points.length - 1 ? points[pIdx + 1].index : candles.length;
                for (let k = startIdx; k < endIdx; k++) {
                    const c = candles[k];
                    if (activeLH && c.close > activeLH) {
                        smcMarkers.push({ time: c.time, position: 'belowBar', color: '#089981', shape: 'arrowUp', text: 'MSB', size: 1 });
                        activeLH = null;
                    }
                    if (activeHL && c.close < activeHL) {
                        smcMarkers.push({ time: c.time, position: 'aboveBar', color: '#f23645', shape: 'arrowDown', text: 'MSB', size: 1 });
                        activeHL = null;
                    }
                }
            });
            return { points, markers: smcMarkers };
        };

        const { points, markers } = calculateSMC(cleanCandles);
        zigzagSeries.setData(points.map(p => ({ time: p.time, value: p.value })));
        candlestickSeries.setMarkers(markers.sort((a, b) => (a.time > b.time ? 1 : -1)));

        // --- 5. 레전드 및 마무리 ---
        const legend = legendRef.current;
        const setLegend = (candle) => {
            if (!candle || !legend) return;
            const color = candle.close >= candle.open ? '#089981' : '#f23645';
            const pf = (v) => v < 10 ? v.toFixed(4) : Math.floor(v).toLocaleString();
            legend.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px; font-family: 'Inter', sans-serif;">
                    <div style="font-size: 1.1rem; font-weight: 400; color: #fff; margin-bottom: 2px;">
                        ${stockName || ''} <span style="font-size: 0.8rem; color: #089981; opacity: 0.8;">일봉</span>
                    </div>
                    <div style="display: flex; gap: 15px; font-weight: 500; font-size: 0.75rem;">
                        <span style="color: rgba(255,255,255,0.4)">OPEN <span style="color: ${color}">${pf(candle.open)}</span></span>
                        <span style="color: rgba(255,255,255,0.4)">HIGH <span style="color: ${color}">${pf(candle.high)}</span></span>
                        <span style="color: rgba(255,255,255,0.4)">LOW <span style="color: ${color}">${pf(candle.low)}</span></span>
                        <span style="color: rgba(255,255,255,0.4)">CLOSE <span style="color: ${color}">${pf(candle.close)}</span></span>
                    </div>
                </div>
            `;
        };
        setLegend(cleanCandles[cleanCandles.length - 1]);
        chart.subscribeCrosshairMove((param) => {
            if (param.time && param.point) {
                const d = param.seriesData.get(candlestickSeries);
                if (d) setLegend(d);
            } else setLegend(cleanCandles[cleanCandles.length - 1]);
        });
        const handleResize = () => chart.resize(chartContainerRef.current.clientWidth, window.innerWidth < 768 ? 400 : 550);
        window.addEventListener('resize', handleResize);
        chart.timeScale().setVisibleLogicalRange({ from: cleanCandles.length - 80, to: cleanCandles.length + 20 });
        chartRef.current = chart;
        return () => {
            container.removeEventListener('wheel', handleWheel);
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, backgroundColor, stockName]);

    return (
        <div style={{ position: 'relative', width: '100%', borderRadius: '20px', overflow: 'hidden', background: '#131722', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div ref={legendRef} style={{ position: 'absolute', left: '20px', top: '20px', zIndex: 100, pointerEvents: 'none' }} />
            <div ref={chartContainerRef} style={{ width: '100%' }} />
        </div>
    );
};
