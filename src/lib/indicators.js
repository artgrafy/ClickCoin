
// 📈 RSI (Relative Strength Index) 계산
export function calculateRSI(data, period = 14) {
    if (data.length <= period) return Array(data.length).fill(null);

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const diff = data[i].close - data[i - 1].close;
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    const rsi = Array(period).fill(null);
    rsi.push(100 - (100 / (1 + avgGain / avgLoss)));

    for (let i = period + 1; i < data.length; i++) {
        const diff = data[i].close - data[i - 1].close;
        const gain = diff >= 0 ? diff : 0;
        const loss = diff < 0 ? -diff : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
    }

    return rsi;
}

// 📊 볼린저 밴드 (Bollinger Bands) 계산
export function calculateBB(data, period = 20, multiplier = 2) {
    if (data.length < period) return Array(data.length).fill({ middle: null, upper: null, lower: null });

    return data.map((_, i) => {
        if (i < period - 1) return { middle: null, upper: null, lower: null };

        const slice = data.slice(i - period + 1, i + 1).map(d => d.close);
        const middle = slice.reduce((a, b) => a + b) / period;
        const variance = slice.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period;
        const stdDev = Math.sqrt(variance);

        return {
            middle,
            upper: middle + (stdDev * multiplier),
            lower: middle - (stdDev * multiplier)
        };
    });
}

export function calculateZigZag(data, providedDepth) {
    // 0. 데이터 정합성 (차트와 동일하게 Flat candle 및 무의미 데이터 제거)
    const candles = data.filter(c => {
        const isFlat = Number(c.open) === Number(c.close) && Number(c.high) === Number(c.low);
        return !isFlat && Number(c.close) > 0;
    });

    if (candles.length < 20) return { hasRecentBullishMSB: false, hasRecentBearishMSB: false, markers: [], lineData: [], keyLevels: [] };

    // 1. 설정 (차트와 동일한 깊이 계산)
    const depth = providedDepth || (candles.length > 50 ? 10 : 5);
    let lastType = null, lastH = null, lastL = null;

    // 2. 파동 분석 (Pivot Points) 및 정격 지그재그 추출
    const rawPoints = [];
    for (let i = depth; i < candles.length - depth; i++) {
        let isH = true, isL = true;
        for (let j = 1; j <= depth; j++) {
            if (candles[i - j].high > candles[i].high || (i + j < candles.length && candles[i + j].high > candles[i].high)) isH = false;
            if (candles[i - j].low < candles[i].low || (i + j < candles.length && candles[i + j].low < candles[i].low)) isL = false;
        }
        if (isH) rawPoints.push({ time: candles[i].time, value: candles[i].high, type: 'H', index: i });
        else if (isL) rawPoints.push({ time: candles[i].time, value: candles[i].low, type: 'L', index: i });
    }

    // 지그재그 정제: 고점은 이전 저점보다 높아야 함, 저점은 이전 고점보다 낮아야 함
    const sanitizedPoints = [];
    rawPoints.forEach(p => {
        if (sanitizedPoints.length === 0) { sanitizedPoints.push(p); }
        else {
            const last = sanitizedPoints[sanitizedPoints.length - 1];
            if (p.type !== last.type) {
                if (last.type === 'H' && p.value < last.value) sanitizedPoints.push(p);
                else if (last.type === 'L' && p.value > last.value) sanitizedPoints.push(p);
            } else {
                if (p.type === 'H' && p.value > last.value) sanitizedPoints[sanitizedPoints.length - 1] = p;
                else if (p.type === 'L' && p.value < last.value) sanitizedPoints[sanitizedPoints.length - 1] = p;
            }
        }
    });

    // 라벨링 (HH, LL 등)
    const points = sanitizedPoints.map((p, idx, arr) => {
        const prevSame = arr.slice(0, idx).reverse().find(x => x.type === p.type);
        let lbl = p.type;
        if (p.type === 'H') lbl = !prevSame ? 'H' : (p.value > prevSame.value ? 'HH' : 'LH');
        else lbl = !prevSame ? 'L' : (p.value < prevSame.value ? 'LL' : 'HL');
        return { ...p, label: lbl };
    });

    // 3. 구조적 변화 추적 (SMC: MSB & BOS) — 레이블 기반 판별
    // ✅ 핵심: HH/LL 레이블을 직접 사용하여 추세 지속(BOS)과 반전(MSB)을 구분
    const markers = [];
    const allMsbTimes = [];
    let lastTrend = 'neutral'; // 'bullish' | 'bearish' | 'neutral'

    points.forEach((p) => {
        // 피벗 레이블 텍스트 마커 (HH, LL, LH, HL)
        markers.push({ time: p.time, position: p.type === 'H' ? 'aboveBar' : 'belowBar', text: p.label, size: 0 });

        // HH = 전고점 돌파 (Bullish Break)
        if (p.label === 'HH') {
            if (lastTrend === 'bullish') {
                // 이미 상승 추세 → 추세 지속 = BOS
                markers.push({ time: p.time, position: 'belowBar', color: '#94a3b8', shape: 'square', text: 'BOS', size: 1 });
            } else {
                // 하락/중립 → 상승 반전 = MSB
                markers.push({ time: p.time, position: 'belowBar', color: '#3b82f6', shape: 'arrowUp', text: 'MSB', size: 1.5 });
                allMsbTimes.push({ time: p.time, type: 'bull' });
            }
            lastTrend = 'bullish';
        }

        // LL = 전저점 이탈 (Bearish Break)
        if (p.label === 'LL') {
            if (lastTrend === 'bearish') {
                // 이미 하락 추세 → 추세 지속 = BOS
                markers.push({ time: p.time, position: 'aboveBar', color: '#94a3b8', shape: 'square', text: 'BOS', size: 1 });
            } else {
                // 상승/중립 → 하락 반전 = MSB
                markers.push({ time: p.time, position: 'aboveBar', color: '#f59e0b', shape: 'arrowDown', text: 'MSB', size: 1.5 });
                allMsbTimes.push({ time: p.time, type: 'bear' });
            }
            lastTrend = 'bearish';
        }
        // LH, HL → 추세 전환 없음, MSB/BOS 마커 없음
    });

    // 4. 결과 판정 (최근 2봉 내 발생 여부)
    let hasRecentBullishMSB = false;
    let hasRecentBearishMSB = false;
    if (candles.length >= 2) {
        const threshold = candles[candles.length - 2].time;
        hasRecentBullishMSB = allMsbTimes.some(m => m.type === 'bull' && m.time >= threshold);
        hasRecentBearishMSB = allMsbTimes.some(m => m.type === 'bear' && m.time >= threshold);
    }

    const rsiData = calculateRSI(candles);
    const lastRsi = rsiData[rsiData.length - 1];
    let analysis = {
        summary: hasRecentBullishMSB ? "강력 매수 신호 포착" : hasRecentBearishMSB ? "단기 매도 전략 권고" : "중립 구간 분석 중",
        detail: `최신 RSI 수치는 ${lastRsi?.toFixed(1) || 'N/A'}으로 측정되었습니다.`,
        sentiment: hasRecentBullishMSB ? "bullish" : hasRecentBearishMSB ? "bearish" : "neutral"
    };

    return {
        lineData: points.map(p => ({ time: p.time, value: p.value })),
        markers: markers.sort((a, b) => (a.time > b.time ? 1 : -1)),
        keyLevels: [],
        hasRecentBullishMSB,
        hasRecentBearishMSB,
        analysis,
        rsiData
    };
}

export function checkBreakout(data) {
    if (data.length < 21) return false;
    return data[data.length - 1].close > Math.max(...data.slice(-21, -1).map(d => d.high));
}

export function checkHighVolume(data) {
    if (data.length < 6) return false;
    const avg = data.slice(-6, -1).reduce((acc, d) => acc + (d.volume || 0), 0) / 5;
    return (data[data.length - 1].volume || 0) > avg * 2;
}
