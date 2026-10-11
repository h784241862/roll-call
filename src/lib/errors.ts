/** Supabase 抛的是普通对象，直接 String() 会变成 [object Object]。 */
export function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const record = error as { message?: unknown; error_description?: unknown; details?: unknown };
    for (const value of [record.message, record.error_description, record.details]) {
      if (typeof value === "string" && value.trim()) return value;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return "未知错误";
    }
  }
  if (typeof error === "string" && error.trim()) return error;
  return "未知错误";
}
