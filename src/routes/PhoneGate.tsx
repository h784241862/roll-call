import { useEffect, useRef, useState } from "react";
import { Check, Heart, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { checkPassword, gateChannel } from "../lib/gate";
import { errorText } from "../lib/errors";
import { useStore } from "../lib/store";

export function PhoneGate({ sessionId }: { sessionId: string }) {
  const { cloudConfig, mode } = useStore();
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "ok" | "wrong" | "error">("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async () => {
    if (state === "checking" || state === "ok") return;
    if (!checkPassword(value)) {
      setState("wrong");
      setValue("");
      inputRef.current?.focus();
      return;
    }

    setState("checking");
    try {
      await gateChannel(cloudConfig).approve(sessionId);
      setState("ok");
      if (navigator.vibrate) navigator.vibrate(35);
    } catch (error) {
      setState("error");
      setMessage(errorText(error));
    }
  };

  return (
    <div className="grid min-h-[100dvh] place-items-center px-5 py-10" style={{ background: "var(--color-canvas)" }}>
      <div className="card rise-in w-full max-w-[420px] p-7">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-[14px] text-white"
            style={{ background: "var(--color-brand)" }}
          >
            <Heart size={20} fill="currentColor" strokeWidth={0} />
          </span>
          <div>
            <p className="text-[16px] font-extrabold leading-tight">2505 点名台</p>
            <p className="text-[12.5px] text-ink-3">手机验证</p>
          </div>
        </div>

        {state === "ok" ? (
          <div className="mt-8 flex flex-col items-center text-center">
            <span
              className="pop-in grid h-16 w-16 place-items-center rounded-full text-white"
              style={{ background: "#1c9c68" }}
            >
              <Check size={30} strokeWidth={3} />
            </span>
            <p className="mt-5 text-[18px] font-extrabold">验证通过</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
              电脑上的点名台已经解锁，可以放下手机了。
            </p>
          </div>
        ) : (
          <>
            <p className="mt-6 text-[13.5px] leading-relaxed text-ink-2">
              输入口令，通过之后电脑那边会自动进入点名台。
            </p>

            <label htmlFor="phone-pass" className="mt-5 mb-2 flex items-center gap-1.5 text-[13px] font-bold text-ink-2">
              <KeyRound size={14} />
              口令
            </label>
            <input
              id="phone-pass"
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                if (state === "wrong") setState("idle");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit();
              }}
              aria-invalid={state === "wrong"}
              className="w-full rounded-[14px] border bg-canvas px-4 py-3.5 text-center text-[22px] font-bold tracking-[0.4em] outline-none transition-colors focus:bg-paper"
              style={{ borderColor: state === "wrong" ? "var(--color-brand)" : "var(--color-line)" }}
            />

            {state === "wrong" ? (
              <p className="mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--color-brand-2)" }}>
                <ShieldAlert size={14} />
                口令不正确，再试一次。
              </p>
            ) : null}

            {state === "error" ? (
              <p className="mt-2.5 text-[13px] font-semibold" style={{ color: "var(--color-brand-2)" }}>
                提交失败：{message}
              </p>
            ) : null}

            {mode !== "cloud" ? (
              <p className="mt-3 rounded-[12px] bg-[#fff6e6] px-3 py-2 text-[12.5px] leading-relaxed text-[#7a4a10]">
                这台设备当前没有连接云端，验证结果无法同步到电脑。
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={!value.trim() || state === "checking"}
              className="press mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 text-[16px] font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: "var(--color-brand)" }}
            >
              {state === "checking" ? <Loader2 size={18} className="animate-spin" /> : null}
              {state === "checking" ? "正在确认…" : "确认并进入"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
