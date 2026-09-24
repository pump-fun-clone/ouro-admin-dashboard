/** Demo BYOB metrics when MONITOR_URL is unset (local UI work without a live monitor). */
export function demoByobMetrics() {
  const cash = "0x1111111111111111111111111111111111111111";
  const pons = "0x2222222222222222222222222222222222222222";
  const ai = "0x3333333333333333333333333333333333333333";
  return {
    cycle: 208,
    delayCycles: 2,
    allocateEnabled: false,
    swapEnabled: false,
    basket: [
      { symbol: "CASHCAT", address: cash, decimals: 18 },
      { symbol: "PONS", address: pons, decimals: 18 },
      { symbol: "AI", address: ai, decimals: 18 },
    ],
    activeCount: 4,
    alignedActiveCount: 4,
    pendingCount: 1,
    pendingClassicCount: 0,
    pendingCustomCount: 1,
    tokens: [
      {
        symbol: "CASHCAT",
        address: cash,
        avgWeightBps: 6250,
        sumWeightBps: 25000,
        walletsAbove0: 4,
        walletsAbove50pct: 3,
        walletsAt100pct: 2,
      },
      {
        symbol: "PONS",
        address: pons,
        avgWeightBps: 2500,
        sumWeightBps: 10000,
        walletsAbove0: 2,
        walletsAbove50pct: 0,
        walletsAt100pct: 0,
      },
      {
        symbol: "AI",
        address: ai,
        avgWeightBps: 1250,
        sumWeightBps: 5000,
        walletsAbove0: 1,
        walletsAbove50pct: 0,
        walletsAt100pct: 0,
      },
    ],
    allInOneToken: [
      { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", symbol: "CASHCAT", weightBps: 10000 },
      { address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", symbol: "CASHCAT", weightBps: 10000 },
    ],
    note: "Demo data. Set MONITOR_URL + MONITOR_ADMIN_API_KEY to read live prefs.",
    recentAudit: [
      {
        id: 3,
        address: "0xccccaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        kind: "pending",
        cycle: 207,
        ts: Math.floor(Date.now() / 1000) - 3600,
        weights: { [cash]: 10000, [pons]: 0, [ai]: 0 },
      },
    ],
    pending: [
      {
        address: "0xddddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        classic: false,
        weights: { [cash]: 5000, [pons]: 5000, [ai]: 0 },
        submittedCycle: 207,
        effectiveFromCycle: 209,
        submittedAt: Math.floor(Date.now() / 1000) - 1800,
      },
    ],
    active: [
      {
        address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        weights: { [cash]: 10000, [pons]: 0, [ai]: 0 },
        updatedAt: Math.floor(Date.now() / 1000) - 86400,
        updatedCycle: 200,
      },
      {
        address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        weights: { [cash]: 10000, [pons]: 0, [ai]: 0 },
        updatedAt: Math.floor(Date.now() / 1000) - 72000,
        updatedCycle: 201,
      },
      {
        address: "0xeeeeaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        weights: { [cash]: 3334, [pons]: 3333, [ai]: 3333 },
        updatedAt: Math.floor(Date.now() / 1000) - 40000,
        updatedCycle: 205,
      },
      {
        address: "0xffffffffffffffffffffffffffffffffffffffff",
        weights: { [cash]: 1666, [pons]: 3334, [ai]: 5000 },
        updatedAt: Math.floor(Date.now() / 1000) - 10000,
        updatedCycle: 206,
      },
    ],
  };
}
