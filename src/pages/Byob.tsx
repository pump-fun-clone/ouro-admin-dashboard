export type ByobMetrics = {
  source?: "demo" | "monitor";
  cycle: number;
  delayCycles: number;
  allocateEnabled: boolean;
  swapEnabled: boolean;
  basket: { symbol: string; address: string; decimals: number }[];
  activeCount: number;
  alignedActiveCount: number;
  pendingCount: number;
  pendingClassicCount: number;
  pendingCustomCount: number;
  tokens: {
    symbol: string;
    address: string;
    avgWeightBps: number;
    sumWeightBps: number;
    walletsAbove0: number;
    walletsAbove50pct: number;
    walletsAt100pct: number;
  }[];
  allInOneToken: { address: string; symbol: string; weightBps: number }[];
  note: string;
  recentAudit: {
    id: number;
    address: string;
    kind: string;
    cycle: number;
    ts: number;
    weights: unknown;
  }[];
  pending: {
    address: string;
    classic: boolean;
    weights: Record<string, number> | null;
    submittedCycle: number;
    effectiveFromCycle: number;
    submittedAt: number;
  }[];
  active: {
    address: string;
    weights: Record<string, number> | null;
    updatedAt: number;
    updatedCycle: number;
  }[];
};

function pct(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

function shortAddr(a: string): string {
  if (a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function when(ts: number): string {
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return String(ts);
  }
}

function weightLine(
  weights: Record<string, number> | null | undefined,
  basket: ByobMetrics["basket"],
): string {
  if (!weights) return "—";
  return basket
    .map((t) => {
      const bps = weights[t.address.toLowerCase()] ?? 0;
      return `${t.symbol} ${pct(bps)}`;
    })
    .join(" · ");
}

export function ByobPage({ data }: { data: ByobMetrics }) {
  const hot = data.tokens.filter((t) => t.avgWeightBps >= 5000 || t.walletsAt100pct > 0);

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <h2>Overview</h2>
          <span className={`pill ${data.source === "demo" ? "warn" : "ok"}`}>
            {data.source === "demo" ? "demo data" : "live monitor"}
          </span>
        </div>
        <div className="stats">
          <Stat label="Cycle" value={String(data.cycle)} />
          <Stat label="Active BYOB" value={String(data.activeCount)} />
          <Stat label="Pending" value={String(data.pendingCount)} />
          <Stat label="Delay" value={`${data.delayCycles} cycles`} />
          <Stat label="Allocate" value={data.allocateEnabled ? "on" : "off"} />
          <Stat label="Swaps" value={data.swapEnabled ? "on" : "off"} />
        </div>
        <p className="note">{data.note}</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Token demand (unweighted prefs)</h2>
        </div>
        <p className="muted tight">
          Average weight across active BYOB wallets. Classic holders are not included. Use this to
          spot concentration before a classic remainder gets squeezed.
        </p>
        <div className="bars">
          {data.tokens.map((t) => (
            <div key={t.address} className="bar-row">
              <div className="bar-meta">
                <strong>{t.symbol}</strong>
                <span className="muted">
                  avg {pct(t.avgWeightBps)} · {t.walletsAt100pct} all-in · {t.walletsAbove50pct}{" "}
                  &gt;50%
                </span>
              </div>
              <div className="bar-track" aria-hidden>
                <div
                  className="bar-fill"
                  style={{ width: `${Math.min(100, t.avgWeightBps / 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {hot.length ? (
          <p className="warn-box">
            Concentration watch: {hot.map((t) => t.symbol).join(", ")} looking heavy among opted-in
            wallets. No automatic action — review before a cycle if classic inventory looks thin.
          </p>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>All-in wallets</h2>
          <span className="muted">{data.allInOneToken.length}</span>
        </div>
        {data.allInOneToken.length === 0 ? (
          <p className="muted">None at 100% one token.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Token</th>
              </tr>
            </thead>
            <tbody>
              {data.allInOneToken.map((r) => (
                <tr key={`${r.address}-${r.symbol}`}>
                  <td className="mono">{shortAddr(r.address)}</td>
                  <td>{r.symbol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Active prefs</h2>
          <span className="muted">{data.active.length}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Wallet</th>
              <th>Weights</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.active.map((r) => (
              <tr key={r.address}>
                <td className="mono">{shortAddr(r.address)}</td>
                <td>{weightLine(r.weights, data.basket)}</td>
                <td className="muted">cycle {r.updatedCycle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Pending</h2>
          <span className="muted">{data.pending.length}</span>
        </div>
        {data.pending.length === 0 ? (
          <p className="muted">No pending changes.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Change</th>
                <th>Effective</th>
              </tr>
            </thead>
            <tbody>
              {data.pending.map((r) => (
                <tr key={r.address}>
                  <td className="mono">{shortAddr(r.address)}</td>
                  <td>{r.classic ? "revert classic" : weightLine(r.weights, data.basket)}</td>
                  <td className="muted">from cycle {r.effectiveFromCycle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Recent audit</h2>
        </div>
        {data.recentAudit.length === 0 ? (
          <p className="muted">No audit rows yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Kind</th>
                <th>Wallet</th>
                <th>Cycle</th>
              </tr>
            </thead>
            <tbody>
              {data.recentAudit.map((r) => (
                <tr key={r.id}>
                  <td className="muted">{when(r.ts)}</td>
                  <td>{r.kind}</td>
                  <td className="mono">{shortAddr(r.address)}</td>
                  <td className="muted">{r.cycle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
