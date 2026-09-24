import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type TipState = { text: string; x: number; y: number } | null;

type TipApi = {
  show: (text: string, e: { clientX: number; clientY: number }) => void;
  move: (e: { clientX: number; clientY: number }) => void;
  hide: () => void;
};

const TipCtx = createContext<TipApi | null>(null);

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<TipState>(null);

  const show = useCallback((text: string, e: { clientX: number; clientY: number }) => {
    setTip({ text, x: e.clientX, y: e.clientY });
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

  return (
    <TipCtx.Provider value={api}>
      {children}
      {tip ? (
        <div
          className="float-tip"
          style={{
            left: Math.min(tip.x + 14, window.innerWidth - 220),
            top: Math.min(tip.y + 14, window.innerHeight - 48),
          }}
          role="tooltip"
        >
          {tip.text}
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
export function tipHandlers(tip: TipApi, text: string | null | undefined) {
  if (!text) return {};
  return {
    onMouseEnter: (e: { clientX: number; clientY: number }) => tip.show(text, e),
    onMouseMove: (e: { clientX: number; clientY: number }) => tip.move(e),
    onMouseLeave: () => tip.hide(),
  };
}
