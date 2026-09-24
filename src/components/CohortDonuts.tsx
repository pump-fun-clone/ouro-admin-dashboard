import { TipPanel, TipRow, tipHandlers, useTip } from "../lib/tooltip";
import type { ReactNode } from "react";

export function CohortDonuts({
  cohort,
}: {
  cohort: {
    byobWallets: number;
    classicWallets: number;
    byobOuroShareBps: number;
    classicOuroShareBps: number;
    byobOuro: string;
    classicOuro: string;
  };
}) {
  return (
    <div className="charts-row">
      <section className="panel">
        <div className="panel-head">
          <h2>Classic vs BYOB (wallets)</h2>
        </div>
        <Donut
          a={cohort.byobWallets}
          b={cohort.classicWallets}
          aLabel={`BYOB ${cohort.byobWallets}`}
          bLabel={`Classic ${cohort.classicWallets}`}
          tip={
            <TipPanel title="Eligible wallets">
              <TipRow label="BYOB" value={cohort.byobWallets.toLocaleString()} />
              <TipRow label="Classic" value={cohort.classicWallets.toLocaleString()} />
            </TipPanel>
          }
        />
        <p className="muted tight">Eligible holders at or above the airdrop line.</p>
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Classic vs BYOB (OURO)</h2>
        </div>
        <Donut
          a={cohort.byobOuroShareBps}
          b={cohort.classicOuroShareBps}
          aLabel={`BYOB ${pct(cohort.byobOuroShareBps)}`}
          bLabel={`Classic ${pct(cohort.classicOuroShareBps)}`}
          tip={
            <TipPanel title="Eligible OURO">
              <TipRow label="BYOB" value={`${pct(cohort.byobOuroShareBps)} · ${fmtOuro(cohort.byobOuro)}`} />
              <TipRow
                label="Classic"
                value={`${pct(cohort.classicOuroShareBps)} · ${fmtOuro(cohort.classicOuro)}`}
              />
            </TipPanel>
          }
        />
        <p className="muted tight">
          Share of eligible OURO · BYOB {fmtOuro(cohort.byobOuro)} / Classic {fmtOuro(cohort.classicOuro)}
        </p>
      </section>
    </div>
  );
}

function pct(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}

function fmtOuro(raw: string): string {
  try {
    const v = Number(BigInt(raw)) / 1e18;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 10_000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  } catch {
    return "—";
  }
}

function Donut({
  a,
  b,
  aLabel,
  bLabel,
  tip,
}: {
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
  tip: ReactNode;
}) {
  const tipApi = useTip();
  const total = a + b;
  const aPct = total > 0 ? (a / total) * 100 : 50;
  return (
    <div className="donut-wrap" {...tipHandlers(tipApi, tip)}>
      <div
        className="donut"
        style={{
          background: `conic-gradient(var(--accent) 0 ${aPct}%, var(--classic) ${aPct}% 100%)`,
        }}
        aria-hidden
      />
      <div className="donut-legend">
        <div>
          <span className="swatch byob" /> {aLabel}{" "}
          <strong>{total ? pct(Math.round((a / total) * 10000)) : "—"}</strong>
        </div>
        <div>
          <span className="swatch classic" /> {bLabel}{" "}
          <strong>{total ? pct(Math.round((b / total) * 10000)) : "—"}</strong>
        </div>
      </div>
    </div>
  );
}
