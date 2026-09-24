import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TipState = { content: ReactNode; x: number; y: number } | null;

type TipApi = {
  show: (content: ReactNode, e: { clientX: number; clientY: number }) => void;
  move: (e: { clientX: number; clientY: number }) => void;
  hide: () => void;
};

const TipCtx = createContext<TipApi | null>(null);

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState>(null);

  const show = useCallback((content: ReactNode, e: { clientX: number; clientY: number }) => {
    setTip({ content, x: e.clientX, y: e.clientY });
  }, []);

  const move = useCallback((e: { clientX: number; clientY: number }) => {
    setTip((cur) => (cur ? { ...cur, x: e.clientX, y: e.clientY } : cur));
  }, []);

  const hide = useCallback(() => setTip(null), []);

  const api = useMemo(() => ({ show, move, hide }), [show, move, hide]);

  useEffect(() => {
    const onScroll = () => setTip(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  const pad = 16;
  const tipW = 300;
  const tipH = 220;
  const left = tip
    ? Math.max(12, Math.min(tip.x + pad, (typeof window !== "undefined" ? window.innerWidth : tipW) - tipW - 12))
    : 0;
  const top = tip
    ? Math.max(12, Math.min(tip.y + pad, (typeof window !== "undefined" ? window.innerHeight : tipH) - tipH - 12))
    : 0;

  return (
    <TipCtx.Provider value={api}>
      {children}
      {tip ? (
        <div className="float-tip" style={{ left, top }} role="tooltip">
          {typeof tip.content === "string" ? <div className="tip-plain">{tip.content}</div> : tip.content}
        </div>
      ) : null}
    </TipCtx.Provider>
  );
}

export function useTip(): TipApi {
  const ctx = useContext(TipCtx);
  if (!ctx) {
    return {
      show: () => undefined,
      move: () => undefined,
      hide: () => undefined,
    };
  }
  return ctx;
}

/** Bind mouse-follow tooltip. Pass as spread props on hoverable elements. */
export function tipHandlers(tip: TipApi, content: ReactNode | null | undefined) {
  if (content === null || content === undefined || content === "") return {};
  return {
    onMouseEnter: (e: { clientX: number; clientY: number }) => tip.show(content, e),
    onMouseMove: (e: { clientX: number; clientY: number }) => tip.move(e),
    onMouseLeave: () => tip.hide(),
  };
}

export function TipPanel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="tip-panel">
      {title ? <div className="tip-title">{title}</div> : null}
      {children}
    </div>
  );
}

export function TipRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="tip-row">
      <span className="tip-label">{label}</span>
      <span className="tip-value">{value}</span>
    </div>
  );
}

export function TipSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="tip-section">
      <div className="tip-section-title">{title}</div>
      {children}
    </div>
  );
}

export function TipMuted({ children }: { children: ReactNode }) {
  return <div className="tip-muted">{children}</div>;
}
