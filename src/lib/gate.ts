import { getClient } from "./supabase";
import type { CloudConfig } from "./types";

export const GATE_PASSWORD = "666";
export type GateStatus = "pending" | "approved";

const LOCAL_PREFIX = "rc:gate:local:";

export interface GateChannel {
  readonly remote: boolean;
  create(id: string): Promise<void>;
  approve(id: string): Promise<void>;
  watch(id: string, onStatus: (status: GateStatus) => void): () => void;
  read(id: string): Promise<GateStatus>;
}

export function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/* ---------------- 本地兜底：同一台设备上用 ---------------- */

function localChannel(): GateChannel {
  return {
    remote: false,
    async create(id) {
      localStorage.setItem(LOCAL_PREFIX + id, "pending");
    },
    async approve(id) {
      localStorage.setItem(LOCAL_PREFIX + id, "approved");
      window.dispatchEvent(new StorageEvent("storage", { key: LOCAL_PREFIX + id }));
    },
    watch(id, onStatus) {
      const check = () => {
        if (localStorage.getItem(LOCAL_PREFIX + id) === "approved") onStatus("approved");
      };
      const onStorage = (event: StorageEvent) => {
        if (event.key === LOCAL_PREFIX + id) check();
      };
      window.addEventListener("storage", onStorage);
      check();
      return () => window.removeEventListener("storage", onStorage);
    },
    async read(id) {
      return localStorage.getItem(LOCAL_PREFIX + id) === "approved" ? "approved" : "pending";
    },
  };
}

/* ---------------- 云端：手机扫码真实可用 ---------------- */

interface SessionRow {
  id: string;
  status: GateStatus;
}

function cloudChannel(config: CloudConfig): GateChannel {
  const client = getClient(config);
  if (!client) throw new Error("Supabase client unavailable");

  return {
    remote: true,
    async create(id) {
      const { error } = await client
        .from("login_sessions")
        .upsert({ id, status: "pending" }, { onConflict: "id" });
      if (error) throw error;
    },
    async approve(id) {
      const { error } = await client
        .from("login_sessions")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    watch(id, onStatus) {
      let done = false;
      const fire = () => {
        if (done) return;
        done = true;
        onStatus("approved");
      };
      const look = async () => {
        const { data } = await client
          .from("login_sessions")
          .select("id, status")
          .eq("id", id)
          .maybeSingle();
        if ((data as SessionRow | null)?.status === "approved") fire();
      };

      void look();

      const channel = client
        .channel(`gate-${id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "login_sessions", filter: `id=eq.${id}` },
          (payload) => {
            if ((payload.new as SessionRow | null)?.status === "approved") fire();
          },
        )
        .subscribe();

      // 轮询兜底：少数网络会丢掉 realtime 连接
      const timer = window.setInterval(() => {
        if (!done) void look();
      }, 2500);

      return () => {
        done = true;
        window.clearInterval(timer);
        void client.removeChannel(channel);
      };
    },
    async read(id) {
      const { data } = await client
        .from("login_sessions")
        .select("id, status")
        .eq("id", id)
        .maybeSingle();
      return (data as SessionRow | null)?.status === "approved" ? "approved" : "pending";
    },
  };
}

export function gateChannel(config: CloudConfig | null): GateChannel {
  if (!config) return localChannel();
  try {
    return cloudChannel(config);
  } catch {
    return localChannel();
  }
}

export function checkPassword(input: string): boolean {
  return input.trim() === GATE_PASSWORD;
}

/* ---------------- 电脑端解锁状态 ---------------- */

const PASS_KEY = "rc:gate:pass:v1";
const PASS_TTL = 12 * 60 * 60 * 1000;

export function isUnlocked(): boolean {
  try {
    const raw = localStorage.getItem(PASS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < PASS_TTL;
  } catch {
    return false;
  }
}

export function markUnlocked(): void {
  try {
    localStorage.setItem(PASS_KEY, String(Date.now()));
  } catch {
    /* 忽略 */
  }
}

export function lockNow(): void {
  try {
    localStorage.removeItem(PASS_KEY);
  } catch {
    /* 忽略 */
  }
}
