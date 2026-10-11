import { useMemo, useState } from "react";
import { Heart, Trophy } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { HeartControl } from "../components/HeartButton";
import { GROUPS, GROUP_LABELS, ROSTER, studentNoLabel, studentsOfGroup } from "../data/roster";
import { useStore } from "../lib/store";
import type { Student } from "../lib/types";

const MEDALS = ["#e0a41c", "#9aa3ae", "#c08457"];

interface Row {
  student: Student;
  count: number;
  rank: number;
}

function buildRows(students: Student[], countOf: (id: string) => number): Row[] {
  const sorted = [...students].sort(
    (a, b) => countOf(b.id) - countOf(a.id) || a.no - b.no,
  );
  let rank = 0;
  let previous = Number.NaN;
  return sorted.map((student, index) => {
    const count = countOf(student.id);
    if (count !== previous) {
      rank = index + 1;
      previous = count;
    }
    return { student, count, rank };
  });
}

export function Board() {
  const { countOf, hearts, ready, addHeart, undoHeart } = useStore();
  const [scope, setScope] = useState(0);
  const [onlyScored, setOnlyScored] = useState(false);

  const students = useMemo(
    () => (scope === 0 ? ROSTER : studentsOfGroup(scope)),
    [scope],
  );

  const rows = useMemo(() => buildRows(students, countOf), [students, countOf]);
  const visible = onlyScored ? rows.filter((row) => row.count > 0) : rows;
  const max = Math.max(1, ...rows.map((row) => row.count));
  const top = rows[0];

  return (
    <div className="mx-auto max-w-[1000px] px-4 pb-24 pt-7 sm:px-6">
      <section className="rise-in">
        <p className="font-mono text-[12px] font-bold tracking-[0.18em] text-ink-3">HEART BOARD</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-[30px] leading-[1.12] font-extrabold tracking-tight sm:text-[38px]">
            红心榜
          </h1>
          {top && top.count > 0 ? (
            <div className="card flex items-center gap-3 px-4 py-3">
              <Trophy size={18} style={{ color: MEDALS[0] }} />
              <span className="text-[13.5px] font-bold">
                {top.student.name}
              </span>
              <span className="text-[12.5px] font-semibold text-ink-3">
                领先，{top.count} 颗
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {[{ value: 0, label: "全部" }, ...GROUPS.map((g) => ({ value: g, label: GROUP_LABELS[g] }))].map(
            (item) => (
              <button
                key={item.value}
                type="button"
                className="pill"
                data-active={scope === item.value}
                onClick={() => setScope(item.value)}
              >
                {item.label}
              </button>
            ),
          )}
          <button
            type="button"
            className="pill ml-auto"
            data-active={onlyScored}
            onClick={() => setOnlyScored((value) => !value)}
            aria-pressed={onlyScored}
          >
            <Heart size={13} fill={onlyScored ? "currentColor" : "none"} strokeWidth={2} />
            只看有红心的
          </button>
        </div>
      </section>

      <section className="mt-6 space-y-2.5">
        {!ready
          ? Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="card flex items-center gap-4 p-4">
                <span className="h-8 w-8 animate-pulse rounded-full bg-canvas" />
                <span className="h-[42px] w-[42px] animate-pulse rounded-[14px] bg-canvas" />
                <span className="h-4 flex-1 animate-pulse rounded bg-canvas" />
              </div>
            ))
          : visible.map(({ student, count, rank }) => (
              <div
                key={student.id}
                className="card flex items-center gap-3.5 p-3.5 transition-shadow hover:shadow-[0_6px_20px_rgba(26,22,32,0.07)] sm:gap-4 sm:p-4"
              >
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[13.5px] font-extrabold tabular-nums"
                  style={{
                    background: rank <= 3 && count > 0 ? MEDALS[rank - 1] : "var(--color-canvas)",
                    color: rank <= 3 && count > 0 ? "#fff" : "var(--color-ink-3)",
                  }}
                >
                  {count > 0 ? rank : "–"}
                </span>

                <Avatar id={student.id} name={student.name} size={42} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2.5">
                    <p className="truncate text-[15.5px] font-extrabold leading-tight">
                      {student.name}
                    </p>
                    <span className="shrink-0 font-mono text-[11.5px] text-ink-3">
                      {studentNoLabel(student)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="meter flex-1">
                      <span style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <span className="w-[46px] shrink-0 text-right text-[12.5px] font-bold tabular-nums text-ink-2">
                      {count} 颗
                    </span>
                  </div>
                </div>

                <HeartControl
                  name={student.name}
                  count={count}
                  size={24}
                  onAdd={() => void addHeart(student.id)}
                  onUndo={() => void undoHeart(student.id)}
                />
              </div>
            ))}

        {ready && visible.length === 0 ? (
          <div className="card grid place-items-center px-6 py-16 text-center">
            <span
              className="grid h-14 w-14 place-items-center rounded-full"
              style={{ background: "var(--color-brand-soft)" }}
            >
              <Heart size={24} strokeWidth={2} style={{ color: "var(--color-brand)" }} />
            </span>
            <p className="mt-4 text-[16px] font-extrabold">还没有人拿到红心</p>
            <p className="mt-1.5 max-w-[34ch] text-[13.5px] leading-relaxed text-ink-2">
              上课表现好的时候，在名单或搜索结果里点一下红心，这里就会排出来。
            </p>
          </div>
        ) : null}
      </section>

      {hearts.length > 0 ? (
        <p className="mt-8 text-center text-[12.5px] font-semibold text-ink-3">
          全班共 {hearts.length} 颗红心
        </p>
      ) : null}
    </div>
  );
}
