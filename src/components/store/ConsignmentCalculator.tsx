import { useState } from "react";
import {
  AfButton,
  AfIcon,
  AfNumberInput,
  AfOtpInput,
  AfTag,
  cn,
  useControllableState,
} from "../../ui";
import { AfSwap, useTween } from "../../ui-pro";

export interface AfFeeCalculationResult {
  listingPrice: number;
  serviceFee: number;
  effectiveRatePct: number;
  netPayout: number;
  tierLabel: string;
}

export interface AfConsignmentCalculatorProps {
  /** 受控挂牌售价（元）。 */
  listingPrice?: number;
  defaultListingPrice?: number;
  onListingPriceChange?: (price: number) => void;
  /** 手机验证码受控值。 */
  otpCode?: string;
  defaultOtpCode?: string;
  onOtpChange?: (code: string) => void;
  /** 重新发送手机验证码回调。 */
  onResendOtp?: () => void;
  /** 校验通过确认上架回调。 */
  onConfirmListing?: (payload: AfFeeCalculationResult & { otpCode: string }) => void;
  className?: string;
}

/**
 * 阶梯平台技术服务费计算纯函数：
 * - `<= ¥2,000`：`5.0%`（最低 `¥10`）
 * - `¥2,000 – ¥10,000`：`3.5%`
 * - `> ¥10,000`：`2.0%`（封顶 `¥500`）
 */
export function calculateConsignmentFee(rawListingPrice: number): AfFeeCalculationResult {
  const price = Math.max(0, Math.round(rawListingPrice * 100) / 100);
  if (price <= 0) {
    return {
      listingPrice: 0,
      serviceFee: 0,
      effectiveRatePct: 0,
      netPayout: 0,
      tierLabel: "待输入售价",
    };
  }
  let rate = 0.05;
  let tierLabel = "标准档 (5.0% 费率)";
  if (price > 10000) {
    rate = 0.02;
    tierLabel = "大额优享档 (2.0% 封顶 ¥500)";
  } else if (price > 2000) {
    rate = 0.035;
    tierLabel = "进阶优惠档 (3.5% 费率)";
  }

  const rawFee = price * rate;
  const serviceFee = Math.min(500, Math.max(10, Math.round(rawFee * 100) / 100));
  const netPayout = Math.max(0, Math.round((price - serviceFee) * 100) / 100);
  const effectiveRatePct = Math.round((serviceFee / price) * 1000) / 10;

  return {
    listingPrice: price,
    serviceFee,
    effectiveRatePct,
    netPayout,
    tierLabel,
  };
}

/** 根据期望到手净额反推建议挂牌售价。 */
export function solveListingPriceFromNet(targetNet: number): number {
  const cleanNet = Math.max(0, targetNet);
  if (cleanNet <= 0) return 0;
  // 按三档费率闭式候选求最小可行整数挂牌价，避免跨档阶跃漏解
  const candidates = [
    Math.ceil(cleanNet + 10),
    Math.ceil(cleanNet / 0.95),
    Math.max(2001, Math.ceil(cleanNet / 0.965)),
    Math.max(10001, Math.ceil(cleanNet / 0.98)),
    Math.ceil(cleanNet + 500),
  ];
  const valid = candidates.filter(
    (p) => p > 0 && calculateConsignmentFee(p).netPayout >= cleanNet,
  );
  return valid.length > 0 ? Math.min(...valid) : Math.ceil(cleanNet + 500);
}

/**
 * 数字资产交易市场 · 双向联动寄售收益计算器与安全确认流：
 * - 输入「挂牌售价」实时计算阶梯服务费与「预计到手净额」；
 * - 输入「期望到手净额」反向推算建议挂牌价；
 * - 净额与服务费采用单层 `useTween` 丝滑滚动（严禁双重套用），底部集成 `AfOtpInput` 手机验证确认。
 */
export function AfConsignmentCalculator({
  listingPrice: priceProp,
  defaultListingPrice = 4280,
  onListingPriceChange,
  otpCode: otpProp,
  defaultOtpCode = "",
  onOtpChange,
  onResendOtp,
  onConfirmListing,
  className,
}: AfConsignmentCalculatorProps = {}) {
  const [price, setPrice] = useControllableState<number>({
    value: priceProp,
    defaultValue: defaultListingPrice,
    onChange: onListingPriceChange,
  });
  const [otp, setOtp] = useControllableState<string>({
    value: otpProp,
    defaultValue: defaultOtpCode,
    onChange: onOtpChange,
  });
  const [submitted, setSubmitted] = useState(false);

  const calc = calculateConsignmentFee(price);

  // 单层 useTween 数值插值（严禁对 tweened 结果二次套用 useTween）
  const tweenedNet = useTween(calc.netPayout, 420);
  const tweenedFee = useTween(calc.serviceFee, 420);

  return (
    <section className={cn("af-consign-calc", className)} aria-label="寄售收益双向计算器">
      <div className="af-consign-calc__head">
        <div>
          <h4>数字资产上架与分成收益测算</h4>
          <span>双向实时换算挂牌价与结算净额 · 自动匹配阶梯技术服务费</span>
        </div>
        <AfTag tone="accent" size="sm">
          {calc.tierLabel}
        </AfTag>
      </div>

      {/* 双向联动输入区 */}
      <div className="af-consign-calc__dual">
        <div className="af-consign-calc__field">
          <span className="af-consign-calc__label">买家可见挂牌售价</span>
          <AfNumberInput
            aria-label="买家可见挂牌售价"
            min={50}
            max={500000}
            step={50}
            commitMode="blur"
            value={calc.listingPrice}
            onChange={(val: number | null) => setPrice(val ?? 0)}
            unit="元"
          />
        </div>

        <span className="af-consign-calc__swap-icon" aria-hidden="true">
          <AfIcon name="arrowRight" size={14} />
        </span>

        <div className="af-consign-calc__field">
          <span className="af-consign-calc__label">期望实收净额（自动反推售价）</span>
          <AfNumberInput
            aria-label="期望实收净额"
            min={40}
            max={499500}
            step={50}
            commitMode="blur"
            value={Math.round(calc.netPayout)}
            onChange={(val: number | null) => {
              const suggested = solveListingPriceFromNet(val ?? 0);
              setPrice(suggested);
            }}
            unit="元"
          />
        </div>
      </div>

      {/* 实时动态插值净额看板 */}
      <div className="af-consign-calc__summary">
        <div className="af-consign-calc__metric">
          <span>预计到账提现净额</span>
          <strong className="af-consign-calc__net">
            ¥{" "}
            {tweenedNet.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>
        </div>
        <div className="af-consign-calc__metric">
          <span>平台托管与分发服务费 ({calc.effectiveRatePct}%)</span>
          <strong className="af-consign-calc__fee">
            - ¥{" "}
            {tweenedFee.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>
        </div>
        <div className="af-consign-calc__metric">
          <span>资金解冻账期</span>
          <strong>72 小时自动入账</strong>
        </div>
      </div>

      {/* 手机安全验证码确认上架流 */}
      <div className="af-consign-calc__otp-box">
        <div className="af-consign-calc__otp-head">
          <AfIcon name="shield" size={13} />
          <span>输入绑定手机 6 位安全验证码确认提交公示</span>
        </div>
        <AfOtpInput
          length={6}
          locale="zh-CN"
          value={otp}
          onChange={(v) => {
            setOtp(v);
            setSubmitted(false);
          }}
          label="寄售安全验证码"
          showResend
          onResend={onResendOtp}
          align="start"
        />
      </div>

      <div className="af-consign-calc__foot">
        <AfSwap swapKey={submitted ? "done" : "idle"}>
          {submitted ? (
            <AfTag tone="success" size="sm">
              已提交上架公示单 (¥{calc.listingPrice})
            </AfTag>
          ) : (
            <span className="af-consign-calc__hint">公示期 48 小时内支持随时免费撤回改价</span>
          )}
        </AfSwap>
        <AfButton
          size="sm"
          variant="primary"
          icon="check"
          disabled={calc.listingPrice < 50 || otp.trim().length < 6}
          onClick={() => {
            setSubmitted(true);
            onConfirmListing?.({ ...calc, otpCode: otp });
          }}
        >
          确认价格并提交寄售
        </AfButton>
      </div>
    </section>
  );
}
