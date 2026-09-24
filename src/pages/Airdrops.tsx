import { Fragment, useMemo, useState, type ReactNode } from "react";

import { CohortDonuts } from "../components/CohortDonuts";
import { TipMuted, TipPanel, TipRow, TipSection, tipHandlers, useTip } from "../lib/tooltip";
import type { ByobMetrics } from "./Byob";

export type AirdropAsset = {
  address: string;
  symbol: string | null;
  decimals: number | null;
  amount: string;
  amountF: number;
  usd: number | null;
  recipients: number | null;
};

export type EpochByobAssetSplit = {
  address: string;
  symbol: string | null;
  byobRecipients: number;
  classicRecipients: number;
  byobAmountF: number;
  classicAmountF: number;
  byobUsd: number | null;
  classicUsd: number | null;
  byobShareBps: number | null;
};

export type EpochByobSplit = {
  byobRecipients: number;
  classicRecipients: number;
  byobUsd: number | null;
  classicUsd: number | null;
  byobShareBps: number | null;
  receiptRecipients: number;
  assets?: EpochByobAssetSplit[];
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
  byob?: EpochByobSplit;
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
  note?: string;
};

function pctBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return "—";
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

const PAGE_SIZE = 15;
/** Fixed stack/legend order so chart colors don't reshuffle when a token dominates a cycle. */
const TOKEN_ORDER = ["PONS", "AI", "CASHCAT"];
const TOKEN_COLORS: Record<string, string> = {
  CASHCAT: "#c9a227",
  PONS: "#5b8def",
  AI: "#6fcf97",
};

function tokenRank(symbol: string | null | undefined): number {
  if (!symbol) return 999;
  const i = TOKEN_ORDER.indexOf(symbol.toUpperCase());
  return i === -1 ? 500 : i;
}

function assetsInStableOrder(assets: AirdropAsset[]): AirdropAsset[] {
  return [...assets].sort((a, b) => {
    const ra = tokenRank(a.symbol);
    const rb = tokenRank(b.symbol);
    if (ra !== rb) return ra - rb;
    return (a.symbol || "").localeCompare(b.symbol || "");
  });
}

function fmtUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function byobTip(b: EpochByobSplit | undefined): ReactNode {
  if (!b) {
    return (
      <TipPanel title="BYOB split">
        <TipMuted>No split for this cycle yet (needs admin receipts).</TipMuted>
      </TipPanel>
    );
  }
  return (
    <TipPanel title="BYOB vs classic">
      <TipSection title="Totals">
        <TipRow label="BYOB" value={`${fmtUsd(b.byobUsd)} · ${b.byobRecipients.toLocaleString()} wallets`} />
        <TipRow
          label="Classic"
          value={`${fmtUsd(b.classicUsd)} · ${b.classicRecipients.toLocaleString()} wallets`}
        />
        <TipRow label="BYOB share" value={pctBps(b.byobShareBps)} />
      </TipSection>
      {(b.assets?.length ?? 0) > 0 ? (
        <TipSection title="Per token">
          {b.assets!.map((a) => {
            const sym = a.symbol || a.address.slice(0, 8);
            return (
              <div key={a.address} className="tip-token-block">
                <div className="tip-token-name">
                  <span className="swatch" style={{ background: tokenColor(a.symbol) }} />
                  {sym}
                  <span className="tip-token-share">{pctBps(a.byobShareBps)} BYOB</span>
                </div>
                <TipRow label="BYOB" value={`${fmtAmt(a.byobAmountF)} · ${fmtUsd(a.byobUsd)}`} />
                <TipRow label="Classic" value={`${fmtAmt(a.classicAmountF)} · ${fmtUsd(a.classicUsd)}`} />
              </div>
            );
          })}
        </TipSection>
      ) : null}
    </TipPanel>
  );
}

function cycleTip(
  epoch: number,
  paid: number | null,
  recipients: number | null | undefined,
  assets: AirdropAsset[],
  byob: EpochByobSplit | undefined,
): ReactNode {
  return (
    <TipPanel title={`Cycle #${epoch}`}>
      <TipSection title="Paid">
        <TipRow label="Total" value={fmtUsd(paid)} />
        <TipRow label="Recipients" value={(recipients ?? 0).toLocaleString()} />
      </TipSection>
      <TipSection title="Tokens">
        {assets.map((a) => (
          <TipRow
            key={a.address}
            label={a.symbol || shortTx(a.address)}
            value={`${fmtAmt(a.amountF)} · ${fmtUsd(a.usd)}`}
          />
        ))}
      </TipSection>
      {byob ? (
        <TipSection title="BYOB">
          <TipRow label="BYOB" value={`${fmtUsd(byob.byobUsd)} · ${pctBps(byob.byobShareBps)}`} />
          <TipRow label="Classic" value={fmtUsd(byob.classicUsd)} />
        </TipSection>
      ) : null}
    </TipPanel>
  );
}

function assetTip(a: AirdropAsset, byobAsset?: EpochByobAssetSplit): ReactNode {
  const sym = a.symbol || shortTx(a.address);
  return (
    <TipPanel title={sym}>
      <TipRow label="Paid" value={`${fmtAmt(a.amountF)} · ${fmtUsd(a.usd)}`} />
      {byobAsset ? (
        <>
          <TipRow label="BYOB" value={`${fmtAmt(byobAsset.byobAmountF)} · ${fmtUsd(byobAsset.byobUsd)}`} />
          <TipRow
            label="Classic"
            value={`${fmtAmt(byobAsset.classicAmountF)} · ${fmtUsd(byobAsset.classicUsd)}`}
          />
          <TipRow label="BYOB %" value={pctBps(byobAsset.byobShareBps)} />
        </>
      ) : null}
    </TipPanel>
  );
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

export function AirdropsPage({
  data,
  cohort,
}: {
  data: AirdropsData;
  cohort?: ByobMetrics["cohort"];
}) {
  const tip = useTip();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<number | null>(null);

  const recent = data.epochs.slice(0, 24);
  const maxPaid = Math.max(1, ...recent.map((e) => e.paidUsd ?? 0));

  const totals = useMemo(() => {
    const paid = data.epochs.reduce((s, e) => s + (e.paidUsd ?? 0), 0);
    const recipients = data.epochs.reduce((s, e) => s + (e.recipients ?? 0), 0);
    const byobPaid = data.epochs.reduce((s, e) => s + (e.byob?.byobUsd ?? 0), 0);
    const classicPaid = data.epochs.reduce((s, e) => s + (e.byob?.classicUsd ?? 0), 0);
    const withByob = data.epochs.filter((e) => e.byob).length;
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
      bySym: [...bySym.entries()].sort((a, b) => {
        const ra = tokenRank(a[0]);
        const rb = tokenRank(b[0]);
        if (ra !== rb) return ra - rb;
        return b[1].usd - a[1].usd;
      }),
      byobPaid,
      classicPaid,
      withByob,
    };
  }, [data.epochs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.epochs;
    return data.epochs.filter((e) => {
      const hay = [
        String(e.epoch),
        e.status,
        ...e.assets.map((a) => a.symbol || ""),
        ...((e.meta.txs as string[] | undefined) || []),
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
          <Stat label="BYOB paid (sum)" value={totals.withByob ? fmtUsd(totals.byobPaid) : "—"} />
          <Stat label="Classic paid (sum)" value={totals.withByob ? fmtUsd(totals.classicPaid) : "—"} />
        </div>
        {data.note ? <p className="muted tight">{data.note}</p> : null}
      </section>

      {cohort ? <CohortDonuts cohort={cohort} /> : null}

      <div className="charts-row">
        <section className="panel chart-wide">
          <div className="panel-head">
            <h2>Paid USD by cycle</h2>
          </div>
          <div className="hist-bars" aria-label="Paid USD by cycle">
            {[...recent].reverse().map((e) => {
              const assets = assetsInStableOrder(e.assets);
              const paid = e.paidUsd ?? assets.reduce((s, a) => s + (a.usd ?? 0), 0);
              const colH = (paid / maxPaid) * 100;
              const assetSum = assets.reduce((s, a) => s + (a.usd ?? 0), 0) || 1;
              return (
                <div
                  key={e.epoch}
                  className="hist-col"
                  {...tipHandlers(tip, cycleTip(e.epoch, e.paidUsd ?? paid, e.recipients, assets, e.byob))}
                >
                  <div className="hist-stack" style={{ height: `${Math.max(colH, 2)}%` }}>
                    {assets.map((a) => (
                      <div
                        key={a.address}
                        className="hist-seg"
                        style={{
                          flex: `${Math.max(a.usd ?? 0, 0.0001) / assetSum} 0 0`,
                          background: tokenColor(a.symbol),
                        }}
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
              <span key={sym} {...tipHandlers(tip, sym)}>
                <span className="swatch" style={{ background: tokenColor(sym) }} />
                {sym}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Daily paid</h2>
        </div>
        <div className="hist-bars daily" aria-label="Daily paid USD">
          {data.days.map((d) => {
            const tipContent = (
              <TipPanel title={dayLabel(d.day)}>
                <TipRow label="Paid" value={fmtUsd(d.paid_usd)} />
                <TipRow label="Cycles" value={String(d.epochs)} />
                <TipRow label="Recipients" value={(d.recipients ?? 0).toLocaleString()} />
              </TipPanel>
            );
            return (
              <div key={d.day} className="hist-col" {...tipHandlers(tip, tipContent)}>
                <div
                  className="hist-bar-solid"
                  style={{ height: `${Math.max(((d.paid_usd ?? 0) / dayMax) * 100, 2)}%` }}
                />
                <span className="hist-label">{dayLabel(d.day)}</span>
              </div>
            );
          })}
        </div>
        <p className="muted tight">Last {data.days.length} days of closed airdrop USD.</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Token totals (loaded cycles)</h2>
        </div>
        <div className="pot-grid">
          {totals.bySym.map(([sym, v]) => (
            <div
              key={sym}
              className="pot-card"
              {...tipHandlers(
                tip,
                <TipPanel title={sym}>
                  <TipRow label="USD" value={fmtUsd(v.usd)} />
                  <TipRow label="Amount" value={fmtAmt(v.amountF)} />
                  <TipRow label="Across" value={`${totals.cycles} cycles`} />
                </TipPanel>,
              )}
            >
              <div className="pot-top">
                <strong>
                  <span className="swatch" style={{ background: tokenColor(sym) }} />
                  {sym}
                </strong>
                <span className="muted">{fmtUsd(v.usd)}</span>
              </div>
              <div className="muted tiny">
                {fmtAmt(v.amountF)} tokens across {totals.cycles} cycles
              </div>
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
              <th>BYOB</th>
              <th>Classic</th>
              <th>BYOB %</th>
              <th>Breakdown</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((e) => {
              const isOpen = open === e.epoch;
              const rowAssets = assetsInStableOrder(e.assets);
              const assetSum = rowAssets.reduce((s, a) => s + (a.usd ?? 0), 0) || 1;
              const b = e.byob;
              const share = b?.byobShareBps;
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
                    <td {...tipHandlers(tip, byobTip(b))}>
                      {b ? (
                        <>
                          <div>{fmtUsd(b.byobUsd)}</div>
                          <div className="muted tiny">{b.byobRecipients.toLocaleString()} wallets</div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td {...tipHandlers(tip, byobTip(b))}>
                      {b ? (
                        <>
                          <div>{fmtUsd(b.classicUsd)}</div>
                          <div className="muted tiny">{b.classicRecipients.toLocaleString()} wallets</div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td {...tipHandlers(tip, byobTip(b))}>
                      {b ? (
                        <>
                          <div className="stack-bar thin" aria-hidden>
                            <div className="stack-byob" style={{ width: `${(share ?? 0) / 100}%` }} />
                            <div className="stack-classic" style={{ width: `${100 - (share ?? 0) / 100}%` }} />
                          </div>
                          <div className="muted tiny">{pctBps(share)}</div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="breakdown-cell">
                        <div className="mini-stack">
                          {rowAssets.map((a) => {
                            const ba = b?.assets?.find(
                              (x) => x.address.toLowerCase() === a.address.toLowerCase(),
                            );
                            return (
                              <div
                                key={a.address}
                                style={{
                                  width: `${((a.usd ?? 0) / assetSum) * 100}%`,
                                  background: tokenColor(a.symbol),
                                }}
                                {...tipHandlers(tip, assetTip(a, ba))}
                              />
                            );
                          })}
                        </div>
                        <ul className="token-lines">
                          {rowAssets.map((a) => {
                            const ba = b?.assets?.find(
                              (x) => x.address.toLowerCase() === a.address.toLowerCase(),
                            );
                            const sym = a.symbol || shortTx(a.address);
                            return (
                              <li key={a.address} {...tipHandlers(tip, assetTip(a, ba))}>
                                <span className="token-line-head">
                                  <span className="swatch" style={{ background: tokenColor(a.symbol) }} />
                                  <strong>{sym}</strong>
                                  <span className="muted">{fmtAmt(a.amountF)}</span>
                                  <span className="muted">{fmtUsd(a.usd)}</span>
                                </span>
                                {ba ? (
                                  <span className="token-line-split">
                                    <span>
                                      BYOB <strong>{fmtAmt(ba.byobAmountF)}</strong>
                                    </span>
                                    <span>
                                      Classic <strong>{fmtAmt(ba.classicAmountF)}</strong>
                                    </span>
                                  </span>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr className="detail-row">
                      <td colSpan={8}>
                        <div className="detail">
                          {b ? (
                            <div className="byob-split-detail">
                              <div className="pot-card">
                                <div className="pot-top">
                                  <strong>
                                    <span className="swatch byob" />
                                    BYOB
                                  </strong>
                                  <span>{fmtUsd(b.byobUsd)}</span>
                                </div>
                                <div className="muted tiny">
                                  {b.byobRecipients.toLocaleString()} recipients · {pctBps(b.byobShareBps)} of paid
                                </div>
                              </div>
                              <div className="pot-card">
                                <div className="pot-top">
                                  <strong>
                                    <span className="swatch classic" />
                                    Classic
                                  </strong>
                                  <span>{fmtUsd(b.classicUsd)}</span>
                                </div>
                                <div className="muted tiny">
                                  {b.classicRecipients.toLocaleString()} recipients ·{" "}
                                  {pctBps(b.byobShareBps != null ? 10_000 - b.byobShareBps : null)} of paid
                                </div>
                              </div>
                            </div>
                          ) : null}
                          {(b?.assets?.length ?? 0) > 0 ? (
                            <>
                              <h3 className="detail-subhead">Per token · BYOB vs classic</h3>
                              <table>
                                <thead>
                                  <tr>
                                    <th>Token</th>
                                    <th>BYOB amt</th>
                                    <th>BYOB USD</th>
                                    <th>BYOB wallets</th>
                                    <th>Classic amt</th>
                                    <th>Classic USD</th>
                                    <th>Classic wallets</th>
                                    <th>BYOB %</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {b!.assets!.map((a) => (
                                    <tr key={a.address}>
                                      <td>
                                        <span className="swatch" style={{ background: tokenColor(a.symbol) }} />
                                        {a.symbol || shortTx(a.address)}
                                      </td>
                                      <td>{fmtAmt(a.byobAmountF)}</td>
                                      <td>{fmtUsd(a.byobUsd)}</td>
                                      <td className="muted">{a.byobRecipients.toLocaleString()}</td>
                                      <td>{fmtAmt(a.classicAmountF)}</td>
                                      <td>{fmtUsd(a.classicUsd)}</td>
                                      <td className="muted">{a.classicRecipients.toLocaleString()}</td>
                                      <td>
                                        <div className="stack-bar thin" aria-hidden>
                                          <div
                                            className="stack-byob"
                                            style={{ width: `${(a.byobShareBps ?? 0) / 100}%` }}
                                          />
                                          <div
                                            className="stack-classic"
                                            style={{ width: `${100 - (a.byobShareBps ?? 0) / 100}%` }}
                                          />
                                        </div>
                                        <div className="muted tiny">{pctBps(a.byobShareBps)}</div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          ) : (
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
                          )}
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
                                {...tipHandlers(tip, tx)}
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
