import { useEffect, useRef, useState, type DOMAttributes, type PointerEvent, type RefObject } from "react";

const INK = "#a78bfa"; // lavender accent matches the rest of the UI

type Handlers = Pick<
  DOMAttributes<HTMLCanvasElement>,
  "onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel" | "onPointerLeave"
>;

/** Shared finger-drawing canvas for Draw, DrawName and ReadDraw. */
export function useDrawCanvas(resetKey: unknown): {
  canvasRef: RefObject<HTMLCanvasElement>;
  hasInk: boolean;
  handlers: Handlers;
  clear(): void;
  toBlob(): Promise<Blob | null>;
} {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);

  // Backing store at native pixel density, sized once the element is laid out.
  // No resize watching: a round is short and rotating mid-draw is rare.
  useEffect(() => {
    setHasInk(false);
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (w === 0 || h === 0) return;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 14;
    ctx.strokeStyle = INK;
  }, [resetKey]);

  const localXY = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const end = () => {
    drawing.current = false;
    lastPt.current = null;
  };

  const handlers: Handlers = {
    onPointerDown(e) {
      e.currentTarget.setPointerCapture(e.pointerId);
      drawing.current = true;
      const p = localXY(e);
      lastPt.current = p;
      // Drop a dot so a tap without a drag still leaves ink.
      const ctx = e.currentTarget.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = INK;
        ctx.fill();
      }
      setHasInk(true);
    },
    onPointerMove(e) {
      if (!drawing.current) return;
      const ctx = e.currentTarget.getContext("2d");
      if (!ctx) return;
      const p = localXY(e);
      const last = lastPt.current ?? p;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastPt.current = p;
    },
    onPointerUp: end,
    onPointerCancel: end,
    onPointerLeave: end,
  };

  function clear() {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) {
      // Reset the whole backing store, whatever the dpr transform.
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.restore();
    }
    setHasInk(false);
  }

  function toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const c = canvasRef.current;
      if (!c?.getContext("2d")) return resolve(null);
      c.toBlob(resolve, "image/png");
    });
  }

  return { canvasRef, hasInk, handlers, clear, toBlob };
}
