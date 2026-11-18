import {
  AfButton,
  AfCopyButton,
  AfCountdown,
  AfIcon,
  AfModal,
  AfQrCodeCard,
  AfSegmented,
  AfTag,
  cn,
  useControllableState,
  type AfQrCodeStatus,
} from "../../ui";
import { AfSwap } from "../../ui-pro";

export type AfCashierChannel = "wechat" | "alipay";
export type AfCashierStage = "paying" | "paid";

export interface AfCashierModalProps {
  /** 弹窗开关（省略时默认渲染 `inline` 舞台模式）。 */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 内联渲染模式。 */
  inline?: boolean;
  /** 订单商品名称。 */
  goodsTitle?: string;
  /** 平台锁单单号。 */
  orderNo?: string;
  /** 实付金额（元）。 */
  amountCny?: number;
  /** 锁单剩余毫秒数（默认 15 分钟 `900000`）。 */
  lockDurationMs?: number;
  /** 是否冻结倒计时跳动（用于静态基线快照或暂停态）。 */
  countdownPaused?: boolean;
  /** 支付渠道。 */
  channel?: AfCashierChannel;
  defaultChannel?: AfCashierChannel;
  onChannelChange?: (channel: AfCashierChannel) => void;
  /** 二维码状态（`ready | scanned | expired | success`）。 */
  qrStatus?: AfQrCodeStatus;
  defaultQrStatus?: AfQrCodeStatus;
  onQrStatusChange?: (status: AfQrCodeStatus) => void;
  /** 是否显示底部演示模拟操作栏（默认在内联预览开启，正式弹窗可传 `false` 隐藏）。 */
  showSimulationControls?: boolean;
  /** 收银阶段（`paying` 扫码中 / `paid` 支付成功回执）。 */
  stage?: AfCashierStage;
  defaultStage?: AfCashierStage;
  onStageChange?: (stage: AfCashierStage) => void;
  /** 重新锁单刷新二维码回调。 */
  onRelockOrder?: () => void;
  className?: string;
}

/**
 * 数字资产交易市场 · 15 分钟锁单扫码收银台：
 * - 顶部集成 `AfCountdown`（临期变色预警）；
 * - 中部展示 `tabular-nums` 大号实付金额与双渠道 `AfQrCodeCard`；
 * - 支付完成后通过 `<AfSwap>` 弹性切换为交易单号回执页。
 */
export function AfCashierModal({
  open,
  onOpenChange,
  inline,
  goodsTitle = "次世代影视级赛博义体角色 · 团队商业授权包",
  orderNo = "ORD-20261116-551902",
  amountCny = 4280,
  lockDurationMs = 885000,
  countdownPaused = false,
  channel: channelProp,
  defaultChannel = "wechat",
  onChannelChange,
  qrStatus: qrStatusProp,
  defaultQrStatus = "ready",
  onQrStatusChange,
  showSimulationControls,
  stage: stageProp,
  defaultStage = "paying",
  onStageChange,
  onRelockOrder,
  className,
}: AfCashierModalProps = {}) {
  const isInline = inline ?? open === undefined;
  const showSim = showSimulationControls ?? isInline;
  const [channel, setChannel] = useControllableState<AfCashierChannel>({
    value: channelProp,
    defaultValue: defaultChannel,
    onChange: onChannelChange,
  });
  const [stage, setStage] = useControllableState<AfCashierStage>({
    value: stageProp,
    defaultValue: defaultStage,
    onChange: onStageChange,
  });
  const [qrStatus, setQrStatus] = useControllableState<AfQrCodeStatus>({
    value: qrStatusProp,
    defaultValue: defaultQrStatus,
    onChange: onQrStatusChange,
  });

  const formattedAmount = amountCny.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const qrPayload = `https://pay.aster-market.example/checkout?order=${orderNo}&ch=${channel}&amt=${amountCny}`;

  const body = (
    <div className={cn("af-cashier", isInline && "af-cashier--inline", className)}>
      <AfSwap swapKey={stage}>
        {stage === "paying" ? (
          <div className="af-cashier__pane">
            {/* 顶部 15 分钟锁单倒计时横幅 */}
            <div className="af-cashier__lock-bar">
              <div className="af-cashier__lock-text">
                <AfIcon name="lock" size={13} />
                <span>商品已为您独占锁定，请在倒计时结束前完成支付</span>
              </div>
              <AfCountdown
                durationMs={lockDurationMs}
                format="mm:ss"
                warnThresholdMs={180000}
                dangerThresholdMs={60000}
                paused={countdownPaused}
                variant="pill"
                size="sm"
                onFinish={() => setQrStatus("expired")}
              />
            </div>

            {/* 订单摘要与大号等宽金额 */}
            <div className="af-cashier__summary">
              <span className="af-cashier__goods">{goodsTitle}</span>
              <div className="af-cashier__amount">
                <small>¥</small>
                <strong>{formattedAmount}</strong>
              </div>
              <span className="af-cashier__order-no">锁单编号：{orderNo}</span>
            </div>

            {/* 渠道切换 + 本地 SVG 二维码 */}
            <div className="af-cashier__qr-area">
              <AfSegmented<AfCashierChannel>
                size="sm"
                value={channel}
                onChange={setChannel}
                options={[
                  { value: "wechat", label: "微信扫码支付" },
                  { value: "alipay", label: "支付宝扫码" },
                ]}
              />

              <AfQrCodeCard
                value={qrPayload}
                size={156}
                status={qrStatus}
                icon="wallet"
                title={channel === "wechat" ? "请使用微信扫一扫" : "请使用支付宝扫一扫"}
                description="平台担保托管 · 授权与资产验收完成后结算"
                onRefresh={() => {
                  setQrStatus("ready");
                  onRelockOrder?.();
                }}
              />
            </div>

            {showSim ? (
              <div className="af-cashier__foot">
                <AfButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setQrStatus(qrStatus === "expired" ? "ready" : "expired")}
                >
                  {qrStatus === "expired" ? "恢复有效码" : "模拟锁单超时"}
                </AfButton>
                <AfButton
                  size="sm"
                  variant="primary"
                  icon="check"
                  onClick={() => setStage("paid")}
                >
                  模拟扫码支付成功
                </AfButton>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="af-cashier__receipt">
            <div className="af-cashier__receipt-icon" aria-hidden="true">
              <AfIcon name="checkCircle" size={28} />
            </div>
            <h4>支付成功 · 正在签发授权并分发资产包</h4>
            <p>系统已生成数字签名商业授权书，预计 1 分钟内同步至您的目标工作空间资产库。</p>

            <div className="af-cashier__receipt-kv">
              <div>
                <span>实付托管金额</span>
                <strong>¥ {formattedAmount}</strong>
              </div>
              <div>
                <span>支付渠道</span>
                <strong>{channel === "wechat" ? "微信支付" : "支付宝"}</strong>
              </div>
              <div>
                <span>平台交易凭证</span>
                <span className="af-cashier__tx-copy">
                  <code>{orderNo}</code>
                  <AfCopyButton text={orderNo} label="复制单号" />
                </span>
              </div>
            </div>

            <div className="af-cashier__receipt-actions">
              <AfTag tone="success" size="sm">
                72 小时资金保护期已生效
              </AfTag>
              <AfButton
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (!isInline && onOpenChange) {
                    onOpenChange(false);
                  } else {
                    setStage("paying");
                  }
                }}
              >
                {isInline ? "返回收银预览" : "完成并关闭"}
              </AfButton>
            </div>
          </div>
        )}
      </AfSwap>
    </div>
  );

  if (isInline) {
    return body;
  }

  return (
    <AfModal
      open={Boolean(open)}
      closable
      onClose={() => onOpenChange?.(false)}
      title="平台担保收银台"
      width={440}
    >
      {body}
    </AfModal>
  );
}
