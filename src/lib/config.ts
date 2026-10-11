import type { CloudConfig } from "./types";

const CLOUD_KEY = "rc:cloud:v1";

function readEnvConfig(): CloudConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (typeof url === "string" && typeof anonKey === "string" && url && anonKey) {
    return { url, anonKey };
  }
  return null;
}

/**
 * 构建时的环境变量优先。
 *
 * 这一点很关键：手机扫码打开的是另一个浏览器，它读不到电脑上存的设置，
 * 所以线上必须靠构建时注入的配置，两端才会连到同一个 Supabase。
 * 本机手填的设置只在开发调试时兜底。
 */
export function loadCloudConfig(): CloudConfig | null {
  const fromEnv = readEnvConfig();
  if (fromEnv) return fromEnv;

  try {
    const raw = localStorage.getItem(CLOUD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CloudConfig>;
      if (
        typeof parsed.url === "string" &&
        typeof parsed.anonKey === "string" &&
        parsed.url.trim() &&
        parsed.anonKey.trim()
      ) {
        return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
      }
    }
  } catch {
    /* 坏数据按未配置处理 */
  }
  return null;
}

/** 构建时是否已经固定了配置。固定之后设置面板变成只读。 */
export function hasEnvConfig(): boolean {
  return readEnvConfig() !== null;
}

export function saveCloudConfig(config: CloudConfig | null): void {
  try {
    if (!config) {
      localStorage.removeItem(CLOUD_KEY);
    } else {
      localStorage.setItem(
        CLOUD_KEY,
        JSON.stringify({ url: config.url.trim(), anonKey: config.anonKey.trim() }),
      );
    }
  } catch {
    /* 隐私模式下写不进去，忽略 */
  }
}

export function hasCloudConfig(): boolean {
  return loadCloudConfig() !== null;
}
