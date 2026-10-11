import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CloudConfig } from "./types";

let cachedClient: SupabaseClient | null = null;
let cachedKey = "";

/** 同一个 Supabase 配置只建一个客户端；换配置时重建。 */
export function getClient(config: CloudConfig | null): SupabaseClient | null {
  if (!config) return null;
  const key = `${config.url}|${config.anonKey}`;
  if (cachedClient && cachedKey === key) return cachedClient;

  cachedClient = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  cachedKey = key;
  return cachedClient;
}
