/** Demo BYOB metrics when MONITOR_URL is unset (local UI work without a live monitor). */

const cash = "0x1111111111111111111111111111111111111111";
const pons = "0x2222222222222222222222222222222222222222";
const ai = "0x3333333333333333333333333333333333333333";
const ouro = (n: number) => BigInt(Math.floor(n * 1e18)).toString();

const demoActive = [
  {
    address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    weights: { [cash]: 10000, [pons]: 0, [ai]: 0 },
    updatedAt: Math.floor(Date.now() / 1000) - 86400,
    updatedCycle: 200,
    ouro: ouro(800_000),
  },
  {
    address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    weights: { [cash]: 10000, [pons]: 0, [ai]: 0 },
    updatedAt: Math.floor(Date.now() / 1000) - 72000,
    updatedCycle: 201,
    ouro: ouro(600_000),
  },
  {
    address: "0xeeeeaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    weights: { [cash]: 3334, [pons]: 3333, [ai]: 3333 },
    updatedAt: Math.floor(Date.now() / 1000) - 40000,
    updatedCycle: 205,
    ouro: ouro(500_000),
  },
  {
    address: "0xffffffffffffffffffffffffffffffffffffffff",
    weights: { [cash]: 1666, [pons]: 3334, [ai]: 5000 },
    updatedAt: Math.floor(Date.now() / 1000) - 10000,
    updatedCycle: 206,
    ouro: ouro(500_000),
  },
];

const demoPending = [
  {
    address: "0xddddaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    classic: false,
    weights: { [cash]: 5000, [pons]: 5000, [ai]: 0 },
    submittedCycle: 207,
    effectiveFromCycle: 209,
    submittedAt: Math.floor(Date.now() / 1000) - 1800,
    ouro: ouro(150_000),
  },
];

const demoAudit = [
  {
    id: 3,
    address: "0xccccaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    kind: "pending",
    cycle: 207,
    ts: Math.floor(Date.now() / 1000) - 3600,
    weights: { [cash]: 10000, [pons]: 0, [ai]: 0 },
  },
];

const demoAllIn = [
  { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", symbol: "CASHCAT", weightBps: 10000 },
  { address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", symbol: "CASHCAT", weightBps: 10000 },
];

export function demoByobMetrics() {
  return {
    cycle: 208,
    delayCycles: 2,
    explorer: "https://robinhoodchain.blockscout.com",
    basket: [
      { symbol: "CASHCAT", address: cash, decimals: 18 },
      { symbol: "PONS", address: pons, decimals: 18 },
      { symbol: "AI", address: ai, decimals: 18 },
    ],
    activeCount: demoActive.length,
    alignedActiveCount: demoActive.length,
    pendingCount: demoPending.length,
    pendingClassicCount: 0,
    pendingCustomCount: demoPending.length,
    cohort: {
      eligibleWallets: 40,
      byobWallets: 4,
      classicWallets: 36,
      totalOuro: ouro(12_000_000),
      byobOuro: ouro(2_400_000),
      classicOuro: ouro(9_600_000),
      byobOuroShareBps: 2000,
      classicOuroShareBps: 8000,
      dividendLine: ouro(100_000),
      potUsd: 18420.5,
      potUpdatedAt: Math.floor(Date.now() / 1000) - 120,
    },
    tokens: [
      {
        symbol: "CASHCAT",
        address: cash,
        avgWeightBps: 6250,
        sumWeightBps: 25000,
        walletsAbove0: 4,
        walletsAbove50pct: 3,
        walletsAt100pct: 2,
        potRaw: ouro(500_000),
        potAmount: 500_000,
        potUsd: 8200,
        byobDemandBpsOfPot: 4500,
        classicRemainderBpsOfPot: 5500,
      },
      {
        symbol: "PONS",
        address: pons,
        avgWeightBps: 2500,
        sumWeightBps: 10000,
        walletsAbove0: 2,
        walletsAbove50pct: 0,
        walletsAt100pct: 0,
        potRaw: ouro(300_000),
        potAmount: 300_000,
        potUsd: 6100,
        byobDemandBpsOfPot: 1200,
        classicRemainderBpsOfPot: 8800,
      },
      {
        symbol: "AI",
        address: ai,
        avgWeightBps: 1250,
        sumWeightBps: 5000,
        walletsAbove0: 1,
        walletsAbove50pct: 0,
        walletsAt100pct: 0,
        potRaw: ouro(200_000),
        potAmount: 200_000,
        potUsd: 4120,
        byobDemandBpsOfPot: 800,
        classicRemainderBpsOfPot: 9200,
      },
    ],
    allInOneTokenCount: demoAllIn.length,
    allInOneToken: [],
    recentAudit: [],
    pending: [],
    active: [],
  };
}

function pageRows<T>(
  rows: T[],
  limit: number,
  offset: number,
  match: (row: T, q: string) => boolean,
  q: string,
  sortKey?: (row: T) => string | number | boolean | null | undefined,
  dir: string = "desc",
) {
  const needle = q.trim().toLowerCase();
  let filtered = needle ? rows.filter((r) => match(r, needle)) : [...rows];
  if (sortKey) {
    const asc = dir.toLowerCase() === "asc";
    filtered = filtered.sort((a, b) => {
      const av = sortKey(a);
      const bv = sortKey(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "boolean" && typeof bv === "boolean") {
        const an = av ? 1 : 0;
        const bn = bv ? 1 : 0;
        return asc ? an - bn : bn - an;
      }
      if (typeof av === "number" && typeof bv === "number") {
        return asc ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });
  }
  return {
    total: filtered.length,
    limit,
    offset,
    q: needle,
    rows: filtered.slice(offset, offset + limit),
  };
}

/** Demo stand-in for GET /api/byob/rows. */
export function demoByobRows(
  table: string,
  limit: number,
  offset: number,
  q: string,
  sort = "",
  dir = "desc",
) {
  const kind = table.trim().toLowerCase();
  if (kind === "active") {
    const key = sort || "updatedAt";
    return {
      table: kind,
      sort: key,
      dir: dir === "asc" ? "asc" : "desc",
      ...pageRows(
        demoActive,
        limit,
        offset,
        (r, needle) =>
          r.address.toLowerCase().includes(needle) || JSON.stringify(r.weights).toLowerCase().includes(needle),
        q,
        (r) =>
          key === "address"
            ? r.address
            : key === "ouro"
              ? Number(r.ouro) / 1e18
              : key === "updatedCycle"
                ? r.updatedCycle
                : r.updatedAt,
        dir,
      ),
    };
  }
  if (kind === "pending") {
    const key = sort || "submittedAt";
    return {
      table: kind,
      sort: key,
      dir: dir === "asc" ? "asc" : "desc",
      ...pageRows(
        demoPending,
        limit,
        offset,
        (r, needle) =>
          r.address.toLowerCase().includes(needle) ||
          (r.classic ? "classic" : JSON.stringify(r.weights)).toLowerCase().includes(needle),
        q,
        (r) =>
          key === "address"
            ? r.address
            : key === "ouro"
              ? Number(r.ouro) / 1e18
              : key === "classic"
                ? r.classic
                : key === "effectiveFromCycle"
                  ? r.effectiveFromCycle
                  : key === "submittedCycle"
                    ? r.submittedCycle
                    : r.submittedAt,
        dir,
      ),
    };
  }
  if (kind === "audit") {
    const key = sort || "id";
    return {
      table: kind,
      sort: key,
      dir: dir === "asc" ? "asc" : "desc",
      ...pageRows(
        demoAudit,
        limit,
        offset,
        (r, needle) =>
          r.address.toLowerCase().includes(needle) ||
          r.kind.toLowerCase().includes(needle) ||
          String(r.cycle).includes(needle),
        q,
        (r) =>
          key === "address"
            ? r.address
            : key === "kind"
              ? r.kind
              : key === "cycle"
                ? r.cycle
                : key === "ts"
                  ? r.ts
                  : r.id,
        dir,
      ),
    };
  }
  if (kind === "all_in") {
    const key = sort || "symbol";
    return {
      table: kind,
      sort: key,
      dir: dir === "asc" ? "asc" : "desc",
      ...pageRows(
        demoAllIn,
        limit,
        offset,
        (r, needle) => r.address.toLowerCase().includes(needle) || r.symbol.toLowerCase().includes(needle),
        q,
        (r) => (key === "address" ? r.address : r.symbol),
        dir,
      ),
    };
  }
  return { error: "table must be active|pending|audit|all_in", table: kind, total: 0, limit, offset, q, rows: [] };
}
