import { useEffect, useState } from "react";
import { Check, Copy, Cloud, CloudOff, Database, Lock, X } from "lucide-react";
import schemaSql from "../../supabase/schema.sql?raw";
import { hasEnvConfig } from "../lib/config";
import { useStore } from "../lib/store";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CloudSettings({ open, onClose }: Props) {
  const { cloudConfig, applyCloudConfig, mode } = useStore();
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const fixedByBuild = hasEnvConfig();

  useEffect(() => {
    if (open) {
      setUrl(cloudConfig?.url ?? "");
      setKey(cloudConfig?.anonKey ?? "");
      setCopied(false);
    }
  }, [open, cloudConfig]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(schemaSql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(23,18,28,0.55)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="云端同步设置"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="card rise-in max-h-[88vh] w-full max-w-[560px] overflow-y-auto thin-scroll p-6 shadow-[0_24px_70px_rgba(23,18,28,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-extrabold tracking-tight">云端同步</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              填上 Supabase 的地址与 anon key，红心就会实时同步到手机和电脑。
            </p>
          </div>
          <button type="button" className="pill !px-2.5 !py-2" onClick={onClose} aria-label="关闭">
            <X size={16} />
          </button>
        </div>

        <div
          className="mt-4 flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold"
          style={{
            background: mode === "cloud" ? "#e7f6ee" : "#f1eff4",
            color: mode === "cloud" ? "#186b48" : "var(--color-ink-2)",
          }}
        >
          {mode === "cloud" ? <Cloud size={16} /> : <CloudOff size={16} />}
          {mode === "cloud" ? "已连接云端" : "当前是本机模式，数据只存在这台电脑上"}
        </div>

        {fixedByBuild ? (
          <div className="mt-4 rounded-[12px] border border-line bg-canvas p-3.5">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink-2">
              <Lock size={14} />
              已由构建配置固定
            </p>
            <p className="mt-2 font-mono text-[12px] break-all text-ink-2">
              {cloudConfig?.url ?? "（未读到 URL）"}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
              手机和电脑连的是同一个 Supabase，这样扫码才能同步。要换项目请改构建时的
              VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 后重新部署。
            </p>
          </div>
        ) : (
          <>
            <label className="mt-5 block text-[13px] font-bold text-ink-2" htmlFor="sb-url">
              Project URL
            </label>
            <input
              id="sb-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://xxxxxxxx.supabase.co"
              spellCheck={false}
              className="mt-2 w-full rounded-[12px] border border-line bg-canvas px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-brand focus:bg-paper"
            />

            <label className="mt-4 block text-[13px] font-bold text-ink-2" htmlFor="sb-key">
              anon public key
            </label>
            <textarea
              id="sb-key"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="eyJhbGciOi..."
              spellCheck={false}
              rows={3}
              className="mt-2 w-full resize-none rounded-[12px] border border-line bg-canvas px-3.5 py-2.5 font-mono text-[12.5px] leading-relaxed outline-none transition-colors focus:border-brand focus:bg-paper"
            />
          </>
        )}

        <button
          type="button"
          onClick={() => setShowSql((value) => !value)}
          className="mt-4 inline-flex items-center gap-2 text-[13px] font-bold text-ink-2 hover:text-ink"
        >
          <Database size={15} />
          {showSql ? "收起建表语句" : "第一次使用？点这里看建表语句"}
        </button>

        {showSql ? (
          <div className="mt-3 rounded-[12px] border border-line bg-canvas p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12px] font-bold text-ink-3">Supabase SQL Editor</span>
              <button
                type="button"
                onClick={copySql}
                className="pill !px-2.5 !py-1.5 !text-[12px]"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "已复制" : "复制"}
              </button>
            </div>
            <pre className="thin-scroll mt-2 max-h-[220px] overflow-auto font-mono text-[11.5px] leading-relaxed text-ink-2">
              {schemaSql}
            </pre>
          </div>
        ) : null}

        {fixedByBuild ? null : (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (!url.trim() || !key.trim()) return;
              applyCloudConfig({ url: url.trim(), anonKey: key.trim() });
              onClose();
            }}
            disabled={!url.trim() || !key.trim()}
            className="press inline-flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[14px] font-bold text-white transition-opacity disabled:opacity-40"
            style={{ background: "var(--color-brand)" }}
          >
            <Cloud size={16} />
            保存并连接
          </button>
          {cloudConfig ? (
            <button
              type="button"
              onClick={() => {
                applyCloudConfig(null);
                onClose();
              }}
              className="pill"
            >
              断开云端
            </button>
          ) : null}
        </div>
        )}
      </div>
    </div>
  );
}
