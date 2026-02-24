
// 🎯 Market Structure Analysis (Success365 Engine Mirror v46)
export function calculateZigZag(data) {
    const candles = data;
    const depth = 3;
    const rawPoints = [];

    // 1. Pivot Detection
    for (let i = depth; i < candles.length - depth; i++) {
        let isH = true, isL = true;
        for (let j = 1; j <= depth; j++) {
            if (candles[i - j].high >= candles[i].high || candles[i + j].high > candles[i].high) isH = false;
            if (candles[i - j].low <= candles[i].low || candles[i + j].low < candles[i].low) isL = false;
        }
        if (isH) rawPoints.push({ time: candles[i].time, value: candles[i].high, type: 'H', index: i });
        else if (isL) rawPoints.push({ time: candles[i].time, value: candles[i].low, type: 'L', index: i });
    }

    // 2. Alternating Logic
    const alternating = [];
    rawPoints.forEach(p => {
        if (alternating.length === 0) alternating.push(p);
        else {
            const last = alternating[alternating.length - 1];
            if (p.type === last.type) {
                let bIdx = -1, bVal = p.type === 'H' ? Infinity : -Infinity;
                for (let k = last.index + 1; k < p.index; k++) {
                    if (p.type === 'H' ? candles[k].low < bVal : candles[k].high > bVal) {
                        bVal = p.type === 'H' ? candles[k].low : candles[k].high;
                        bIdx = k;
                    }
                }
                if (bIdx !== -1) alternating.push({ time: candles[bIdx].time, value: bVal, type: p.type === 'H' ? 'L' : 'H', index: bIdx });
            }
            alternating.push(p);
        }
    });

    const pointMap = new Map();
    const labeledPoints = alternating.map((p, idx) => {
        const prevSame = alternating.slice(0, idx).reverse().find(x => x.type === p.type);
        let lbl = p.type;
        if (p.type === 'H') lbl = !prevSame ? 'H' : (p.value > prevSame.value ? 'HH' : 'LH');
        else lbl = !prevSame ? 'L' : (p.value < prevSame.value ? 'LL' : 'HL');
        const res = { ...p, label: lbl };
        pointMap.set(p.index, res);
        return res;
    });

    const markers = [], msbLines = [];
    let activeHighTarget = null, activeLowTarget = null;
    const signalDates = new Set();
    const allMsbTimes = [];

    for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const dateKey = String(c.time).split('T')[0];

        // [1] 타켓 갱신 (완전 대칭 원칙)
        const p = pointMap.get(i);
        if (p) {
            if (p.type === 'H') activeHighTarget = { price: p.value, time: p.time, label: p.label, isBroken: false };
            else activeLowTarget = { price: p.value, time: p.time, label: p.label, isBroken: false };
            markers.push({ time: p.time, position: p.type === 'H' ? 'aboveBar' : 'belowBar', text: p.label, size: 0 });
        }

        // [2] 돌파 체크 (One Life Rule)
        if (!signalDates.has(dateKey)) {
            // 상방 돌파 (고점)
            if (activeHighTarget && !activeHighTarget.isBroken && c.close > activeHighTarget.price) {
                const isBOS = (activeHighTarget.label === 'HH');
                markers.push({
                    time: c.time, position: 'belowBar',
                    color: isBOS ? '#94a3b8' : '#3b82f6', shape: isBOS ? 'square' : 'arrowUp',
                    text: isBOS ? 'BOS' : 'MSB', size: 1
                });
                msbLines.push({ start: { time: activeHighTarget.time, price: activeHighTarget.price }, end: { time: c.time, price: activeHighTarget.price }, type: 'bullish' });
                if (!isBOS) allMsbTimes.push({ time: c.time, type: 'bull' });
                activeHighTarget.isBroken = true;
                signalDates.add(dateKey);
            }
            // 하방 돌파 (저점 - 완전 대칭)
            else if (activeLowTarget && !activeLowTarget.isBroken && c.close < activeLowTarget.price) {
                const isBOS = (activeLowTarget.label === 'LL');
                markers.push({
                    time: c.time, position: 'aboveBar',
                    color: isBOS ? '#94a3b8' : '#f59e0b', shape: isBOS ? 'square' : 'arrowDown',
                    text: isBOS ? 'BOS' : 'MSB', size: 1
                });
                msbLines.push({ start: { time: activeLowTarget.time, price: activeLowTarget.price }, end: { time: c.time, price: activeLowTarget.price }, type: 'bearish' });
                if (!isBOS) allMsbTimes.push({ time: c.time, type: 'bear' });
                activeLowTarget.isBroken = true;
                signalDates.add(dateKey);
            }
        }
    }

    let hasRecentBullishMSB = false;
    let hasRecentBearishMSB = false;
    if (candles.length >= 2) {
        const threshold = candles[candles.length - 2].time;
        hasRecentBullishMSB = allMsbTimes.some(m => m.type === 'bull' && m.time >= threshold);
        hasRecentBearishMSB = allMsbTimes.some(m => m.type === 'bear' && m.time >= threshold);
    }

    return {
        lineData: labeledPoints.map(p => ({ time: p.time, value: p.value })),
        markers: markers.sort((a, b) => (a.time > b.time ? 1 : -1)),
        msbLines,
        hasRecentBullishMSB,
        hasRecentBearishMSB
    };
}
