import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Cloud,
  CloudOff,
  KeyRound,
  Loader2,
  ScanLine,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import {
  ALLOW_DESKTOP_PASSWORD_FALLBACK,
  gateChannel,
  markUnlocked,
  newSessionId,
} from "../lib/gate";
import { errorText } from "../lib/errors";
import { urlFor } from "../lib/router";
import { useStore } from "../lib/store";

interface Props {
  onUnlocked: () => void;
  onOpenSettings: () => void;
}

type Phase = "preparing" | "waiting" | "approved";

export function Gate({ onUnlocked, onOpenSettings }: Props) {
  const { cloudConfig, mode } = useStore();
  const [sessionId] = useState(() => newSessionId());
  const [phase, setPhase] = useState<Phase>("preparing");
  const [qr, setQr] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState("");
  const [manualError, setManualError] = useState(false);
  const [manualNote, setManualNote] = useState<string | null>(null);
  const [manualBusy, setManualBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    markUnlocked();
    setPhase("approved");
    window.setTimeout(onUnlocked, 620);
  }, [onUnlocked]);

  // 生成二维码
  useEffect(() => {
    let alive = true;
    // 二维码库只在需要时加载，别拖慢首屏
    void import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(urlFor(`/gate?s=${sessionId}`), {
          width: 560,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#17121c", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        if (alive) setQr(null);
      });
    return () => {
      alive = false;
    };
  }, [mode, sessionId]);

  // 建立会话并监听手机端的确认
  useEffect(() => {
    let cancelled = false;
    const channel = gateChannel(cloudConfig);

    setPhase("preparing");
    setCreating(true);
    void channel
      .create(sessionId)
      .then(() => {
        if (cancelled) return;
        setCreating(false);
        setPhase("waiting");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCreating(false);
        setPhase("waiting");
        setCreateError(errorText(error));
      });

    const stop = channel.watch(sessionId, (status) => {
      if (!cancelled && status === "approved") finish();
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [mode, cloudConfig, sessionId, finish]);

  useEffect(() => {
    if (showManual) inputRef.current?.focus();
  }, [showManual]);

  const submitManual = async () => {
    if (manualBusy) return;
    setManualBusy(true);
    setManualError(false);
    setManualNote(null);
    try {
      const result = await gateChannel(cloudConfig).submit(sessionId, manual);
      if (result === "ok") {
        finish();
        return;
      }
      if (result === "locked") {
        setManualNote("试错次数太多，这条链接已失效。刷新页面重新生成二维码即可。");
        setManual("");
        return;
      }
      if (result === "missing") {
        setManualNote("这个二维码已经过期或无效。刷新页面重新生成即可。");
        setManual("");
        return;
      }
      setManualError(true);
      setManual("");
      inputRef.current?.focus();
    } catch (error) {
      setManualNote(errorText(error));
    } finally {
      setManualBusy(false);
    }
  };

  const needsCloud = mode !== "cloud";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden" style={{ background: "var(--color-stage)" }}>
      <div className="grid-stage absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto grid min-h-[100dvh] max-w-[1220px] items-center gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-16">
        {/* 左：说明 */}
        <div className="rise-in" style={{ color: "var(--color-stage-ink)" }}>
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 place-items-center rounded-[14px] text-white"
              style={{ background: "var(--color-brand)" }}
            >
              <ScanLine size={21} />
            </span>
            <span
              className="rounded-full px-3 py-1.5 text-[12px] font-bold tracking-wide"
              style={{ background: "var(--color-stage-2)", color: "var(--color-stage-mute)" }}
            >
              2505
            </span>
          </div>

          <h1 className="mt-8 text-[40px] leading-[1.08] font-extrabold tracking-tight sm:text-[54px] lg:text-[62px]">
            扫码通过后
            <br />
            才能开始点名
          </h1>

          <p className="mt-5 max-w-[42ch] text-[15.5px] leading-relaxed" style={{ color: "var(--color-stage-mute)" }}>
            用手机微信扫右边的二维码，在手机上输入口令。手机通过之后，这块屏幕会自动进入点名台。
          </p>

          <ol className="mt-9 space-y-4">
            {[
              { n: "1", t: "手机微信扫一扫", d: "二维码打开的是同一个点名台" },
              { n: "2", t: "在手机上输入口令", d: "口令正确才会放行" },
              { n: "3", t: "电脑屏幕自动解锁", d: "手机上的操作实时同步过来" },
            ].map((step) => (
              <li key={step.n} className="flex items-start gap-3.5">
                <span
                  className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-extrabold"
                  style={{ background: "var(--color-stage-2)", color: "var(--color-gold)" }}
                >
                  {step.n}
                </span>
                <span>
                  <span className="block text-[15px] font-bold">{step.t}</span>
                  <span className="block text-[13.5px]" style={{ color: "var(--color-stage-mute)" }}>
                    {step.d}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* 右：二维码卡片 */}
        <div
          className="rise-in rounded-[26px] border p-6 sm:p-7"
          style={{
            background: "var(--color-paper)",
            borderColor: "var(--color-line)",
            boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
            animationDelay: "90ms",
          }}
        >
          {phase === "approved" ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span
                className="pop-in grid h-16 w-16 place-items-center rounded-full text-white"
                style={{ background: "#1c9c68" }}
              >
                <Check size={30} strokeWidth={3} />
              </span>
              <p className="mt-5 text-[19px] font-extrabold">已通过口令验证</p>
              <p className="mt-1 text-[13.5px] text-ink-2">正在进入点名台…</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[17px] font-extrabold">
                  {needsCloud ? "扫码预览" : "微信扫码"}
                </h2>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                  style={
                    needsCloud
                      ? { background: "#f1eff4", color: "var(--color-ink-2)" }
                      : { background: "#e7f6ee", color: "#186b48" }
                  }
                >
                  {needsCloud ? <CloudOff size={13} /> : <ShieldCheck size={13} />}
                  {needsCloud ? "本机模式" : "云端已连接"}
                </span>
              </div>

              <div className="mt-5 grid place-items-center rounded-[20px] border border-line bg-paper p-4">
                {qr ? (
                  <img
                    src={qr}
                    alt="手机微信扫码进入点名台"
                    className="h-[236px] w-[236px] sm:h-[268px] sm:w-[268px]"
                  />
                ) : (
                  <div className="grid h-[236px] w-[236px] place-items-center sm:h-[268px] sm:w-[268px]">
                    <Loader2 size={26} className="animate-spin text-ink-3" />
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-[13.5px] font-bold text-ink-2">
                {creating ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    正在建立连接…
                  </>
                ) : (
                  <>
                    <span
                      className="pulse-dot inline-block h-2 w-2 rounded-full"
                      style={{ background: "var(--color-brand)", color: "var(--color-brand)" }}
                    />
                    等待手机确认
                  </>
                )}
              </div>

              {createError ? (
                <p className="mt-3 rounded-[12px] bg-[#fdecef] px-3 py-2 text-[12.5px] leading-relaxed text-[#9f1239]">
                  连接云端失败：{createError}
                </p>
              ) : null}

              {needsCloud ? (
                <div className="mt-4 rounded-[12px] bg-[#fff6e6] px-3 py-2.5">
                  <p className="text-[12.5px] font-semibold leading-relaxed text-[#7a4a10]">
                    本机模式下二维码只在同一台设备有效，方便先看流程。连上云端之后，手机微信扫码才能真正通过。
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        window.open(urlFor(`/gate?s=${sessionId}`), "_blank", "noopener,noreferrer")
                      }
                      className="pill !text-[12px]"
                    >
                      <Smartphone size={13} />
                      在本机开一个手机端
                    </button>
                    <button type="button" onClick={onOpenSettings} className="pill !text-[12px]">
                      <Cloud size={13} />
                      填写 Supabase 配置
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {ALLOW_DESKTOP_PASSWORD_FALLBACK && phase !== "approved" ? (
            <div className="mt-6 border-t border-line pt-5">
              {showManual ? (
                <div>
                  <label htmlFor="gate-manual" className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink-2">
                    <KeyRound size={14} />
                    在电脑上输入口令
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="gate-manual"
                      ref={inputRef}
                      type="password"
                      inputMode="numeric"
                      value={manual}
                      onChange={(event) => {
                        setManual(event.target.value);
                        setManualError(false);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void submitManual();
                      }}
                      aria-invalid={manualError}
                      placeholder="口令"
                      className="min-w-0 flex-1 rounded-[12px] border bg-canvas px-3.5 py-2.5 text-[15px] tracking-[0.3em] outline-none transition-colors focus:bg-paper"
                      style={{ borderColor: manualError ? "var(--color-brand)" : "var(--color-line)" }}
                    />
                    <button
                      type="button"
                      onClick={() => void submitManual()}
                      disabled={manualBusy}
                      className="press inline-flex shrink-0 items-center gap-1.5 rounded-[12px] px-4 text-[14px] font-bold text-white disabled:opacity-50"
                      style={{ background: "var(--color-brand)" }}
                    >
                      {manualBusy ? <Loader2 size={16} className="animate-spin" /> : null}
                      {manualBusy ? "确认中" : "进入"}
                      {manualBusy ? null : <ArrowRight size={16} />}
                    </button>
                  </div>
                  {manualError ? (
                    <p className="mt-2 text-[12.5px] font-semibold" style={{ color: "var(--color-brand-2)" }}>
                      口令不对，再试一次。
                    </p>
                  ) : null}
                  {manualNote ? (
                    <p className="mt-2 text-[12.5px] font-semibold" style={{ color: "#8a5a06" }}>
                      {manualNote}
                    </p>
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowManual(true)}
                  className="inline-flex items-center gap-2 text-[13.5px] font-bold text-ink-2 hover:text-ink"
                >
                  <KeyRound size={15} />
                  手机不在身边？在电脑上输入口令
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
