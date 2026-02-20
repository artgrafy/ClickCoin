
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
    // 0. 데이터 정제 (차트와 동일하게 Flat candle 및 무의미 데이터 제거)
    const cleanData = data.filter(c => {
        const isFlat = Number(c.open) === Number(c.close) && Number(c.high) === Number(c.low);
        return !isFlat && Number(c.close) > 0;
    });

    if (cleanData.length < 20) return { hasRecentBullishMSB: false, hasRecentBearishMSB: false, markers: [], lineData: [], keyLevels: [] };

    const depth = providedDepth || (cleanData.length > 50 ? 10 : 5);
    const points = [];
    let lastType = null, lastH = null, lastL = null;

    // 1. Pivot Points (차트와 동일한 연산자 및 루프 적용)
    for (let i = depth; i < cleanData.length - depth; i++) {
        let isH = true, isL = true;
        for (let j = 1; j <= depth; j++) {
            if (cleanData[i - j].high > cleanData[i].high || (i + j < cleanData.length && cleanData[i + j].high > cleanData[i].high)) isH = false;
            if (cleanData[i - j].low < cleanData[i].low || (i + j < cleanData.length && cleanData[i + j].low < cleanData[i].low)) isL = false;
        }

        if (isH) {
            const val = cleanData[i].high;
            const label = lastH === null ? 'H' : (val > lastH ? 'HH' : 'LH');
            if (lastType === 'H') {
                if (val > points[points.length - 1].value) points[points.length - 1] = { time: cleanData[i].time, value: val, type: 'H', label, index: i };
            } else {
                points.push({ time: cleanData[i].time, value: val, type: 'H', label, index: i });
                lastType = 'H';
            }
            lastH = val;
        } else if (isL) {
            const val = cleanData[i].low;
            const label = lastL === null ? 'L' : (val < lastL ? 'LL' : 'HL');
            if (lastType === 'L') {
                if (val < points[points.length - 1].value) points[points.length - 1] = { time: cleanData[i].time, value: val, type: 'L', label, index: i };
            } else {
                points.push({ time: cleanData[i].time, value: val, type: 'L', label, index: i });
                lastType = 'L';
            }
            lastL = val;
        }
    }

    // 2. MSB 판단 (차트와 동일한 추적 로직)
    const markers = [];
    const allMsbTimes = [];
    let activeLH = null, activeHL = null, lhTime = null, hlTime = null;

    points.forEach((p, idx) => {
        if (p.label === 'LH') { activeLH = p.value; lhTime = p.time; }
        if (p.label === 'HL') { activeHL = p.value; hlTime = p.time; }

        const nextPointIdx = idx < points.length - 1 ? points[idx + 1].index : cleanData.length;
        for (let k = p.index + 1; k < nextPointIdx; k++) {
            const c = cleanData[k];
            if (activeLH && c.close > activeLH) {
                allMsbTimes.push({ time: c.time, type: 'bull' });
                markers.push({ time: c.time, text: 'MSB(Bull)' });
                activeLH = null;
            }
            if (activeHL && c.close < activeHL) {
                allMsbTimes.push({ time: c.time, type: 'bear' });
                markers.push({ time: c.time, text: 'MSB(Bear)' });
                activeHL = null;
            }
        }
    });

    // 3. 결과 판정 (최근 2봉)
    let hasRecentBullishMSB = false;
    let hasRecentBearishMSB = false;
    if (cleanData.length >= 2) {
        const threshold = cleanData[cleanData.length - 2].time;
        hasRecentBullishMSB = allMsbTimes.some(m => m.type === 'bull' && m.time >= threshold);
        hasRecentBearishMSB = allMsbTimes.some(m => m.type === 'bear' && m.time >= threshold);
    }

    // 분석 텍스트 생성 (최소한의 호환성 유지)
    const rsiData = calculateRSI(cleanData);
    const lastRsi = rsiData[rsiData.length - 1];
    let analysis = {
        summary: hasRecentBullishMSB ? "강력 매수 신호 포착" : hasRecentBearishMSB ? "단기 매도 전략 권고" : "분석 중...",
        detail: `현재 RSI는 ${lastRsi?.toFixed(1) || 'N/A'}입니다.`,
        sentiment: hasRecentBullishMSB ? "bullish" : hasRecentBearishMSB ? "bearish" : "neutral"
    };

    return {
        lineData: points.map(p => ({ time: p.time, value: p.value })),
        markers,
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
