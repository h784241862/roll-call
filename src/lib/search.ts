import type { Student } from "./types";

/**
 * 按姓名 / 学号搜索。
 *
 * 学号匹配会忽略前导零：搜 `3` 时 `03`（陈立轩）排在第一位，
 * 之后才是 30 到 39 号；搜 `250503`、`03` 也能命中。
 */
export function searchStudents(query: string, pool: Student[], limit = 12): Student[] {
  const q = query.trim();
  if (!q) return [];

  const lower = q.toLowerCase();
  const digits = q.replace(/\D/g, "");
  const digitValue = digits ? Number(digits) : NaN;

  const scored: Array<{ student: Student; score: number }> = [];

  for (const student of pool) {
    let score = 0;

    if (student.name === q) score = Math.max(score, 120);
    else if (student.name.startsWith(q)) score = Math.max(score, 100);
    else if (student.name.includes(q)) score = Math.max(score, 80);

    if (digits) {
      if (student.id === digits) score = Math.max(score, 115);
      else if (student.id.includes(digits)) score = Math.max(score, 55);

      if (Number.isFinite(digitValue) && digitValue > 0) {
        if (student.no === digitValue) score = Math.max(score, 110);
        else if (String(student.no).startsWith(String(digitValue))) {
          score = Math.max(score, 50);
        }
      }
    }

    if (score === 0 && student.name.toLowerCase().includes(lower)) {
      score = 60;
    }

    if (score > 0) scored.push({ student, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.student.no - b.student.no)
    .slice(0, limit)
    .map((item) => item.student);
}
