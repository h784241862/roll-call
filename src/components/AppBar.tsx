import { Heart, Lock, Settings, Sparkles, Trophy, Users } from "lucide-react";
import { navigate } from "../lib/router";
import { useStore } from "../lib/store";

interface Props {
  current: string;
  onOpenSettings: () => void;
  onLock: () => void;
}

const NAV = [
  { path: "/", label: "名单", icon: Users },
  { path: "/draw", label: "点名", icon: Sparkles },
  { path: "/board", label: "红心榜", icon: Trophy },
] as const;

export function AppBar({ current, onOpenSettings, onLock }: Props) {
  const { mode, hearts } = useStore();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex shrink-0 items-center gap-2.5"
          aria-label="回到名单"
        >
          <span
            className="grid h-9 w-9 place-items-center rounded-[12px] text-white"
            style={{ background: "var(--color-brand)" }}
          >
            <Heart size={18} fill="currentColor" strokeWidth={0} />
          </span>
          <span className="hidden text-[17px] font-extrabold tracking-tight sm:block">
            2505 点名台
          </span>
        </button>

        <nav className="ml-1 flex items-center gap-1 rounded-full bg-canvas p-1 sm:ml-4">
          {NAV.map((item) => {
            const active = current === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                aria-current={active ? "page" : undefined}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13.5px] font-bold transition-colors sm:px-4"
                style={{
                  background: active ? "var(--color-paper)" : "transparent",
                  color: active ? "var(--color-ink)" : "var(--color-ink-2)",
                  boxShadow: active ? "0 1px 3px rgba(26,22,32,0.10)" : "none",
                }}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold lg:inline-flex"
            title={mode === "cloud" ? "红心实时同步到云端" : "数据只保存在这台电脑上"}
            style={{
              background: mode === "cloud" ? "#e7f6ee" : "#f1eff4",
              color: mode === "cloud" ? "#186b48" : "var(--color-ink-2)",
            }}
          >
            <span
              className="pulse-dot inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: mode === "cloud" ? "#1c9c68" : "var(--color-ink-3)" }}
            />
            {mode === "cloud" ? "云端" : "本机"}
            {hearts.length > 0 ? ` · ${hearts.length} 颗` : ""}
          </span>

          <button
            type="button"
            className="pill !px-3 !py-2"
            onClick={onOpenSettings}
            aria-label="云端同步设置"
            title="云端同步设置"
          >
            <Settings size={16} />
          </button>
          <button
            type="button"
            className="pill !px-3 !py-2"
            onClick={onLock}
            aria-label="锁定点名台"
            title="锁定点名台"
          >
            <Lock size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
