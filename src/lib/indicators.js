
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

export function calculateZigZag(data, depth = 3) {
    const swings = [];

    // 1. Pivot Points (저점/고점 탐지)
    for (let i = depth; i < data.length - depth; i++) {
        const currentHigh = data[i].high;
        const currentLow = data[i].low;
        let isHigh = true;
        let isLow = true;

        for (let j = 1; j <= depth; j++) {
            if (data[i - j].high >= currentHigh || data[i + j].high > currentHigh) isHigh = false;
            if (data[i - j].low <= currentLow || data[i + j].low < currentLow) isLow = false;
        }

        if (isHigh) swings.push({ time: data[i].time, value: currentHigh, type: 'H' });
        if (isLow) swings.push({ time: data[i].time, value: currentLow, type: 'L' });
    }

    if (swings.length === 0) return { lineData: [], markers: [], keyLevels: [], hasRecentBullishMSB: false, hasRecentBearishMSB: false, analysis: { summary: "데이터 부족", detail: "충분한 정보가 없습니다.", sentiment: "neutral" } };

    // 2. Filter (중복 타입 제거)
    const filtered = [swings[0]];
    for (let i = 1; i < swings.length; i++) {
        const prev = filtered[filtered.length - 1];
        const curr = swings[i];
        if (prev.type === curr.type) {
            if (prev.type === 'H') {
                if (curr.value > prev.value) filtered[filtered.length - 1] = curr;
            } else {
                if (curr.value < prev.value) filtered[filtered.length - 1] = curr;
            }
        } else {
            filtered.push(curr);
        }
    }

    // 3. Labeling (HH, HL, LL, LH 라벨링)
    const labeledSwings = [];
    const markers = [];

    for (let i = 0; i < filtered.length; i++) {
        const curr = filtered[i];
        let label = curr.type;

        if (i >= 2) {
            const prevSame = filtered[i - 2];
            if (curr.type === 'H') {
                label = curr.value > prevSame.value ? 'HH' : 'LH';
            } else {
                label = curr.value < prevSame.value ? 'LL' : 'HL';
            }
        }

        labeledSwings.push({ ...curr, label });

        // HH와 LL만 마커로 표시
        if (label === 'HH' || label === 'LL') {
            markers.push({
                time: curr.time,
                position: curr.type === 'H' ? 'aboveBar' : 'belowBar',
                color: curr.type === 'H' ? '#FF453A' : '#30D158',
                shape: 'circle',
                text: label,
                size: 0
            });
        }
    }

    // 4. MSB 및 복합 지표 전략 (RSI + BB + MSB)
    const rsiData = calculateRSI(data);
    const bbData = calculateBB(data);

    let watchHigh = null;
    let watchLow = null;
    let swingIdx = 0;
    const allMsbTimes = [];

    const lineData = filtered.map(pt => ({ time: pt.time, value: pt.value }));

    for (let i = 0; i < data.length; i++) {
        const candle = data[i];
        const rsi = rsiData[i];
        const bb = bbData[i];

        while (swingIdx < labeledSwings.length && labeledSwings[swingIdx].time === candle.time) {
            const swing = labeledSwings[swingIdx];
            if (swing.label === 'LH') watchHigh = swing.value;
            else if (swing.label === 'HH') watchHigh = null;
            if (swing.label === 'HL') watchLow = swing.value;
            else if (swing.label === 'LL') watchLow = null;
            swingIdx++;
        }

        // 🟢 Long (매수) 타점 전략: RSI 과매수(35미만) + 볼밴하단 터치/근접 + 상승돌파
        const isBullishMSB = watchHigh !== null && candle.close > watchHigh;
        if (isBullishMSB || (rsi < 35 && candle.low <= bb.lower * 1.01)) {
            const isStrategyBuy = rsi < 40 && candle.low <= bb.lower * 1.02;
            markers.push({
                time: candle.time,
                position: 'belowBar',
                color: isStrategyBuy ? '#30D158' : '#FFD60A',
                shape: isStrategyBuy ? 'arrowUp' : 'arrowUp',
                text: isStrategyBuy ? 'Buy(Long)' : '상승돌파',
                size: isStrategyBuy ? 2 : 1
            });
            if (isBullishMSB) {
                allMsbTimes.push({ time: candle.time, type: 'bull' });
                watchHigh = null;
            }
        }

        // 🔴 Short (매도) 타점 전략: RSI 과매도(65초과) + 볼밴상단 터치/근접 + 하락돌파
        const isBearishMSB = watchLow !== null && candle.close < watchLow;
        if (isBearishMSB || (rsi > 65 && candle.high >= bb.upper * 0.99)) {
            const isStrategySell = rsi > 60 && candle.high >= bb.upper * 0.98;
            markers.push({
                time: candle.time,
                position: 'aboveBar',
                color: isStrategySell ? '#FF453A' : '#0A84FF',
                shape: isStrategySell ? 'arrowDown' : 'arrowDown',
                text: isStrategySell ? 'Sell(Short)' : '하락돌파',
                size: isStrategySell ? 2 : 1
            });
            if (isBearishMSB) {
                allMsbTimes.push({ time: candle.time, type: 'bear' });
                watchLow = null;
            }
        }
    }

    markers.sort((a, b) => (a.time < b.time ? -1 : 1));

    // 최근 신호 여부
    // 최근 2봉 이내에 MSB 발생 여부 판단 (차트 마커 텍스트가 아닌 실제 이벤트 데이터 기반)
    if (data.length >= 2) {
        const threshold = data[data.length - 2].time;
        hasRecentBullishMSB = allMsbTimes.some(m => m.type === 'bull' && m.time >= threshold);
        hasRecentBearishMSB = allMsbTimes.some(m => m.type === 'bear' && m.time >= threshold);
    }


    // 5. 지지선 로직
    const keyLevels = [];
    const bullMsbs = allMsbTimes.filter(m => m.type === 'bull');
    if (bullMsbs.length > 0) {
        const latestMsbTime = bullMsbs[bullMsbs.length - 1].time;
        const preMsbLows = labeledSwings.filter(s => s.type === 'L' && s.time < latestMsbTime);
        if (preMsbLows.length > 0) {
            const support1 = preMsbLows[preMsbLows.length - 1];
            keyLevels.push({ price: support1.value, startTime: support1.time, label: '주요지지', color: '#30D158', lineStyle: 1 });
        }
    }

    // 6. 분석 텍스트 생성
    const lastRsi = rsiData[rsiData.length - 1];
    let analysis = {
        summary: "분석 중...",
        detail: `현재 RSI는 ${lastRsi?.toFixed(1) || 'N/A'}으로 보합권입니다.`,
        sentiment: "neutral"
    };

    if (hasRecentBullishMSB) {
        analysis.summary = "강력 매수 신호 포착";
        analysis.detail = "RSI 과매매 해소와 볼린저 밴드 하단 지지가 동시에 포착되었습니다. 추세 반등 가능성이 매우 높습니다.";
        analysis.sentiment = "bullish";
    } else if (hasRecentBearishMSB) {
        analysis.summary = "단기 매도 전략 권고";
        analysis.detail = "고점 신호와 함께 하락 돌파가 발생했습니다. 볼린저 밴드 상단 저항이 강하므로 비중 축소가 유리합니다.";
        analysis.sentiment = "bearish";
    }

    return { lineData, markers, keyLevels, hasRecentBullishMSB, hasRecentBearishMSB, analysis, rsiData, bbData };
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
