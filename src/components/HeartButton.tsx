import { useCallback, useRef, useState } from "react";
import { Heart, Minus } from "lucide-react";

interface Burst {
  id: number;
  pieces: Array<{ dx: string; dy: string }>;
}

function makePieces(): Array<{ dx: string; dy: string }> {
  const count = 8;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 20 + Math.random() * 14;
    return {
      dx: `${Math.cos(angle) * distance}px`,
      dy: `${Math.sin(angle) * distance}px`,
    };
  });
}

interface ButtonProps {
  /** 是否点亮成实心红心。 */
  filled: boolean;
  /** 每次点击都加一颗红心。 */
  onAdd: () => void;
  size?: number;
  disabled?: boolean;
  label: string;
  /** 放在深色舞台上时，未点亮的心用浅色描边。 */
  tone?: "light" | "dark";
}

export function HeartButton({
  filled,
  onAdd,
  size = 30,
  disabled,
  label,
  tone = "light",
}: ButtonProps) {
  const [burst, setBurst] = useState<Burst | null>(null);
  const seq = useRef(0);

  const handle = useCallback(() => {
    if (disabled) return;
    seq.current += 1;
    setBurst({ id: seq.current, pieces: makePieces() });
    window.setTimeout(() => setBurst(null), 700);
    onAdd();
  }, [disabled, onAdd]);

  return (
    <button
      type="button"
      className="heart-btn"
      onClick={handle}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        color: filled
          ? tone === "dark"
            ? "#ff5c7a"
            : "var(--color-brand)"
          : tone === "dark"
            ? "var(--color-stage-mute)"
            : "var(--color-ink-3)",
      }}
    >
      <Heart
        key={burst?.id ?? "still"}
        size={size}
        strokeWidth={2}
        fill={filled ? "currentColor" : "none"}
        className={burst ? "heart-fill-pop" : undefined}
      />
      {burst ? (
        <span className="heart-burst" aria-hidden="true">
          {burst.pieces.map((piece, index) => (
            <i key={index} style={{ "--dx": piece.dx, "--dy": piece.dy } as React.CSSProperties} />
          ))}
        </span>
      ) : null}
    </button>
  );
}

interface ControlProps {
  name: string;
  count: number;
  /**
   * 心形的点亮状态。默认跟随总数；点名页会传「本次点名是否已给过」，
   * 这样每点到一个学生时，红心都是从空白开始的。
   */
  filled?: boolean;
  size?: number;
  layout?: "inline" | "stack";
  tone?: "light" | "dark";
  onAdd: () => void;
  onUndo: () => void;
}

export function HeartControl({
  name,
  count,
  filled,
  size = 26,
  layout = "inline",
  tone = "light",
  onAdd,
  onUndo,
}: ControlProps) {
  const lit = filled ?? count > 0;
  const dark = tone === "dark";

  const heart = (
    <HeartButton
      filled={lit}
      size={size}
      tone={tone}
      onAdd={onAdd}
      label={`给 ${name} 加一颗红心`}
    />
  );

  const minus =
    count > 0 ? (
      <button
        type="button"
        onClick={onUndo}
        className="grid h-6 w-6 place-items-center rounded-full border transition-colors"
        aria-label={`减去 ${name} 的一颗红心`}
        title={`减去 ${name} 的一颗红心`}
        style={
          dark
            ? {
                borderColor: "rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)",
                color: "var(--color-stage-mute)",
              }
            : { borderColor: "var(--color-line)", background: "var(--color-paper)", color: "var(--color-ink-3)" }
        }
      >
        <Minus size={13} strokeWidth={2.5} />
      </button>
    ) : null;

  if (layout === "stack") {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          {heart}
          {minus}
        </div>
        <span
          className="text-[12.5px] font-bold tabular-nums"
          style={{
            color: lit
              ? dark
                ? "#ff8ba2"
                : "var(--color-brand-2)"
              : dark
                ? "var(--color-stage-mute)"
                : "var(--color-ink-3)",
          }}
        >
          {count} 颗
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {heart}
      <span
        className="min-w-[16px] text-[15px] font-bold tabular-nums"
        style={{
          color: lit
            ? dark
              ? "#ff8ba2"
              : "var(--color-brand-2)"
            : dark
              ? "var(--color-stage-mute)"
              : "var(--color-ink-2)",
        }}
      >
        {count}
      </span>
      {minus}
    </div>
  );
}
