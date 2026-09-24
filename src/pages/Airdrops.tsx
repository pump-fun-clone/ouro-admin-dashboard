import { Fragment, useMemo, useState } from "react";

export type AirdropAsset = {
  address: string;
  symbol: string | null;
  decimals: number | null;
  amount: string;
  amountF: number;
  usd: number | null;
  recipients: number | null;
};

export type AirdropEpoch = {
  epoch: number;
  status: string;
  startTs: number | null;
  endTs: number | null;
  paidUsd: number | null;
  recipients: number | null;
  txs: number | null;
  assets: AirdropAsset[];
  payouts: {
    tx: string;
    block: number;
    ts: number;
    paidUsd: number | null;
    recipients: number | null;
    assets: AirdropAsset[];
  }[];
  meta: Record<string, unknown>;
};

export type AirdropDay = {
  day: number;
  epochs: number;
  paid_usd: number | null;
  recipients: number | null;
  tax_usd?: number | null;
};

export type AirdropsData = {
  source?: "demo" | "monitor";
  explorer: string;
  epochs: AirdropEpoch[];
  days: AirdropDay[];
};

const PAGE_SIZE = 15;
const TOKEN_COLORS: Record<string, string> = {
  CASHCAT: "#c9a227",
  PONS: "#5b8def",
  AI: "#6fcf97",
};

function fmtUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtAmt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function when(ts: number | null | undefined): string {
  if (!ts) return "—";
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return String(ts);
  }
}

function dayLabel(ts: number): string {
  try {
    return new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return String(ts);
  }
}

function shortTx(tx: string): string {
  if (tx.length < 14) return tx;
  return `${tx.slice(0, 8)}…${tx.slice(-6)}`;
}

function tokenColor(symbol: string | null | undefined): string {
  if (!symbol) return "#6b6560";
  return TOKEN_COLORS[symbol.toUpperCase()] || "#8a857c";
}

function txUrl(explorer: string, tx: string): string {
  return `${explorer.replace(/\/+$/, "")}/tx/${tx}`;
}

export function AirdropsPage({ data }: { data: AirdropsData }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  const recent = data.epochs.slice(0, 24);
  const maxPaid = Math.max(1, ...recent.map((e) => e.paidUsd ?? 0));

  const totals = useMemo(() => {
    const paid = data.epochs.reduce((s, e) => s + (e.paidUsd ?? 0), 0);
    const recipients = data.epochs.reduce((s, e) => s + (e.recipients ?? 0), 0);
    const bySym = new Map<string, { amountF: number; usd: number }>();
    for (const e of data.epochs) {
      for (const a of e.assets) {
        const sym = a.symbol || a.address.slice(0, 8);
        const cur = bySym.get(sym) || { amountF: 0, usd: 0 };
        cur.amountF += a.amountF;
        cur.usd += a.usd ?? 0;
        bySym.set(sym, cur);
      }
    }
    return {
      paid,
      recipients,
      cycles: data.epochs.length,
      avg: data.epochs.length ? paid / data.epochs.length : 0,
      bySym: [...bySym.entries()].sort((a, b) => b[1].usd - a[1].usd),
    };
  }, [data.epochs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.epochs;
    return data.epochs.filter((e) => {
      const hay = [
        String(e.epoch),
        e.status,
        ...(e.assets.map((a) => a.symbol || "")),
        ...((e.meta.txs as string[] | undefined) || []).map((t) => t),
        ...e.payouts.map((p) => p.tx),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [data.epochs, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const dayMax = Math.max(1, ...data.days.map((d) => d.paid_usd ?? 0));

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <h2>Airdrop history</h2>
          <span className={`pill ${data.source === "demo" ? "warn" : "ok"}`}>
            {data.source === "demo" ? "demo data" : "live monitor"}
          </span>
        </div>
        <div className="stats">
          <Stat label="Cycles shown" value={String(totals.cycles)} />
          <Stat label="Paid (sum)" value={fmtUsd(totals.paid)} />
          <Stat label="Avg / cycle" value={fmtUsd(totals.avg)} />
          <Stat label="Recipients (sum)" value={totals.recipients.toLocaleString()} />
        </div>
      </section>

      <div className="charts-row">
        <section className="panel">
          <div className="panel-head">
            <h2>Paid USD by cycle</h2>
          </div>
          <div className="hist-bars" aria-label="Paid USD by cycle">
            {[...recent].reverse().map((e) => {
              const assets = [...e.assets].sort((a, b) => (b.usd ?? 0) - (a.usd ?? 0));
              const paid = e.paidUsd ?? assets.reduce((s, a) => s + (a.usd ?? 0), 0);
              const colH = (paid / maxPaid) * 100;
              const assetSum = assets.reduce((s, a) => s + (a.usd ?? 0), 0) || 1;
              return (
                <div key={e.epoch} className="hist-col" title={`#${e.epoch} ${fmtUsd(e.paidUsd)}`}>
                  <div className="hist-stack" style={{ height: `${colH}%` }}>
                    {assets.map((a) => (
                      <div
                        key={a.address}
                        className="hist-seg"
                        style={{
                          flex: `${(a.usd ?? 0) / assetSum} 0 0`,
                          background: tokenColor(a.symbol),
                        }}
                        title={`${a.symbol}: ${fmtUsd(a.usd)} (${fmtAmt(a.amountF)})`}
                      />
                    ))}
                  </div>
                  <span className="hist-label">#{e.epoch}</span>
                </div>
              );
            })}
          </div>
          <div className="token-legend">
            {totals.bySym.map(([sym]) => (
              <span key={sym}>
                <span className="swatch" style={{ background: tokenColor(sym) }} />
                {sym}
              </span>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Daily paid</h2>
          </div>
          <div className="hist-bars daily" aria-label="Daily paid USD">
            {data.days.map((d) => (
              <div key={d.day} className="hist-col" title={`${dayLabel(d.day)} ${fmtUsd(d.paid_usd)}`}>
                <div
                  className="hist-bar-solid"
                  style={{ height: `${((d.paid_usd ?? 0) / dayMax) * 100}%` }}
                />
                <span className="hist-label">{dayLabel(d.day)}</span>
              </div>
            ))}
          </div>
          <p className="muted tight">Last {data.days.length} days of closed airdrop USD.</p>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Token totals (loaded cycles)</h2>
        </div>
        <div className="pot-grid">
          {totals.bySym.map(([sym, v]) => (
            <div key={sym} className="pot-card">
              <div className="pot-top">
                <strong>
                  <span className="swatch" style={{ background: tokenColor(sym) }} />
                  {sym}
                </strong>
                <span className="muted">{fmtUsd(v.usd)}</span>
              </div>
              <div className="muted tiny">{fmtAmt(v.amountF)} tokens across {totals.cycles} cycles</div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Cycles</h2>
        </div>
        <div className="table-tools">
          <input
            className="search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Filter cycle, token, tx…"
          />
          <div className="pager">
            <span className="muted">
              {filtered.length} · page {safePage + 1}/{pageCount}
            </span>
            <button type="button" className="btn ghost sm" disabled={safePage <= 0} onClick={() => setPage(safePage - 1)}>
              Prev
            </button>
            <button
              type="button"
              className="btn ghost sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next
            </button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th></th>
              <th>Cycle</th>
              <th>When</th>
              <th>Paid</th>
              <th>Recipients</th>
              <th>Breakdown</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((e) => {
              const isOpen = open === e.epoch;
              const assetSum = e.assets.reduce((s, a) => s + (a.usd ?? 0), 0) || 1;
              return (
                <Fragment key={e.epoch}>
                  <tr className={isOpen ? "row-open" : undefined}>
                    <td>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => setOpen(isOpen ? null : e.epoch)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? "−" : "+"}
                      </button>
                    </td>
                    <td>
                      <strong>#{e.epoch}</strong>
                    </td>
                    <td className="muted">{when(e.endTs ?? e.startTs)}</td>
                    <td>{fmtUsd(e.paidUsd)}</td>
                    <td className="muted">{e.recipients?.toLocaleString() ?? "—"}</td>
                    <td>
                      <div className="mini-stack" title="USD share by token">
                        {e.assets.map((a) => (
                          <div
                            key={a.address}
                            style={{
                              width: `${((a.usd ?? 0) / assetSum) * 100}%`,
                              background: tokenColor(a.symbol),
                            }}
                            title={`${a.symbol}: ${fmtUsd(a.usd)}`}
                          />
                        ))}
                      </div>
                      <div className="muted tiny">
                        {e.assets.map((a) => `${a.symbol} ${fmtAmt(a.amountF)}`).join(" · ")}
                      </div>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr className="detail-row">
                      <td colSpan={6}>
                        <div className="detail">
                          <table>
                            <thead>
                              <tr>
                                <th>Token</th>
                                <th>Amount</th>
                                <th>USD</th>
                                <th>Recipients</th>
                                <th>Share</th>
                              </tr>
                            </thead>
                            <tbody>
                              {e.assets.map((a) => (
                                <tr key={a.address}>
                                  <td>
                                    <span className="swatch" style={{ background: tokenColor(a.symbol) }} />
                                    {a.symbol || shortTx(a.address)}
                                  </td>
                                  <td>{fmtAmt(a.amountF)}</td>
                                  <td>{fmtUsd(a.usd)}</td>
                                  <td className="muted">{a.recipients?.toLocaleString() ?? "—"}</td>
                                  <td className="muted">
                                    {assetSum ? `${(((a.usd ?? 0) / assetSum) * 100).toFixed(1)}%` : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="detail-txs">
                            <span className="muted">Transactions</span>
                            {(e.payouts.length
                              ? e.payouts.map((p) => p.tx)
                              : ((e.meta.txs as string[] | undefined) ?? [])
                            ).map((tx) => (
                              <a
                                key={tx}
                                className="mono addr-link"
                                href={txUrl(data.explorer, tx)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {shortTx(tx)}
                              </a>
                            ))}
                            {!e.payouts.length && !(e.meta.txs as string[] | undefined)?.length ? (
                              <span className="muted">—</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
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
