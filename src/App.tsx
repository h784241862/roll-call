import { useCallback, useState } from "react";
import { AppBar } from "./components/AppBar";
import { CloudSettings } from "./components/CloudSettings";
import { isUnlocked, lockNow } from "./lib/gate";
import { navigate, useRoute } from "./lib/router";
import { Board } from "./routes/Board";
import { Draw } from "./routes/Draw";
import { Gate } from "./routes/Gate";
import { Home } from "./routes/Home";
import { PhoneGate } from "./routes/PhoneGate";

export function App() {
  const route = useRoute();
  const [unlocked, setUnlocked] = useState(() => isUnlocked());
  const [settingsOpen, setSettingsOpen] = useState(false);

  const lock = useCallback(() => {
    lockNow();
    setUnlocked(false);
  }, []);

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  // 手机端页面：扫码后打开的是这个路由
  const sessionId = route.params.get("s");
  if (route.path === "/gate" && sessionId) {
    return (
      <>
        <PhoneGate sessionId={sessionId} />
        <CloudSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </>
    );
  }

  if (!unlocked) {
    return (
      <>
        <Gate onUnlocked={() => setUnlocked(true)} onOpenSettings={openSettings} />
        <CloudSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </>
    );
  }

  // 点名页是独立的全屏舞台，不套用浅色导航
  if (route.path === "/draw") {
    return (
      <>
        <Draw />
        <CloudSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </>
    );
  }

  const path = route.path === "/board" ? "/board" : "/";

  return (
    <div className="min-h-[100dvh]">
      <AppBar current={path} onOpenSettings={openSettings} onLock={lock} />
      {path === "/board" ? <Board /> : <Home />}
      <CloudSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {route.path !== "/" && route.path !== "/board" ? (
        <button
          type="button"
          onClick={() => navigate("/")}
          className="fixed bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full px-4 py-2.5 text-[13px] font-bold text-white shadow-lg"
          style={{ background: "var(--color-ink)" }}
        >
          回到名单
        </button>
      ) : null}
    </div>
  );
}
