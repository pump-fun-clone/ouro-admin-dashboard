import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router";

import { TooltipProvider } from "./lib/tooltip";
import { AirdropsPage, type AirdropsData } from "./pages/Airdrops";
import { ByobPage, type ByobMetrics } from "./pages/Byob";
import { LoginPage } from "./pages/Login";

type Me = { authenticated: true; username: string } | { authenticated: false };
type Tab = "byob" | "airdrops";

async function fetchMe(): Promise<Me> {
  const res = await fetch("/api/me", { credentials: "include" });
  if (res.status === 401) return { authenticated: false };
  if (!res.ok) return { authenticated: false };
  return (await res.json()) as Me;
}

export function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [bootErr, setBootErr] = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then(setMe)
      .catch((e) => setBootErr((e as Error).message));
  }, []);

  if (bootErr) {
    return (
      <div className="shell">
        <p className="err">Could not reach API: {bootErr}</p>
      </div>
    );
  }
  if (!me) {
    return (
      <div className="shell">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Routes>
        <Route
          path="/login"
          element={
            me.authenticated ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage onSuccess={(username) => setMe({ authenticated: true, username })} />
            )
          }
        />
        <Route
          path="/"
          element={
            me.authenticated ? (
              <AuthedShell username={me.username} onLogout={() => setMe({ authenticated: false })} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TooltipProvider>
  );
}

function AuthedShell({ username, onLogout }: { username: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("byob");
  const [metrics, setMetrics] = useState<ByobMetrics | null>(null);
  const [airdrops, setAirdrops] = useState<AirdropsData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [mRes, aRes] = await Promise.all([
        fetch("/api/byob/metrics", { credentials: "include" }),
        fetch("/api/airdrops?limit=60", { credentials: "include" }),
      ]);
      if (mRes.status === 401 || aRes.status === 401) {
        onLogout();
        return;
      }
      const mBody = (await mRes.json()) as ByobMetrics & { error?: string };
      const aBody = (await aRes.json()) as AirdropsData & { error?: string };
      if (!mRes.ok) throw new Error(mBody.error || `BYOB HTTP ${mRes.status}`);
      if (!aRes.ok) throw new Error(aBody.error || `Airdrops HTTP ${aRes.status}`);
      setMetrics(mBody);
      setAirdrops(aBody);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function logout() {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    onLogout();
  }

  return (
    <div className="shell">
      <header className="top">
        <div>
          <div className="brand">Ouro Admin</div>
          <div className="sub">Operator dashboard</div>
        </div>
        <div className="top-right">
          <span className="muted">{username}</span>
          <button type="button" className="btn ghost" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="btn ghost" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        <button type="button" className={tab === "byob" ? "tab on" : "tab"} onClick={() => setTab("byob")}>
          BYOB
        </button>
        <button
          type="button"
          className={tab === "airdrops" ? "tab on" : "tab"}
          onClick={() => setTab("airdrops")}
        >
          Airdrops
        </button>
      </nav>

      {err ? <p className="err">{err}</p> : null}
      {loading && !metrics && !airdrops ? <p className="muted">Loading…</p> : null}
      {tab === "byob" && metrics ? <ByobPage data={metrics} /> : null}
      {tab === "airdrops" && airdrops ? (
        <AirdropsPage data={airdrops} cohort={metrics?.cohort} />
      ) : null}
    </div>
  );
}
