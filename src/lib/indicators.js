// 🎯 Market Structure Analysis (Success365 Engine Mirror v101)
export function calculateZigZag(data) {
    const candles = data;
    const depth = 5; // 허브 엔진과 동일하게 depth 5로 고정
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
    let hasMSB = false;

    for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const dateKey = String(c.time).split('T')[0];

        // [1] 타켓 갱신
        const p = pointMap.get(i);
        if (p) {
            if (p.type === 'H') activeHighTarget = { price: p.value, time: p.time, label: p.label, isBroken: false, index: i };
            else activeLowTarget = { price: p.value, time: p.time, label: p.label, isBroken: false, index: i };
            markers.push({ time: p.time, position: p.type === 'H' ? 'aboveBar' : 'belowBar', text: p.label, size: 0 });
        }

        // [2] 돌파 체크
        if (!signalDates.has(dateKey)) {
            if (activeHighTarget && !activeHighTarget.isBroken && c.close > activeHighTarget.price) {
                const isBOS = (activeHighTarget.label === 'HH');
                markers.push({
                    time: c.time, position: 'belowBar', color: isBOS ? '#94a3b8' : '#3b82f6',
                    shape: 'arrowUp', text: isBOS ? 'BOS' : 'MSB', size: 2
                });
                if (!isBOS && i >= candles.length - 5) hasMSB = true;
                else if (isBOS && i >= candles.length - 5) hasMSB = false;
                activeHighTarget.isBroken = true;
                signalDates.add(dateKey);
            }
            else if (activeLowTarget && !activeLowTarget.isBroken && c.close < activeLowTarget.price) {
                const isBOS = (activeLowTarget.label === 'LL');
                markers.push({
                    time: c.time, position: 'aboveBar', color: isBOS ? '#94a3b8' : '#f59e0b',
                    shape: 'arrowDown', text: isBOS ? 'BOS' : 'MSB', size: 2
                });
                if (!isBOS && i >= candles.length - 5) hasMSB = true;
                else if (isBOS && i >= candles.length - 5) hasMSB = false;
                activeLowTarget.isBroken = true;
                signalDates.add(dateKey);
            }
        }
    }

    return {
        lineData: labeledPoints.map(p => ({ time: p.time, value: p.value })),
        markers: markers.sort((a, b) => (a.time > b.time ? 1 : -1)),
        msbLines: msbLines,
        hasRecentMSB: hasMSB
    };
}
