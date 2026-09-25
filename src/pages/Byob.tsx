import { useCallback, useEffect, useState } from "react";

import { CohortDonuts } from "../components/CohortDonuts";
import { SortTh, type SortDir } from "../components/SortTh";
import { TipPanel, TipRow, tipHandlers, useTip } from "../lib/tooltip";

export type ByobMetrics = {
  source?: "demo" | "monitor";
  cycle: number;
  delayCycles: number;
  explorer?: string;
  basket: { symbol: string; address: string; decimals: number }[];
  activeCount: number;
  alignedActiveCount: number;
  pendingCount: number;
  pendingClassicCount: number;
  pendingCustomCount: number;
  cohort?: {
    eligibleWallets: number;
    byobWallets: number;
    classicWallets: number;
    totalOuro: string;
    byobOuro: string;
    classicOuro: string;
    byobOuroShareBps: number;
    classicOuroShareBps: number;
    dividendLine: string;
    potUsd: number | null;
    potUpdatedAt: number | null;
  };
  tokens: {
    symbol: string;
    address: string;
    avgWeightBps: number;
    sumWeightBps: number;
    walletsAbove0: number;
    walletsAbove50pct: number;
    walletsAt100pct: number;
    potRaw?: string | null;
    potAmount?: number | null;
    potUsd?: number | null;
    byobDemandBpsOfPot?: number;
    classicRemainderBpsOfPot?: number;
  }[];
  allInOneTokenCount?: number;
};

type ActiveRow = {
  address: string;
  weights: Record<string, number> | null;
  updatedAt: number;
  updatedCycle: number;
  ouro?: string | null;
};
type PendingRow = {
  address: string;
  classic: boolean;
  weights: Record<string, number> | null;
  submittedCycle: number;
  effectiveFromCycle: number;
  submittedAt: number;
  ouro?: string | null;
};
type AuditRow = {
  id: number;
  address: string;
  kind: string;
  cycle: number;
  ts: number;
  weights: unknown;
};
type AllInRow = { address: string; symbol: string; weightBps: number };

type ByobTable = "active" | "pending" | "audit" | "all_in";

type PageResult<T> = {
  rows: T[];
  total: number;
  page: number;
  pageCount: number;
  query: string;
  setQuery: (q: string) => void;
  setPage: (p: number) => void;
  sort: string;
  dir: SortDir;
  toggleSort: (col: string) => void;
  loading: boolean;
  err: string | null;
};

const PAGE_SIZE = 15;
const EXPLORER_FALLBACK = "https://robinhoodchain.blockscout.com";
const DEFAULT_SORT: Record<ByobTable, string> = {
  active: "updatedAt",
  pending: "submittedAt",
  audit: "id",
  all_in: "symbol",
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

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 10_000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function fmtOuro(raw: string | null | undefined, decimals = 18): string {
  if (!raw) return "—";
  try {
    const v = Number(BigInt(raw)) / 10 ** decimals;
    return fmtNum(v, 0);
  } catch {
    return "—";
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

function explorerUrl(base: string | undefined, address: string): string {
  return `${(base || EXPLORER_FALLBACK).replace(/\/+$/, "")}/address/${address}`;
}

function AddrLink({ address, explorer }: { address: string; explorer?: string }) {
  const tip = useTip();
  return (
    <a
      className="mono addr-link"
      href={explorerUrl(explorer, address)}
      target="_blank"
      rel="noreferrer"
      {...tipHandlers(tip, address)}
    >
      {shortAddr(address)}
    </a>
  );
}

function useServerPaged<T>(table: ByobTable, refreshKey: number): PageResult<T> {
  const [page, setPage] = useState(0);
  const [query, setQueryState] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sort, setSort] = useState(DEFAULT_SORT[table]);
  const [dir, setDir] = useState<SortDir>("desc");
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, sort, dir]);

  useEffect(() => {
    let cancelled = false;
    const offset = page * PAGE_SIZE;
    const params = new URLSearchParams({
      table,
      limit: String(PAGE_SIZE),
      offset: String(offset),
      q: debouncedQ,
      sort,
      dir,
    });
    setLoading(true);
    setErr(null);
    void fetch(`/api/byob/rows?${params}`, { credentials: "include" })
      .then(async (res) => {
        const body = (await res.json()) as {
          rows?: T[];
          total?: number;
          error?: string;
          sort?: string;
          dir?: SortDir;
        };
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        if (cancelled) return;
        setRows(body.rows ?? []);
        setTotal(body.total ?? 0);
        if (body.sort) setSort(body.sort);
        if (body.dir === "asc" || body.dir === "desc") setDir(body.dir);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr((e as Error).message);
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [table, page, debouncedQ, sort, dir, refreshKey]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
  }, []);

  const toggleSort = useCallback((col: string) => {
    setSort((prev) => {
      if (prev === col) {
        setDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setDir("desc");
      return col;
    });
  }, []);

  return {
    rows,
    total,
    page: safePage,
    pageCount,
    query,
    setQuery,
    setPage,
    sort,
    dir,
    toggleSort,
    loading,
    err,
  };
}

function TableToolbar({
  query,
  onQuery,
  total,
  page,
  pageCount,
  onPage,
  placeholder,
  loading,
}: {
  query: string;
  onQuery: (v: string) => void;
  total: number;
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
  placeholder: string;
  loading?: boolean;
}) {
  return (
    <div className="table-tools">
      <input
        className="search"
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder={placeholder}
      />
      <div className="pager">
        <span className="muted">
          {loading ? "…" : total} · page {page + 1}/{pageCount}
        </span>
        <button type="button" className="btn ghost sm" disabled={page <= 0 || loading} onClick={() => onPage(page - 1)}>
          Prev
        </button>
        <button
          type="button"
          className="btn ghost sm"
          disabled={page >= pageCount - 1 || loading}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function ByobPage({ data, refreshKey = 0 }: { data: ByobMetrics; refreshKey?: number }) {
  const tip = useTip();
  const explorer = data.explorer || EXPLORER_FALLBACK;
  const cohort = data.cohort;

  const activePaged = useServerPaged<ActiveRow>("active", refreshKey);
  const pendingPaged = useServerPaged<PendingRow>("pending", refreshKey);
  const allInPaged = useServerPaged<AllInRow>("all_in", refreshKey);
  const auditPaged = useServerPaged<AuditRow>("audit", refreshKey);

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
          <Stat label="Eligible" value={cohort ? String(cohort.eligibleWallets) : "—"} />
          <Stat
            label="Pot USD"
            value={cohort?.potUsd != null ? `$${fmtNum(cohort.potUsd)}` : "—"}
          />
        </div>
      </section>

      {cohort ? (
        <CohortDonuts cohort={cohort} />
      ) : (
        <section className="panel">
          <p className="muted">Cohort data unavailable.</p>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>Pot vs BYOB demand</h2>
        </div>
        <p className="muted tight">
          Treasury pot per basket token, and how much of that pot OURO-weighted BYOB prefs would claim
          first (classic takes the remainder).
        </p>
        <div className="pot-grid">
          {data.tokens.map((t) => {
            const demand = t.byobDemandBpsOfPot ?? 0;
            const rem = t.classicRemainderBpsOfPot ?? Math.max(0, 10_000 - demand);
            const tipContent = (
              <TipPanel title={t.symbol}>
                <TipRow
                  label="Pot"
                  value={`${fmtNum(t.potAmount)}${t.potUsd != null ? ` · $${fmtNum(t.potUsd)}` : ""}`}
                />
                <TipRow label="BYOB claims" value={pct(demand)} />
                <TipRow label="Classic left" value={pct(rem)} />
                <TipRow label="Pref avg" value={pct(t.avgWeightBps)} />
                <TipRow label="All-in" value={`${t.walletsAt100pct} wallets`} />
              </TipPanel>
            );
            return (
              <div key={t.address} className="pot-card" {...tipHandlers(tip, tipContent)}>
                <div className="pot-top">
                  <strong>{t.symbol}</strong>
                  <span className="muted">
                    pot {fmtNum(t.potAmount)} · {t.potUsd != null ? `$${fmtNum(t.potUsd)}` : "—"}
                  </span>
                </div>
                <div className="stack-bar" aria-hidden>
                  <div className="stack-byob" style={{ width: `${demand / 100}%` }} />
                  <div className="stack-classic" style={{ width: `${rem / 100}%` }} />
                </div>
                <div className="pot-meta">
                  <span>
                    BYOB claims <strong>{pct(demand)}</strong> of pot
                  </span>
                  <span className="muted">classic left {pct(rem)}</span>
                </div>
                <div className="muted tiny">
                  pref avg {pct(t.avgWeightBps)} · {t.walletsAt100pct} all-in · {t.walletsAbove50pct} &gt;50%
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>All-in wallets</h2>
        </div>
        <TableToolbar
          query={allInPaged.query}
          onQuery={allInPaged.setQuery}
          total={allInPaged.total}
          page={allInPaged.page}
          pageCount={allInPaged.pageCount}
          onPage={allInPaged.setPage}
          placeholder="Filter address or token…"
          loading={allInPaged.loading}
        />
        {allInPaged.err ? <p className="err">{allInPaged.err}</p> : null}
        {allInPaged.total === 0 && !allInPaged.loading ? (
          <p className="muted">None at 100% one token.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <SortTh label="Wallet" col="address" sort={allInPaged.sort} dir={allInPaged.dir} onSort={allInPaged.toggleSort} />
                <SortTh label="Token" col="symbol" sort={allInPaged.sort} dir={allInPaged.dir} onSort={allInPaged.toggleSort} />
              </tr>
            </thead>
            <tbody>
              {allInPaged.rows.map((r) => (
                <tr key={`${r.address}-${r.symbol}`}>
                  <td>
                    <AddrLink address={r.address} explorer={explorer} />
                  </td>
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
        </div>
        <TableToolbar
          query={activePaged.query}
          onQuery={activePaged.setQuery}
          total={activePaged.total}
          page={activePaged.page}
          pageCount={activePaged.pageCount}
          onPage={activePaged.setPage}
          placeholder="Filter address or weights…"
          loading={activePaged.loading}
        />
        {activePaged.err ? <p className="err">{activePaged.err}</p> : null}
        <table>
          <thead>
            <tr>
              <SortTh label="Wallet" col="address" sort={activePaged.sort} dir={activePaged.dir} onSort={activePaged.toggleSort} />
              <SortTh label="OURO" col="ouro" sort={activePaged.sort} dir={activePaged.dir} onSort={activePaged.toggleSort} />
              <th>Weights</th>
              <SortTh label="Updated" col="updatedCycle" sort={activePaged.sort} dir={activePaged.dir} onSort={activePaged.toggleSort} />
            </tr>
          </thead>
          <tbody>
            {activePaged.rows.map((r) => (
              <tr key={r.address}>
                <td>
                  <AddrLink address={r.address} explorer={explorer} />
                </td>
                <td className="muted">{fmtOuro(r.ouro)}</td>
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
        </div>
        <TableToolbar
          query={pendingPaged.query}
          onQuery={pendingPaged.setQuery}
          total={pendingPaged.total}
          page={pendingPaged.page}
          pageCount={pendingPaged.pageCount}
          onPage={pendingPaged.setPage}
          placeholder="Filter address or change…"
          loading={pendingPaged.loading}
        />
        {pendingPaged.err ? <p className="err">{pendingPaged.err}</p> : null}
        {pendingPaged.total === 0 && !pendingPaged.loading ? (
          <p className="muted">No pending changes.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <SortTh label="Wallet" col="address" sort={pendingPaged.sort} dir={pendingPaged.dir} onSort={pendingPaged.toggleSort} />
                <SortTh label="Change" col="classic" sort={pendingPaged.sort} dir={pendingPaged.dir} onSort={pendingPaged.toggleSort} />
                <SortTh
                  label="Effective"
                  col="effectiveFromCycle"
                  sort={pendingPaged.sort}
                  dir={pendingPaged.dir}
                  onSort={pendingPaged.toggleSort}
                />
              </tr>
            </thead>
            <tbody>
              {pendingPaged.rows.map((r) => (
                <tr key={r.address}>
                  <td>
                    <AddrLink address={r.address} explorer={explorer} />
                  </td>
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
        <TableToolbar
          query={auditPaged.query}
          onQuery={auditPaged.setQuery}
          total={auditPaged.total}
          page={auditPaged.page}
          pageCount={auditPaged.pageCount}
          onPage={auditPaged.setPage}
          placeholder="Filter address, kind, cycle…"
          loading={auditPaged.loading}
        />
        {auditPaged.err ? <p className="err">{auditPaged.err}</p> : null}
        {auditPaged.total === 0 && !auditPaged.loading ? (
          <p className="muted">No audit rows yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <SortTh label="When" col="ts" sort={auditPaged.sort} dir={auditPaged.dir} onSort={auditPaged.toggleSort} />
                <SortTh label="Kind" col="kind" sort={auditPaged.sort} dir={auditPaged.dir} onSort={auditPaged.toggleSort} />
                <SortTh label="Wallet" col="address" sort={auditPaged.sort} dir={auditPaged.dir} onSort={auditPaged.toggleSort} />
                <SortTh label="Cycle" col="cycle" sort={auditPaged.sort} dir={auditPaged.dir} onSort={auditPaged.toggleSort} />
              </tr>
            </thead>
            <tbody>
              {auditPaged.rows.map((r) => (
                <tr key={r.id}>
                  <td className="muted">{when(r.ts)}</td>
                  <td>{r.kind}</td>
                  <td>
                    <AddrLink address={r.address} explorer={explorer} />
                  </td>
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
