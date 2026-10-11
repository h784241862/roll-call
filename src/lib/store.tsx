import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadCloudConfig, saveCloudConfig } from "./config";
import { errorText } from "./errors";
import { getClient } from "./supabase";
import type { CloudConfig, HeartRecord, SyncMode } from "./types";

const HEARTS_KEY = "rc:hearts:v1";

/* ------------------------------------------------------------------ */
/* 本地适配器（未配置云端时使用，数据存在浏览器里）                    */
/* ------------------------------------------------------------------ */

const bus = new EventTarget();

function readLocalHearts(): HeartRecord[] {
  try {
    const raw = localStorage.getItem(HEARTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is HeartRecord =>
        !!item &&
        typeof item === "object" &&
        typeof (item as HeartRecord).id === "string" &&
        typeof (item as HeartRecord).studentId === "string",
    );
  } catch {
    return [];
  }
}

function writeLocalHearts(records: HeartRecord[]): void {
  try {
    localStorage.setItem(HEARTS_KEY, JSON.stringify(records));
  } catch {
    /* 存不下就算了 */
  }
  bus.dispatchEvent(new Event("change"));
}

function newLocalId(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ */
/* 统一的数据源接口                                                     */
/* ------------------------------------------------------------------ */

interface HeartsSource {
  readonly mode: SyncMode;
  load(): Promise<HeartRecord[]>;
  add(studentId: string): Promise<HeartRecord>;
  remove(record: HeartRecord): Promise<void>;
  subscribe(onChange: () => void): () => void;
}

function localSource(): HeartsSource {
  return {
    mode: "local",
    async load() {
      return readLocalHearts();
    },
    async add(studentId) {
      const record: HeartRecord = { id: newLocalId(), studentId, createdAt: Date.now() };
      writeLocalHearts([...readLocalHearts(), record]);
      return record;
    },
    async remove(record) {
      writeLocalHearts(readLocalHearts().filter((r) => r.id !== record.id));
    },
    subscribe(onChange) {
      const onBus = () => onChange();
      const onStorage = (event: StorageEvent) => {
        if (event.key === HEARTS_KEY) onChange();
      };
      bus.addEventListener("change", onBus);
      window.addEventListener("storage", onStorage);
      return () => {
        bus.removeEventListener("change", onBus);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}

interface HeartRow {
  id: string;
  student_id: string;
  created_at: string;
}

function rowToRecord(row: HeartRow): HeartRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function cloudSource(config: CloudConfig): HeartsSource {
  const client = getClient(config);
  if (!client) throw new Error("Supabase 客户端创建失败");

  return {
    mode: "cloud",
    async load() {
      const { data, error } = await client
        .from("hearts")
        .select("id, student_id, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as HeartRow[]).map(rowToRecord);
    },
    async add(studentId) {
      const { data, error } = await client
        .from("hearts")
        .insert({ student_id: studentId })
        .select("id, student_id, created_at")
        .single();
      if (error) throw error;
      return rowToRecord(data as HeartRow);
    },
    async remove(record) {
      const { error } = await client.from("hearts").delete().eq("id", record.id);
      if (error) throw error;
    },
    subscribe(onChange) {
      const channel = client
        .channel("hearts-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "hearts" }, () => {
          onChange();
        })
        .subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/* React 层                                                            */
/* ------------------------------------------------------------------ */

export interface StoreValue {
  mode: SyncMode;
  cloudConfig: CloudConfig | null;
  ready: boolean;
  error: string | null;
  hearts: HeartRecord[];
  counts: ReadonlyMap<string, number>;
  countOf(studentId: string): number;
  lastHeartOf(studentId: string): HeartRecord | undefined;
  addHeart(studentId: string): Promise<void>;
  undoHeart(studentId: string): Promise<void>;
  applyCloudConfig(config: CloudConfig | null): void;
  reload(): void;
}

const StoreContext = createContext<StoreValue | null>(null);

function mergeRecords(current: HeartRecord[], incoming: HeartRecord[]): HeartRecord[] {
  const map = new Map<string, HeartRecord>();
  for (const record of current) map.set(record.id, record);
  for (const record of incoming) map.set(record.id, record);
  return [...map.values()].sort((a, b) => a.createdAt - b.createdAt);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cloudConfig, setCloudConfig] = useState<CloudConfig | null>(() => loadCloudConfig());
  const [hearts, setHearts] = useState<HeartRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const sourceRef = useRef<HeartsSource>(localSource());

  useEffect(() => {
    let cancelled = false;
    let source: HeartsSource;

    try {
      source = cloudConfig ? cloudSource(cloudConfig) : localSource();
    } catch (err) {
      setError(errorText(err));
      source = localSource();
    }

    sourceRef.current = source;
    setReady(false);
    setError(null);

    const apply = async () => {
      try {
        const records = await source.load();
        if (!cancelled) {
          setHearts(records);
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(errorText(err));
          setReady(true);
        }
      }
    };

    void apply();
    const unsubscribe = source.subscribe(() => {
      void apply();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [cloudConfig, reloadToken]);

  const addHeart = useCallback(async (studentId: string) => {
    const source = sourceRef.current;
    const record = await source.add(studentId);
    setHearts((prev) => mergeRecords(prev, [record]));
  }, []);

  const heartsRef = useRef<HeartRecord[]>(hearts);
  useEffect(() => {
    heartsRef.current = hearts;
  }, [hearts]);

  const undoHeart = useCallback(async (studentId: string) => {
    const source = sourceRef.current;
    const owned = [...heartsRef.current]
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => b.createdAt - a.createdAt);
    const target = owned[0];
    if (!target) return;
    setHearts((prev) => prev.filter((r) => r.id !== target.id));
    try {
      await source.remove(target);
    } catch (err) {
      setHearts((prev) => mergeRecords(prev, [target]));
      setError(errorText(err));
    }
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const record of hearts) {
      map.set(record.studentId, (map.get(record.studentId) ?? 0) + 1);
    }
    return map;
  }, [hearts]);

  const lastHeartOf = useCallback(
    (studentId: string) => {
      let found: HeartRecord | undefined;
      for (const record of hearts) {
        if (record.studentId !== studentId) continue;
        if (!found || record.createdAt > found.createdAt) found = record;
      }
      return found;
    },
    [hearts],
  );

  const applyCloudConfig = useCallback((config: CloudConfig | null) => {
    saveCloudConfig(config);
    setCloudConfig(config);
  }, []);

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      mode: cloudConfig ? "cloud" : "local",
      cloudConfig,
      ready,
      error,
      hearts,
      counts,
      countOf: (studentId: string) => counts.get(studentId) ?? 0,
      lastHeartOf,
      addHeart,
      undoHeart,
      applyCloudConfig,
      reload,
    }),
    [
      cloudConfig,
      ready,
      error,
      hearts,
      counts,
      lastHeartOf,
      addHeart,
      undoHeart,
      applyCloudConfig,
      reload,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore 必须在 StoreProvider 内使用");
  return value;
}
