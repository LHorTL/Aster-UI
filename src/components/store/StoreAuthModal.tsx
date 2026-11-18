import { useEffect, useRef, useState, type FormEvent } from "react";
import { AfIcon } from "../../icons";
import { cn, useControllableState, useExitTransition, useFieldShake } from "../../primitives";
import { AfButton, AfInput, AfModal, AfSegmented } from "../../ui";
import { AfSwap } from "../../ui-pro";

/** 私有商城鉴权登录模式。 */
export type AfStoreAuthMode = "password" | "token";

/** 登录提交载荷。 */
export type AfStoreAuthSubmitPayload =
  | { mode: "password"; account: string; password: string }
  | { mode: "token"; token: string; endpoint?: string };

/** 私有应用商城通行证登录弹窗属性。 */
export type AfStoreAuthModalProps = {
  /** 是否打开弹窗；未传时默认以 `inline` 卡片模式渲染。 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean;
  mode?: AfStoreAuthMode;
  defaultMode?: AfStoreAuthMode;
  onModeChange?: (mode: AfStoreAuthMode) => void;
  /** 是否展示会话过期重新登录提示横幅。 */
  sessionExpired?: boolean;
  /** 外部受控错误消息（变化为非空时自动触发字段水平抖动）。 */
  errorMessage?: string | null;
  defaultEndpoint?: string;
  loading?: boolean;
  onSubmit?: (payload: AfStoreAuthSubmitPayload) => void | Promise<void>;
  className?: string;
};

/**
 * 私有商城通行证登录弹窗（账号密码 / Personal Access Token 双页签 `<AfSwap>` 切换 + 会话过期横幅 + 错态 `useFieldShake` 抖动）。
 */
export function AfStoreAuthModal({
  open,
  onOpenChange,
  inline,
  mode: modeProp,
  defaultMode = "password",
  onModeChange,
  sessionExpired = false,
  errorMessage: externalError,
  defaultEndpoint = "https://registry.cloud-desk.cn",
  loading = false,
  onSubmit,
  className,
}: AfStoreAuthModalProps = {}) {
  const isInline = inline ?? open === undefined;

  const [mode, setMode] = useControllableState<AfStoreAuthMode>({
    value: modeProp,
    defaultValue: defaultMode,
    onChange: (next) => {
      setLocalError(null);
      onModeChange?.(next);
    },
  });

  const [account, setAccount] = useState("team@company.com");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [endpoint, setEndpoint] = useState(defaultEndpoint);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pulseShake, setPulseShake] = useState(false);
  const pulseTimerRef = useRef<number | null>(null);

  const triggerShakePulse = () => {
    if (typeof window === "undefined") return;
    if (pulseTimerRef.current !== null) {
      window.clearTimeout(pulseTimerRef.current);
    }
    setPulseShake(false);
    window.requestAnimationFrame(() => {
      setPulseShake(true);
      pulseTimerRef.current = window.setTimeout(() => {
        setPulseShake(false);
        pulseTimerRef.current = null;
      }, 420);
    });
  };

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(pulseTimerRef.current);
      }
    };
  }, []);

  const prevExternalErrorRef = useRef<string | null | undefined>(externalError);
  useEffect(() => {
    if (externalError && externalError !== prevExternalErrorRef.current) {
      triggerShakePulse();
    }
    prevExternalErrorRef.current = externalError;
  }, [externalError]);

  const activeError = externalError ?? localError;
  const lastErrorRef = useRef<string | null>(null);
  if (activeError) lastErrorRef.current = activeError;
  const expiredExit = useExitTransition(Boolean(sessionExpired), 150);
  const errorExit = useExitTransition(Boolean(activeError), 150);
  const fieldShaking = useFieldShake(Boolean(activeError));
  const shaking = fieldShaking || pulseShake;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === "password") {
      if (!account.trim() || !password.trim()) {
        setLocalError("请输入完整的企业通行证邮箱与登录密码");
        triggerShakePulse();
        return;
      }
      setLocalError(null);
      await onSubmit?.({ mode: "password", account: account.trim(), password });
    } else {
      if (!token.trim() || token.trim().length < 8) {
        setLocalError("请输入有效的 Personal Access Token（至少 8 位）");
        triggerShakePulse();
        return;
      }
      setLocalError(null);
      await onSubmit?.({ mode: "token", token: token.trim(), endpoint: endpoint.trim() });
    }
  };

  const formCard = (
    <form
      className={cn("af-store-auth", isInline && "af-store-auth--inline", className)}
      data-shaking={shaking ? "true" : undefined}
      onSubmit={handleSubmit}
      noValidate
    >
      {isInline ? (
        <div className="af-store-auth__head">
          <span className="af-store-auth__mark" aria-hidden="true">
            <AfIcon name="key" size={15} />
          </span>
          <div>
            <h4>连接私有应用商城仓库</h4>
            <p>验证身份以拉取团队内部签发扩展与测试通道包</p>
          </div>
        </div>
      ) : null}

      {expiredExit.mounted ? (
        <div
          className="af-store-auth__expired af-pj-panel-in"
          role="alert"
          data-closing={expiredExit.closing ? "true" : undefined}
          style={expiredExit.closing ? { opacity: 0, transition: "opacity 140ms ease-in" } : undefined}
        >
          <AfIcon name="clock" size={14} />
          <span>登录状态已过期，请重新验证后同步内部应用目录。</span>
        </div>
      ) : null}

      <AfSegmented<AfStoreAuthMode>
        size="sm"
        value={mode}
        onChange={setMode}
        options={[
          { value: "password", label: "账号密码登录" },
          { value: "token", label: "Access Token 令牌" },
        ]}
      />

      <div className="af-store-auth__fields" data-shake={shaking ? "true" : undefined}>
        <AfSwap swapKey={mode}>
          {mode === "password" ? (
            <div className="af-store-auth__pane">
              <label className="af-store-auth__field">
                <span>通行证账号 / 企业邮箱</span>
                <AfInput
                  size="md"
                  prefix={<AfIcon name="mail" size={13} />}
                  placeholder="name@company.com"
                  value={account}
                  onValueChange={(v) => {
                    setAccount(v);
                    if (localError) setLocalError(null);
                  }}
                />
              </label>

              <label className="af-store-auth__field">
                <span>登录密码</span>
                <AfInput
                  size="md"
                  type="password"
                  prefix={<AfIcon name="lock" size={13} />}
                  placeholder="输入通行证密码"
                  value={password}
                  onValueChange={(v) => {
                    setPassword(v);
                    if (localError) setLocalError(null);
                  }}
                />
              </label>
            </div>
          ) : (
            <div className="af-store-auth__pane">
              <label className="af-store-auth__field">
                <span>私有源仓库地址</span>
                <AfInput
                  size="md"
                  prefix={<AfIcon name="globe" size={13} />}
                  value={endpoint}
                  onValueChange={setEndpoint}
                />
              </label>

              <label className="af-store-auth__field">
                <span>Personal Access Token (PAT)</span>
                <AfInput
                  size="md"
                  type="password"
                  prefix={<AfIcon name="key" size={13} />}
                  placeholder="pat_live_xxxxxxxxxxxxxxxx"
                  value={token}
                  onValueChange={(v) => {
                    setToken(v);
                    if (localError) setLocalError(null);
                  }}
                />
              </label>
            </div>
          )}
        </AfSwap>
      </div>

      {errorExit.mounted && (activeError ?? lastErrorRef.current) ? (
        <div
          className="af-store-auth__error af-pj-panel-in"
          role="alert"
          data-closing={errorExit.closing ? "true" : undefined}
          style={errorExit.closing ? { opacity: 0, transition: "opacity 140ms ease-in" } : undefined}
        >
          <AfIcon name="alert" size={13} />
          <span>{activeError ?? lastErrorRef.current}</span>
        </div>
      ) : null}

      <div className="af-store-auth__foot">
        <span className="af-store-auth__hint">
          <AfIcon name="shield" size={12} />
          <span>令牌使用系统钥匙串加密存储</span>
        </span>
        <div className="af-store-auth__actions">
          {!isInline ? (
            <AfButton size="md" variant="ghost" onClick={() => onOpenChange?.(false)}>
              取消
            </AfButton>
          ) : null}
          <AfButton size="md" variant="primary" type="submit" loading={loading}>
            {mode === "password" ? "验证并登录" : "绑定访问令牌"}
          </AfButton>
        </div>
      </div>
    </form>
  );

  if (isInline) {
    return formCard;
  }

  return (
    <AfModal
      open={Boolean(open)}
      onOpenChange={onOpenChange}
      title="连接私有应用商城"
      width={420}
    >
      {formCard}
    </AfModal>
  );
}
