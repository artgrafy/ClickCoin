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

    // 4. MSB Detection (반등/반락 신호 포착)
    let watchHigh = null;
    let watchLow = null;
    let swingIdx = 0;
    const allMsbTimes = [];

    const lineData = filtered.map(pt => ({ time: pt.time, value: pt.value }));

    for (let i = 0; i < data.length; i++) {
        const candle = data[i];

        while (swingIdx < labeledSwings.length && labeledSwings[swingIdx].time === candle.time) {
            const swing = labeledSwings[swingIdx];

            // Bullish Settings
            if (swing.label === 'LH') watchHigh = swing.value;
            else if (swing.label === 'HH') watchHigh = null;

            // Bearish Settings
            if (swing.label === 'HL') watchLow = swing.value;
            else if (swing.label === 'LL') watchLow = null;

            swingIdx++;
        }

        // Bullish MSB (상승돌파)
        if (watchHigh !== null && candle.close > watchHigh) {
            markers.push({
                time: candle.time,
                position: 'belowBar',
                color: '#FFD60A',
                shape: 'arrowUp',
                text: '상승돌파',
                size: 2
            });
            allMsbTimes.push({ time: candle.time, type: 'bull' });
            watchHigh = null;
        }

        // Bearish MSB (하락돌파)
        if (watchLow !== null && candle.close < watchLow) {
            markers.push({
                time: candle.time,
                position: 'aboveBar',
                color: '#0A84FF',
                shape: 'arrowDown',
                text: '하락돌파',
                size: 2
            });
            allMsbTimes.push({ time: candle.time, type: 'bear' });
            watchLow = null;
        }
    }

    markers.sort((a, b) => (a.time < b.time ? -1 : 1));

    // 최근 상승돌파/하락돌파 여부 확인
    let hasRecentBullishMSB = false;
    let hasRecentBearishMSB = false;
    if (data.length >= 3) {
        const threshold = data[data.length - 3].time;
        hasRecentBullishMSB = markers.some(m => m.text === '상승돌파' && m.time >= threshold);
        hasRecentBearishMSB = markers.some(m => m.text === '하락돌파' && m.time >= threshold);
    }

    // 5. 지지선 로직 (최근 "반등" 기준)
    const keyLevels = [];
    const bullMsbs = allMsbTimes.filter(m => m.type === 'bull');
    if (bullMsbs.length > 0) {
        const latestMsbTime = bullMsbs[bullMsbs.length - 1].time;

        const preMsbLows = labeledSwings.filter(s => s.type === 'L' && s.time < latestMsbTime);
        if (preMsbLows.length > 0) {
            const support1 = preMsbLows[preMsbLows.length - 1];
            keyLevels.push({
                price: support1.value,
                startTime: support1.time,
                label: '지지1',
                color: 'rgba(48, 209, 88, 0.9)',
                lineStyle: 1
            });
        }

        const postMsbLows = labeledSwings.filter(s => s.type === 'L' && s.time >= latestMsbTime);
        let supportIdx = 2;
        postMsbLows.forEach(low => {
            if (low.label === 'HL') {
                keyLevels.push({
                    price: low.value,
                    startTime: low.time,
                    label: `지지${supportIdx}`,
                    color: 'rgba(48, 209, 88, 0.6)',
                    lineStyle: 2
                });
                supportIdx++;
            }
        });
    }

    // 6. Automated Technical analysis
    let analysis = {
        summary: "분석 데이터 부족",
        detail: "현 추세를 판단하기 위한 기술적 지표가 충분하지 않습니다.",
        sentiment: "neutral"
    };

    if (labeledSwings.length >= 3) {
        const lastSwing = labeledSwings[labeledSwings.length - 1];

        if (hasRecentBearishMSB) {
            analysis.summary = "단기 하락 전환(하락돌파)";
            analysis.detail = "추세 지지선이나 이전 저점을 하향 돌파하는 하락돌파 신호가 발생했습니다. 당분간 관망이 필요합니다.";
            analysis.sentiment = "bearish";
        } else if (hasRecentBullishMSB) {
            analysis.summary = "상승 반전(상승돌파) 발생";
            analysis.detail = "이전 고점을 돌파하는 강력한 상승돌파 신호가 포착되었습니다. 단기 추세 반전의 초입일 가능성이 높습니다.";
            analysis.sentiment = "bullish";
        } else if (lastSwing.label === 'HH' || lastSwing.label === 'HL') {
            analysis.summary = "상승 추세 유지";
            analysis.detail = "저점을 높여가는 전형적인 상승 파동을 그리고 있습니다. 이전 지지선을 이탈하지 않는다면 긍정적입니다.";
            analysis.sentiment = "bullish";
        } else if (lastSwing.label === 'LL' || lastSwing.label === 'LH') {
            analysis.summary = "하락 추세 주의";
            analysis.detail = "고점이 낮아지거나 전저점을 위협하고 있습니다. 보수적인 접근이 필요한 구간입니다.";
            analysis.sentiment = "bearish";
        } else {
            analysis.summary = "방향성 탐색 중";
            analysis.detail = "뚜렷한 추세 없이 수렴 중입니다. 다음 신호가 나올 때까지 거래량을 주시할 필요가 있습니다.";
            analysis.sentiment = "neutral";
        }

        if (keyLevels.length > 0) {
            const mainSupport = keyLevels[keyLevels.length - 1];
            analysis.detail += ` 현재 주요 지지선은 ${mainSupport.price.toLocaleString()}원입니다.`;
        }
    }

    return { lineData, markers, keyLevels, hasRecentBullishMSB, hasRecentBearishMSB, analysis };
}

// 🚀 돌파 종목 탐지 (최근 20일 고점 돌파)
export function checkBreakout(data) {
    if (data.length < 21) return false;
    const today = data[data.length - 1];
    const past = data.slice(-21, -1);
    const maxHigh = Math.max(...past.map(d => d.high));

    return today.close > maxHigh;
}

// 📊 거래량 급증 종목 탐지 (5일 평균 거래량 대비 2배 이상)
export function checkHighVolume(data) {
    if (data.length < 6) return false;
    const today = data[data.length - 1];
    const past = data.slice(-6, -1);
    const avgVolume = past.reduce((acc, d) => acc + (d.volume || 0), 0) / past.length;

    if (avgVolume === 0) return false;
    return (today.volume || 0) > avgVolume * 2;
}
