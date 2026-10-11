import { useMemo } from "react";

const COLORS = ["#e11d48", "#f2b233", "#2f8f6b", "#3b6fd4", "#8b5cf6", "#f2657f"];

interface Props {
  /** 变化这个值就会重放一次。 */
  runId: number;
  pieces?: number;
}

export function Confetti({ runId, pieces = 70 }: Props) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        key: `${runId}-${i}`,
        left: `${Math.random() * 100}%`,
        dx: `${(Math.random() - 0.5) * 220}px`,
        rot: `${Math.random() * 900 - 450}deg`,
        delay: `${Math.random() * 0.5}s`,
        duration: `${2.4 + Math.random() * 1.9}s`,
        color: COLORS[i % COLORS.length],
        width: `${6 + Math.random() * 6}px`,
        height: `${10 + Math.random() * 10}px`,
      })),
    [runId, pieces],
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      key={runId}
    >
      {items.map((item) => (
        <span
          key={item.key}
          className="confetti-piece"
          style={
            {
              left: item.left,
              background: item.color,
              width: item.width,
              height: item.height,
              animationDelay: item.delay,
              animationDuration: item.duration,
              "--dx": item.dx,
              "--rot": item.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
