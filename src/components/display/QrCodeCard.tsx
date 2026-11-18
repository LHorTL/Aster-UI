import { useMemo, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { AfIcon, renderAfIconSlot, type AfIconSlot } from "../../icons";
import { cn } from "../../primitives";
import { AfButton } from "../controls/Button";

export type AfQrErrorCorrectionLevel = "L" | "M" | "Q" | "H";
export type AfQrCodeStatus = "ready" | "active" | "scanned" | "expired" | "success" | "confirmed";

export type AfQrCodeCardProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  /** 待编码的字符串载荷（登录链接、支付协议 URI、设备配对码等）。 */
  value?: string;
  /** 二维码画布像素边长，默认 `164`。 */
  size?: number;
  /** 纠错等级（提供中心 `logo` / `icon` 时默认自动提升至 `"H"` 30% 纠错）。 */
  ecl?: AfQrErrorCorrectionLevel;
  /** 四态业务覆盖层：`"ready" | "scanned" | "expired" | "success"`。 */
  status?: AfQrCodeStatus;
  /** 中心品牌徽标自定义节点。 */
  logo?: ReactNode;
  /** 中心内置图标或自定义节点（未传 `logo` 时生效）。 */
  icon?: AfIconSlot;
  /** 卡片主标题。 */
  title?: ReactNode;
  /** 卡片辅助说明文案。 */
  description?: ReactNode;
  /** 底部扩展槽位（可嵌入 `<AfCountdown />` 或状态标签）。 */
  footer?: ReactNode;
  /** 已扫码态提示文案。 */
  scannedText?: ReactNode;
  /** 已过期态提示文案。 */
  expiredText?: ReactNode;
  /** 过期刷新按钮文案。 */
  refreshLabel?: ReactNode;
  /** 扫码成功态提示文案。 */
  successText?: ReactNode;
  /** 点击过期遮罩刷新按钮回调。 */
  onRefresh?: () => void;
  /** 是否使用独立卡片壳体包裹，默认 `true`。 */
  framed?: boolean;
  style?: CSSProperties;
};

/* ========================================================================
 * 零外部依赖 ISO/IEC 18004 标准 QR Code 矩阵编码器（Versions 1–20，UTF-8 Byte 模式）
 * ======================================================================== */

const ECL_INDEX: Record<AfQrErrorCorrectionLevel, number> = { L: 0, M: 1, Q: 2, H: 3 };
const ECL_FORMAT_BITS: readonly number[] = [1, 0, 3, 2]; // L=01, M=00, Q=11, H=10

// ISO/IEC 18004 Table 9 — Versions 1..20 各纠错等级单块 ECC 码字数与总块数
const ECC_CODEWORDS_PER_BLOCK: readonly (readonly number[])[] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28],
];

const NUM_ERROR_CORRECTION_BLOCKS: readonly (readonly number[])[] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25],
];

function utf8Bytes(str: string): number[] {
  if (typeof TextEncoder !== "undefined") {
    return Array.from(new TextEncoder().encode(str));
  }
  const out: number[] = [];
  for (let i = 0; i < str.length; i += 1) {
    let code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      }
    }
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return out;
}

function gf256Mul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function makeRsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gf256Mul(result[j]!, root);
      if (j + 1 < degree) result[j]! ^= result[j + 1]!;
    }
    root = gf256Mul(root, 0x02);
  }
  return result;
}

function computeRsRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ result.shift()!;
    result.push(0);
    divisor.forEach((coef, idx) => {
      result[idx]! ^= gf256Mul(coef, factor);
    });
  }
  return result;
}

function getAlignmentCoords(version: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

function getNumRawDataModules(version: number): number {
  const size = version * 4 + 17;
  let result = size * size;
  result -= 3 * 64; // 3 finder + separator (8x8 each)
  result -= 2 * (size - 16); // timing lines
  result -= 31; // format info + dark module
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (numAlign * numAlign - 3) * 25;
    result += 2 * (numAlign - 2) * 5; // overlap between timing & alignment
  }
  if (version >= 7) {
    result -= 36; // 2x 6x3 version info blocks
  }
  return result;
}

function getDataCapacityBytes(version: number, eclIdx: number): number {
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const eccPerBlock = ECC_CODEWORDS_PER_BLOCK[eclIdx]![version]!;
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[eclIdx]![version]!;
  return rawCodewords - eccPerBlock * numBlocks;
}

function appendBits(val: number, len: number, bits: number[]): void {
  for (let i = len - 1; i >= 0; i -= 1) {
    bits.push((val >>> i) & 1);
  }
}

function evaluatePenalty(modules: readonly (readonly boolean[])[]): number {
  const size = modules.length;
  let score = 0;

  // Rule 1 & Rule 3 (rows & cols)
  const finderA = [true, false, true, true, true, false, true, false, false, false, false];
  const finderB = [false, false, false, false, true, false, true, true, true, false, true];

  for (let i = 0; i < size; i += 1) {
    let rowRunColor = modules[i]![0]!;
    let rowRunLen = 1;
    let colRunColor = modules[0]![i]!;
    let colRunLen = 1;

    for (let j = 1; j < size; j += 1) {
      if (modules[i]![j] === rowRunColor) {
        rowRunLen += 1;
        if (rowRunLen === 5) score += 3;
        else if (rowRunLen > 5) score += 1;
      } else {
        rowRunColor = modules[i]![j]!;
        rowRunLen = 1;
      }

      if (modules[j]![i] === colRunColor) {
        colRunLen += 1;
        if (colRunLen === 5) score += 3;
        else if (colRunLen > 5) score += 1;
      } else {
        colRunColor = modules[j]![i]!;
        colRunLen = 1;
      }
    }

    for (let j = 0; j <= size - 11; j += 1) {
      let matchRowA = true;
      let matchRowB = true;
      let matchColA = true;
      let matchColB = true;
      for (let k = 0; k < 11; k += 1) {
        if (modules[i]![j + k] !== finderA[k]) matchRowA = false;
        if (modules[i]![j + k] !== finderB[k]) matchRowB = false;
        if (modules[j + k]![i] !== finderA[k]) matchColA = false;
        if (modules[j + k]![i] !== finderB[k]) matchColB = false;
      }
      if (matchRowA || matchRowB) score += 40;
      if (matchColA || matchColB) score += 40;
    }
  }

  // Rule 2: 2x2 identical blocks
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const c = modules[y]![x]!;
      if (c === modules[y]![x + 1] && c === modules[y + 1]![x] && c === modules[y + 1]![x + 1]) {
        score += 3;
      }
    }
  }

  // Rule 4: dark module balance
  let dark = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (modules[y]![x]) dark += 1;
    }
  }
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  if (k > 0) score += k * 10;

  return score;
}

/**
 * 将任意 UTF-8 字符串编码为标准 ISO/IEC 18004 QR 布尔矩阵（`true` 为深色模块）。
 */
export function encodeQrMatrix(
  text: string,
  ecl: AfQrErrorCorrectionLevel = "M",
): boolean[][] {
  const payload = utf8Bytes(text || " ");
  let eclIdx = ECL_INDEX[ecl];

  // 自动选择可容纳字节流的最小 Version (1..20)；若超出 H/Q 容量则自动回退纠错档位以保证可生成
  let version = 0;
  while (version === 0 && eclIdx >= 0) {
    for (let v = 1; v <= 20; v += 1) {
      const countBits = v <= 9 ? 8 : 16;
      const capBytes = getDataCapacityBytes(v, eclIdx);
      if (4 + countBits + payload.length * 8 <= capBytes * 8) {
        version = v;
        break;
      }
    }
    if (version === 0) eclIdx -= 1;
  }
  if (version === 0) {
    version = 20;
    eclIdx = 0;
  }

  const countBits = version <= 9 ? 8 : 16;
  const dataCapacityBytes = getDataCapacityBytes(version, eclIdx);
  const maxPayloadLen = Math.floor((dataCapacityBytes * 8 - 4 - countBits) / 8);
  const safeBytes = payload.slice(0, Math.max(0, maxPayloadLen));

  // 1. 构建数据比特流（Byte 模式 = 0b0100）
  const bitBuf: number[] = [];
  appendBits(0b0100, 4, bitBuf);
  appendBits(safeBytes.length, countBits, bitBuf);
  for (const b of safeBytes) appendBits(b, 8, bitBuf);
  appendBits(0, Math.min(4, dataCapacityBytes * 8 - bitBuf.length), bitBuf);
  appendBits(0, (8 - (bitBuf.length % 8)) % 8, bitBuf);

  const dataCodewords: number[] = [];
  for (let i = 0; i < bitBuf.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b += 1) byte = (byte << 1) | bitBuf[i + b]!;
    dataCodewords.push(byte);
  }
  for (let padIdx = 0; dataCodewords.length < dataCapacityBytes; padIdx += 1) {
    dataCodewords.push(padIdx % 2 === 0 ? 0xec : 0x11);
  }

  // 2. 分块计算 Reed-Solomon 纠错码并交织
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[eclIdx]![version]!;
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[eclIdx]![version]!;
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const shortDataLen = shortBlockLen - blockEccLen;
  const rsDiv = makeRsDivisor(blockEccLen);

  const blocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < numBlocks; i += 1) {
    const datLen = shortDataLen + (i < numShortBlocks ? 0 : 1);
    const dat = dataCodewords.slice(offset, offset + datLen);
    offset += datLen;
    const ecc = computeRsRemainder(dat, rsDiv);
    if (i < numShortBlocks) dat.push(0); // 对齐长块索引以便交织
    blocks.push(dat.concat(ecc));
  }

  const allCodewords: number[] = [];
  const maxBlockCols = blocks[0]!.length;
  for (let col = 0; col < maxBlockCols; col += 1) {
    for (let row = 0; row < numBlocks; row += 1) {
      if (col === shortDataLen && row < numShortBlocks) continue;
      allCodewords.push(blocks[row]![col]!);
    }
  }

  // 3. 初始化矩阵与功能图形
  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const isFunc: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));

  const setFunctionModule = (x: number, y: number, isDark: boolean) => {
    modules[y]![x] = isDark;
    isFunc[y]![x] = true;
  };

  // Timing patterns
  for (let i = 0; i < size; i += 1) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Finder patterns (3 corners) + white separators
  const drawFinder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const xx = cx + dx;
        const yy = cy + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) {
          const dist = Math.max(Math.abs(dx), Math.abs(dy));
          setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  // Alignment patterns
  const alignCoords = getAlignmentCoords(version);
  for (let i = 0; i < alignCoords.length; i += 1) {
    for (let j = 0; j < alignCoords.length; j += 1) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === alignCoords.length - 1) ||
        (i === alignCoords.length - 1 && j === 0)
      ) {
        continue;
      }
      const cx = alignCoords[i]!;
      const cy = alignCoords[j]!;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          setFunctionModule(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  // Reserve format info slots & dark module
  const drawFormatBits = (target: boolean[][], mask: number) => {
    const data = (ECL_FORMAT_BITS[eclIdx]! << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;

    const put = (x: number, y: number, bitIdx: number) => {
      const dark = ((bits >>> bitIdx) & 1) !== 0;
      target[y]![x] = dark;
      isFunc[y]![x] = true;
    };

    for (let i = 0; i <= 5; i += 1) put(8, i, i);
    put(8, 7, 6);
    put(8, 8, 7);
    put(7, 8, 8);
    for (let i = 9; i < 15; i += 1) put(14 - i, 8, i);

    for (let i = 0; i < 8; i += 1) put(size - 1 - i, 8, i);
    for (let i = 8; i < 15; i += 1) put(8, size - 15 + i, i);
    target[size - 8]![8] = true;
    isFunc[size - 8]![8] = true;
  };
  drawFormatBits(modules, 0);

  // Version info (v >= 7)
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i += 1) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunctionModule(a, b, dark);
      setFunctionModule(b, a, dark);
    }
  }

  // 4. Zig-zag 写入交织数据码字
  let bitIdx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFunc[y]![x] && bitIdx < allCodewords.length * 8) {
          const byte = allCodewords[bitIdx >>> 3]!;
          modules[y]![x] = ((byte >>> (7 - (bitIdx & 7))) & 1) !== 0;
          bitIdx += 1;
        }
      }
    }
  }

  // 5. 枚举全部 8 种掩码并按惩罚规则选取最优矩阵
  const testMask = (mask: number, x: number, y: number): boolean => {
    switch (mask) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
      case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
      case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
      default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
    }
  };

  let bestMask = 0;
  let bestPenalty = Number.POSITIVE_INFINITY;
  let bestGrid = modules;

  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = modules.map((row, y) =>
      row.map((val, x) => (!isFunc[y]![x] && testMask(mask, x, y) ? !val : val)),
    );
    drawFormatBits(candidate, mask);
    const penalty = evaluatePenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      bestGrid = candidate;
    }
  }

  void bestMask;
  return bestGrid;
}

function buildQrSvgPath(matrix: readonly (readonly boolean[])[], quietZone: number): string {
  const parts: string[] = [];
  for (let y = 0; y < matrix.length; y += 1) {
    const row = matrix[y]!;
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x += 1;
        continue;
      }
      let run = 1;
      while (x + run < row.length && row[x + run]) {
        run += 1;
      }
      parts.push(`M${x + quietZone} ${y + quietZone}h${run}v1h-${run}z`);
      x += run;
    }
  }
  return parts.join("");
}

/**
 * 零外部依赖 SVG 二维码与四态业务状态卡片（`AfQrCodeCard`）：
 * - 内置标准 ISO/IEC 18004 矩阵生成器（支持 UTF-8 中文/URI、Reed-Solomon 纠错与 8 掩码最优筛选）；
 * - 统一保持高对比浅底静默区（深色主题下手机摄像头依然一扫即中）；
 * - 内置 `ready` / `scanned` / `expired`（含一键刷新） / `success`（`pathLength="1"` 匀速描边对勾）四态覆盖层。
 */
export function AfQrCodeCard({
  value = "https://aster-ui.dev/pair",
  size = 164,
  ecl,
  status = "ready",
  logo,
  icon,
  title,
  description,
  footer,
  scannedText = "已扫码，请在手机端确认",
  expiredText = "二维码已过期",
  refreshLabel = "刷新二维码",
  successText = "扫码确认成功",
  onRefresh,
  framed = true,
  className,
  style,
  ...rest
}: AfQrCodeCardProps = {}) {
  const hasCenterBadge = Boolean(logo || icon);
  const resolvedEcl: AfQrErrorCorrectionLevel = ecl ?? (hasCenterBadge ? "H" : "M");
  const resolvedStatus: "ready" | "scanned" | "expired" | "success" =
    status === "active" ? "ready" : status === "confirmed" ? "success" : status;
  const quietZone = 2;

  const { matrixSize, svgPath } = useMemo(() => {
    const matrix = encodeQrMatrix(value, resolvedEcl);
    return {
      matrixSize: matrix.length + quietZone * 2,
      svgPath: buildQrSvgPath(matrix, quietZone),
    };
  }, [value, resolvedEcl]);

  const centerContent = logo ?? (icon ? renderAfIconSlot(icon, Math.round(size * 0.13)) : null);

  return (
    <div
      {...rest}
      className={cn("af-qr-card", className)}
      data-status={resolvedStatus}
      data-framed={framed ? "true" : "false"}
      style={style}
    >
      {title || description ? (
        <div className="af-qr-card__head">
          {title ? <div className="af-qr-card__title">{title}</div> : null}
          {description ? <div className="af-qr-card__desc">{description}</div> : null}
        </div>
      ) : null}

      <div
        className="af-qr-card__well"
        style={{ width: size, height: size }}
      >
        <svg
          className="af-qr-card__svg"
          width={size}
          height={size}
          viewBox={`0 0 ${matrixSize} ${matrixSize}`}
          shapeRendering="crispEdges"
          role="img"
          aria-label={typeof title === "string" ? `${title} 二维码` : "二维码"}
        >
          <rect width={matrixSize} height={matrixSize} fill="#ffffff" />
          <path d={svgPath} fill="#141414" />
        </svg>

        {centerContent && resolvedStatus === "ready" ? (
          <span className="af-qr-card__logo" aria-hidden="true">
            {centerContent}
          </span>
        ) : null}

        {resolvedStatus !== "ready" ? (
          <div className="af-qr-card__overlay af-qr-card__mask" data-status={resolvedStatus} role="status">
            {resolvedStatus === "scanned" ? (
              <div className="af-qr-card__state">
                <span className="af-qr-card__badge" data-tone="accent">
                  <AfIcon name="check" size={16} />
                </span>
                <span className="af-qr-card__state-text">{scannedText}</span>
              </div>
            ) : null}

            {resolvedStatus === "expired" ? (
              <div className="af-qr-card__state">
                <span className="af-qr-card__badge" data-tone="warn">
                  <AfIcon name="clock" size={16} />
                </span>
                <span className="af-qr-card__state-text">{expiredText}</span>
                {onRefresh ? (
                  <AfButton size="xs" variant="primary" icon="refresh" onClick={onRefresh}>
                    {refreshLabel}
                  </AfButton>
                ) : null}
              </div>
            ) : null}

            {resolvedStatus === "success" ? (
              <div className="af-qr-card__state">
                <span className="af-qr-card__badge" data-tone="ok">
                  <svg
                    className="af-qr-card__check"
                    width={18}
                    height={18}
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      className="af-qr-card__check-path"
                      d="M4.5 10.5L8.3 14.3L15.8 6.2"
                      pathLength={1}
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="af-qr-card__state-text">{successText}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {footer ? <div className="af-qr-card__foot">{footer}</div> : null}
    </div>
  );
}

export { AfQrCodeCard as QrCodeCard };
