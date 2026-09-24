import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router";

import { ByobPage, type ByobMetrics } from "./pages/Byob";
import { LoginPage } from "./pages/Login";

type Me = { authenticated: true; username: string } | { authenticated: false };

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
    <Routes>
      <Route
        path="/login"
        element={
          me.authenticated ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage
              onSuccess={(username) => setMe({ authenticated: true, username })}
            />
          )
        }
      />
      <Route
        path="/"
        element={
          me.authenticated ? (
            <AuthedShell
              username={me.username}
              onLogout={() => setMe({ authenticated: false })}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AuthedShell({ username, onLogout }: { username: string; onLogout: () => void }) {
  const [metrics, setMetrics] = useState<ByobMetrics | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/byob/metrics", { credentials: "include" });
      if (res.status === 401) {
        onLogout();
        return;
      }
      const body = (await res.json()) as ByobMetrics & { error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setMetrics(body);
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
          <div className="sub">BYOB monitoring</div>
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
      {err ? <p className="err">{err}</p> : null}
      {loading && !metrics ? <p className="muted">Loading metrics…</p> : null}
      {metrics ? <ByobPage data={metrics} /> : null}
    </div>
  );
}
