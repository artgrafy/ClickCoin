'use client';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import { calculateZigZag } from '@/lib/indicators';
import React, { useEffect, useRef } from 'react';

export const StockChart = ({ data, colors: {
    backgroundColor = 'transparent',
    textColor = '#D9D9D9',
} = {} }) => {
    const chartContainerRef = useRef();

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: window.innerWidth < 768 ? 300 : 450,
            grid: {
                vertLines: { visible: false },
                horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                rightOffset: 12,
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            localization: {
                priceFormatter: (price) => price < 10 ? price.toFixed(4) : Math.round(price).toLocaleString(),
            },
        });

        const handleResize = (entries) => {
            if (!entries || entries.length === 0) return;
            const { width } = entries[0].contentRect;
            const height = window.innerWidth < 768 ? 300 : 450;
            chart.resize(width, height);
            chart.timeScale().fitContent();
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(chartContainerRef.current);

        // Main Candle Series
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#FF3B30',
            borderUpColor: '#FF3B30',
            wickUpColor: '#FF3B30',
            downColor: '#0A84FF',
            borderDownColor: '#0A84FF',
            wickDownColor: '#0A84FF',
        });
        candlestickSeries.setData(data);

        // Volume Series (Histogram)
        const volumeSeries = chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '', // Separate scale for volume
        });

        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.8, // Positioned at the bottom
                bottom: 0,
            },
        });

        const volumeData = data.map(d => ({
            time: d.time,
            value: d.volume,
            color: d.close >= d.open ? '#FF3B3033' : '#0A84FF33' // Dimmed colors for background feel
        }));
        volumeSeries.setData(volumeData);

        const { lineData, markers, keyLevels, bbData } = calculateZigZag(data);

        // Bollinger Bands
        if (bbData && bbData.length > 0) {
            const upperSeries = chart.addLineSeries({
                color: 'rgba(10, 132, 255, 0.15)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
            });
            const lowerSeries = chart.addLineSeries({
                color: 'rgba(48, 209, 88, 0.15)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                crosshairMarkerVisible: false,
                lastValueVisible: false,
                priceLineVisible: false,
            });

            upperSeries.setData(data.map((d, i) => ({ time: d.time, value: bbData[i]?.upper || null })));
            lowerSeries.setData(data.map((d, i) => ({ time: d.time, value: bbData[i]?.lower || null })));
        }

        // ZigZag Line
        const zigZagSeries = chart.addLineSeries({
            color: 'rgba(255, 215, 0, 0.5)',
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false,
        });
        zigZagSeries.setData(lineData);
        candlestickSeries.setMarkers(markers);

        if (keyLevels && data.length > 0) {
            const lastTime = data[data.length - 1].time;
            keyLevels.forEach(level => {
                const levelSeries = chart.addLineSeries({
                    color: level.color,
                    lineWidth: 1,
                    lineStyle: LineStyle.Dashed,
                    crosshairMarkerVisible: false,
                    lastValueVisible: false,
                    priceLineVisible: false,
                });
                levelSeries.setData([
                    { time: level.startTime, value: level.price },
                    { time: lastTime, value: level.price }
                ]);
            });
        }

        chart.timeScale().fitContent();

        return () => {
            resizeObserver.disconnect();
            chart.remove();
        };
    }, [data, backgroundColor, textColor]);

    return (
        <div
            ref={chartContainerRef}
            className="chart-container"
            style={{ width: '100%' }}
        />
    );
};
