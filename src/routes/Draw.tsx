import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Heart,
  Repeat2,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Confetti } from "../components/Confetti";
import { HeartControl } from "../components/HeartButton";
import { GROUPS, GROUP_LABELS, ROSTER, studentNoLabel, studentsOfGroup } from "../data/roster";
import { navigate } from "../lib/router";
import { playReveal, playTick, primeAudio } from "../lib/sound";
import { useStore } from "../lib/store";
import type { Student } from "../lib/types";

const TICKS = 38;
const ROLL_MS = 3500;

function buildIntervals(): number[] {
  const weights = Array.from({ length: TICKS }, (_, k) => {
    const t = k / (TICKS - 1);
    return 0.3 + 4.8 * Math.pow(t, 3.1);
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => (w / sum) * ROLL_MS);
}

type Phase = "idle" | "rolling" | "landed";

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** 转轮里的名字：洗牌拼接，保证前后两个不会是同一个人。 */
function reelSequence(pool: Student[], length: number): Student[] {
  const out: Student[] = [];
  while (out.length < length) {
    const batch = shuffle(pool);
    const last = out[out.length - 1];
    if (last && batch.length > 1 && batch[0].id === last.id) {
      [batch[0], batch[1]] = [batch[1], batch[0]];
    }
    out.push(...batch);
  }
  return out.slice(0, length);
}

export function Draw() {
  const { countOf, addHeart, undoHeart, ready } = useStore();
  const [pool, setPool] = useState(0);
  const [noRepeat, setNoRepeat] = useState(false);
  const [sound, setSound] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [strip, setStrip] = useState<Student[]>(() => ROSTER.slice(0, 4));
  const [center, setCenter] = useState(2);
  const [stepMs, setStepMs] = useState(0);
  const [winner, setWinner] = useState<Student | null>(null);
  const [awarded, setAwarded] = useState(0);
  const [drawn, setDrawn] = useState<string[]>([]);
  const [confettiRun, setConfettiRun] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const timers = useRef<number[]>([]);
  const confettiTimer = useRef<number | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const poolStudents = useMemo(
    () => (pool === 0 ? ROSTER : studentsOfGroup(pool)),
    [pool],
  );

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(
    () => () => {
      if (confettiTimer.current) window.clearTimeout(confettiTimer.current);
    },
    [],
  );

  // 换组时重置本轮记录与结果
  useEffect(() => {
    clearTimers();
    setPhase("idle");
    setWinner(null);
    setDrawn([]);
    setCenter(2);
    setStepMs(0);
  }, [pool, clearTimers]);

  const remaining = poolStudents.filter((s) => !drawn.includes(s.id));

  const roll = useCallback(() => {
    if (phase === "rolling") return;
    clearTimers();
    primeAudio();

    const candidates = noRepeat && remaining.length > 0 ? remaining : poolStudents;
    if (candidates.length === 0) return;
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    // 转轮内容：TICKS 个不重名的连续名字，最后一位固定为结果
    const core = reelSequence(poolStudents, TICKS);
    if (core[core.length - 1]?.id === chosen.id && poolStudents.length > 1) {
      core[core.length - 1] = poolStudents.find((s) => s.id !== chosen.id) ?? chosen;
    }
    core.push(chosen);
    const padded = [...core.slice(0, 2), ...core, ...core.slice(-2)];

    setStrip(padded);
    setCenter(2);
    setStepMs(0);
    setWinner(null);
    setAwarded(0);
    setPhase("rolling");

    if (reduced.current) {
      setCenter(2 + TICKS);
      setWinner(chosen);
      setPhase("landed");
      setDrawn((prev) => (prev.includes(chosen.id) ? prev : [...prev, chosen.id]));
      return;
    }

    const intervals = buildIntervals();
    let elapsed = 0;

    intervals.forEach((duration, k) => {
      elapsed += duration;
      const id = window.setTimeout(() => {
        setStepMs(duration);
        setCenter(3 + k);
        if (sound) playTick(Math.max(0.35, 1 - k / TICKS));
      }, elapsed);
      timers.current.push(id);
    });

    const settle = window.setTimeout(() => {
      setWinner(chosen);
      setPhase("landed");
      setDrawn((prev) => (prev.includes(chosen.id) ? prev : [...prev, chosen.id]));
      setConfettiRun((n) => n + 1);
      setShowConfetti(true);
      if (confettiTimer.current) window.clearTimeout(confettiTimer.current);
      confettiTimer.current = window.setTimeout(() => setShowConfetti(false), 4600);
      if (sound) playReveal();
    }, elapsed + 40);
    timers.current.push(settle);
  }, [clearTimers, noRepeat, phase, poolStudents, remaining, sound]);

  const resetRound = () => {
    clearTimers();
    setDrawn([]);
    setPhase("idle");
    setWinner(null);
    setCenter(2);
    setStepMs(0);
    setAwarded(0);
  };

  const winnerCount = winner ? countOf(winner.id) : 0;
  const rowH = "clamp(62px, 9.5vh, 96px)";

  return (
    <div
      className="on-stage relative flex min-h-[100dvh] flex-col"
      style={{ background: "var(--color-stage)", color: "var(--color-stage-ink)" }}
    >
      <div className="grid-stage pointer-events-none absolute inset-0" aria-hidden="true" />
      {showConfetti ? <Confetti runId={confettiRun} /> : null}

      {/* 顶栏 */}
      <header className="relative z-20 flex items-center gap-2 px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13.5px] font-bold transition-colors"
          style={{ background: "var(--color-stage-2)", color: "var(--color-stage-mute)" }}
        >
          <ArrowLeft size={16} />
          名单
        </button>

        <span className="ml-1 text-[14px] font-extrabold tracking-tight">点名台</span>

        <div className="ml-auto flex items-center gap-2">
          {noRepeat ? (
            <span
              className="hidden rounded-full px-3 py-1.5 font-mono text-[12px] font-bold sm:inline-block"
              style={{ background: "var(--color-stage-2)", color: "var(--color-stage-mute)" }}
            >
              本轮 {drawn.length}/{poolStudents.length}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setNoRepeat((v) => !v)}
            aria-pressed={noRepeat}
            title="本轮不重复点同一个人"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-bold transition-colors"
            style={{
              background: noRepeat ? "var(--color-gold)" : "var(--color-stage-2)",
              color: noRepeat ? "#3a2606" : "var(--color-stage-mute)",
            }}
          >
            <Repeat2 size={15} />
            不重复
          </button>
          <button
            type="button"
            onClick={() => setSound((v) => !v)}
            aria-pressed={sound}
            title={sound ? "关闭声音" : "打开声音"}
            className="grid h-9 w-9 place-items-center rounded-full transition-colors"
            style={{ background: "var(--color-stage-2)", color: "var(--color-stage-mute)" }}
          >
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {drawn.length > 0 ? (
            <button
              type="button"
              onClick={resetRound}
              title="清空本轮记录"
              className="grid h-9 w-9 place-items-center rounded-full transition-colors"
              style={{ background: "var(--color-stage-2)", color: "var(--color-stage-mute)" }}
            >
              <RotateCcw size={16} />
            </button>
          ) : null}
        </div>
      </header>

      {/* 组别筛选 */}
      <div className="relative z-20 flex flex-wrap items-center gap-2 px-4 pb-2 sm:px-6">
        {[{ value: 0, label: "全部" }, ...GROUPS.map((g) => ({ value: g, label: GROUP_LABELS[g] }))].map(
          (item) => {
            const active = pool === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setPool(item.value)}
                aria-pressed={active}
                className="rounded-full px-3.5 py-2 text-[13px] font-bold transition-colors"
                style={{
                  background: active ? "var(--color-paper)" : "var(--color-stage-2)",
                  color: active ? "var(--color-ink)" : "var(--color-stage-mute)",
                }}
              >
                {item.label}
              </button>
            );
          },
        )}
        <span className="ml-auto font-mono text-[12px] font-bold" style={{ color: "var(--color-stage-mute)" }}>
          {poolStudents.length} 人
        </span>
      </div>

      {/* 舞台 */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-4 sm:px-6">
        <div
          className="w-full max-w-[720px]"
          style={{ "--row-h": rowH } as React.CSSProperties}
        >
          {phase === "landed" && winner ? (
            <div className="flex flex-col items-center text-center">
              <span
                className="rounded-full px-3.5 py-1.5 text-[12.5px] font-bold"
                style={{ background: "var(--color-stage-2)", color: "var(--color-stage-mute)" }}
              >
                {GROUP_LABELS[winner.group]} · {studentNoLabel(winner)} 号
              </span>

              <h2
                className="landed-name mt-5 font-extrabold leading-none tracking-tight"
                style={{
                  fontSize: "clamp(56px, 13vw, 132px)",
                  letterSpacing: "0.02em",
                }}
              >
                {winner.name}
              </h2>

              <div className="mt-9 flex flex-col items-center gap-3">
                <HeartControl
                  name={winner.name}
                  count={winnerCount}
                  filled={awarded > 0}
                  size={44}
                  layout="stack"
                  tone="dark"
                  onAdd={() => {
                    void addHeart(winner.id);
                    setAwarded((n) => n + 1);
                  }}
                  onUndo={() => {
                    void undoHeart(winner.id);
                    setAwarded((n) => Math.max(0, n - 1));
                  }}
                />
                <p className="text-[13.5px] font-semibold" style={{ color: "var(--color-stage-mute)" }}>
                  {awarded > 0 ? `本次已记 ${awarded} 颗` : "点一下红心，给他记一颗"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="reel-mask relative w-full overflow-hidden" style={{ height: "calc(var(--row-h) * 3)" }}>
                <div
                  className="reel-strip"
                  style={{
                    transform: `translate3d(0, calc(var(--row-h) * ${-(center - 1)}), 0)`,
                    transitionDuration: `${stepMs}ms`,
                  }}
                >
                  {strip.map((student, index) => {
                    const isCenter = index === center;
                    return (
                      <div
                        key={`${student.id}-${index}`}
                        className="reel-row"
                        data-center={isCenter}
                        style={{
                          height: "var(--row-h)",
                          fontSize: isCenter
                            ? "clamp(34px, 7.4vw, 76px)"
                            : "clamp(20px, 3.4vw, 34px)",
                        }}
                      >
                        {student.name}
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="mt-7 text-[13.5px] font-semibold" style={{ color: "var(--color-stage-mute)" }}>
                {phase === "rolling" ? "正在抽取…" : "准备好就开始"}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* 主按钮 */}
      <footer className="relative z-20 flex flex-col items-center gap-3 px-4 pb-8 sm:px-6">
        <button
          type="button"
          onClick={roll}
          disabled={phase === "rolling" || !ready || poolStudents.length === 0}
          className="press inline-flex w-full max-w-[440px] items-center justify-center gap-2.5 rounded-[18px] px-6 text-[16.5px] font-extrabold text-white transition-opacity disabled:opacity-45"
          style={{ background: "var(--color-brand)", paddingTop: 18, paddingBottom: 18 }}
        >
          <Sparkles size={19} />
          {phase === "rolling" ? "抽取中" : phase === "landed" ? "再点一个" : "开始点名"}
        </button>

        {noRepeat && phase !== "rolling" && remaining.length === 0 && poolStudents.length > 0 ? (
          <p className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--color-gold)" }}>
            <Heart size={13} fill="currentColor" strokeWidth={0} />
            这一轮全班都点过了，再点一次会重新开始
          </p>
        ) : null}
      </footer>
    </div>
  );
}
