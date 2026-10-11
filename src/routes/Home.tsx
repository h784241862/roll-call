import { useMemo, useState } from "react";
import { Heart, Search, Sparkles, X } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { HeartControl } from "../components/HeartButton";
import { CLASS_NO, GROUPS, GROUP_LABELS, ROSTER, studentNoLabel, studentsOfGroup } from "../data/roster";
import { navigate } from "../lib/router";
import { searchStudents } from "../lib/search";
import { useStore } from "../lib/store";
import type { Student } from "../lib/types";

function StudentCard({ student }: { student: Student }) {
  const { countOf, addHeart, undoHeart } = useStore();
  const count = countOf(student.id);

  return (
    <div className="card flex items-center gap-3 p-3 transition-shadow hover:shadow-[0_6px_20px_rgba(26,22,32,0.07)]">
      <Avatar id={student.id} name={student.name} size={42} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15.5px] font-extrabold leading-tight">{student.name}</p>
        <p className="mt-0.5 font-mono text-[11.5px] text-ink-3">{studentNoLabel(student)}</p>
      </div>
      <HeartControl
        name={student.name}
        count={count}
        size={24}
        onAdd={() => void addHeart(student.id)}
        onUndo={() => void undoHeart(student.id)}
      />
    </div>
  );
}

function SkeletonCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card flex items-center gap-3 p-3">
          <span className="h-[42px] w-[42px] shrink-0 animate-pulse rounded-[14px] bg-canvas" />
          <span className="flex-1 space-y-2">
            <span className="block h-3.5 w-20 animate-pulse rounded bg-canvas" />
            <span className="block h-2.5 w-10 animate-pulse rounded bg-canvas" />
          </span>
        </div>
      ))}
    </>
  );
}

export function Home() {
  const { countOf, hearts, ready, error, mode, addHeart, undoHeart } = useStore();
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchStudents(query, ROSTER), [query]);
  const totalHearts = hearts.length;
  const searching = query.trim().length > 0;

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-7 sm:px-6">
      {/* 概览 + 搜索 */}
      <section className="rise-in">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-[12px] font-bold tracking-[0.18em] text-ink-3">
              CLASS {CLASS_NO}
            </p>
            <h1 className="mt-2 text-[30px] leading-[1.12] font-extrabold tracking-tight sm:text-[38px]">
              全班 {ROSTER.length} 人，四组
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="card flex items-center gap-3 px-4 py-3">
              <Heart size={18} fill="currentColor" strokeWidth={0} style={{ color: "var(--color-brand)" }} />
              <span className="text-[22px] font-extrabold tabular-nums leading-none">{totalHearts}</span>
              <span className="text-[12.5px] font-semibold text-ink-3">颗红心</span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/draw")}
              className="press inline-flex items-center gap-2 rounded-[14px] px-4 py-3.5 text-[14.5px] font-bold text-white"
              style={{ background: "var(--color-ink)" }}
            >
              <Sparkles size={17} />
              去点名
            </button>
          </div>
        </div>

        <div className="relative mt-7">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜名字，或者只搜学号数字，例如 3"
            aria-label="搜索学生"
            className="w-full rounded-[16px] border border-line bg-paper py-4 pl-12 pr-12 text-[15.5px] outline-none transition-colors focus:border-brand"
          />
          {searching ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-3 hover:bg-canvas hover:text-ink"
              aria-label="清空搜索"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </section>

      {error ? (
        <p className="mt-5 rounded-[14px] bg-[#fdecef] px-4 py-3 text-[13.5px] font-semibold text-[#9f1239]">
          同步出错：{error}
        </p>
      ) : null}

      {/* 搜索结果 */}
      {searching ? (
        <section className="mt-7">
          <h2 className="text-[13px] font-bold tracking-wide text-ink-3">
            {results.length > 0 ? `找到 ${results.length} 位学生` : "没有找到这个学生"}
          </h2>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((student) => {
              const count = countOf(student.id);
              return (
                <div
                  key={student.id}
                  className="card flex items-center gap-3.5 p-3.5"
                  style={{ borderColor: "var(--color-line-2)" }}
                >
                  <Avatar id={student.id} name={student.name} size={46} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-extrabold leading-tight">{student.name}</p>
                    <p className="mt-1 flex items-center gap-2 text-[12px] text-ink-3">
                      <span className="font-mono">{studentNoLabel(student)}</span>
                      <span className="text-line-2">|</span>
                      <span className="font-semibold">{GROUP_LABELS[student.group]}</span>
                    </p>
                  </div>
                  <HeartControl
                    name={student.name}
                    count={count}
                    size={26}
                    layout="stack"
                    onAdd={() => void addHeart(student.id)}
                    onUndo={() => void undoHeart(student.id)}
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        /* 分组名单 */
        <div className="mt-10 space-y-11">
          {GROUPS.map((group) => {
            const students = studentsOfGroup(group);
            const groupHearts = students.reduce((sum, s) => sum + countOf(s.id), 0);
            return (
              <section key={group} className="rise-in" style={{ animationDelay: `${group * 40}ms` }}>
                <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5 border-b border-line pb-3">
                  <h2 className="text-[19px] font-extrabold tracking-tight">{GROUP_LABELS[group]}</h2>
                  <span className="text-[13px] font-semibold text-ink-3">{students.length} 人</span>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-bold text-ink-2">
                    <Heart size={14} fill="currentColor" strokeWidth={0} style={{ color: "var(--color-brand)" }} />
                    {groupHearts}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {ready
                    ? students.map((student) => <StudentCard key={student.id} student={student} />)
                    : <SkeletonCards count={students.length} />}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {!ready && mode === "cloud" ? (
        <p className="mt-8 text-center text-[13px] font-semibold text-ink-3">正在同步云端红心…</p>
      ) : null}
    </div>
  );
}
