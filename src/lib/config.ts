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

/** 环境变量优先，其次是在设置面板里保存到本机的配置。 */
export function loadCloudConfig(): CloudConfig | null {
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
  return readEnvConfig();
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
