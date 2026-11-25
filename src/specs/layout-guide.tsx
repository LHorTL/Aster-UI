import { useMemo, useState } from "react";
import type { ComponentSpec } from "../types";
import {
  AfAlert,
  AfBreadcrumb,
  AfButton,
  AfCard,
  AfColumns,
  AfDescriptions,
  AfDivider,
  AfDrawer,
  AfForm,
  AfFormItem,
  AfHoverList,
  AfInline,
  AfInput,
  AfListRow,
  AfMeterBar,
  AfModal,
  AfNumberInput,
  AfPage,
  AfPageHeader,
  AfParagraph,
  AfProgress,
  AfSection,
  AfSegmented,
  AfSelect,
  AfSpacer,
  AfStack,
  AfStat,
  AfStatus,
  AfSurface,
  AfSwitch,
  AfTable,
  AfTag,
  AfText,
  AfTextarea,
  AfTitle,
  AfToolbar,
  AsterThemeProvider,
  afMessage,
  useAsterTheme,
  type AsterDensity,
  type AsterRadiusScale,
} from "../ui";
import "./layout-guide.css";

type GuideTab = "workbench" | "settings" | "tokens" | "compare";

type ServiceRow = {
  id: string;
  name: string;
  region: string;
  status: "healthy" | "degraded" | "idle";
  qps: number;
  p95: number;
  updated: string;
};

const SERVICE_ROWS: ServiceRow[] = [
  { id: "svc-gateway", name: "API Gateway", region: "ap-east-1", status: "healthy", qps: 14820, p95: 18, updated: "2 分钟前" },
  { id: "svc-indexer", name: "Vector Indexer", region: "ap-east-1", status: "healthy", qps: 4210, p95: 42, updated: "5 分钟前" },
  { id: "svc-billing", name: "Billing Worker", region: "us-west-2", status: "degraded", qps: 980, p95: 164, updated: "刚刚" },
  { id: "svc-export", name: "Batch Exporter", region: "eu-central-1", status: "idle", qps: 120, p95: 31, updated: "18 分钟前" },
];

const SPACING_TOKENS = [
  { token: "--af-space-micro", prop: "micro", comfortable: "4px", compact: "4px", pxC: 4, pxK: 4, use: "标题↔副标题、表单 Label↔Hint、紧凑图标与文字" },
  { token: "--af-space-tight", prop: "tight", comfortable: "6px", compact: "4px", pxC: 6, pxK: 4, use: "表单标签↔输入框、标题↔徽标、按钮内图标与文字" },
  { token: "--af-space-inline", prop: "inline", comfortable: "8px", compact: "6px", pxC: 8, pxK: 6, use: "相邻按钮组、工具栏相邻控件、Tag 簇、页头操作组" },
  { token: "--af-space-group", prop: "group", comfortable: "12px", compact: "8px", pxC: 12, pxK: 8, use: "多列 KPI / 双列表单列距、区块标题↔内容、列表图标↔文字" },
  { token: "--af-space-block", prop: "block", comfortable: "16px", compact: "12px", pxC: 16, pxK: 12, use: "卡片标准内边距、表单字段纵间距、同区卡片间距、弹窗块间距" },
  { token: "--af-space-section-inner", prop: "section-inner", comfortable: "20px", compact: "14px", pxC: 20, pxK: 14, use: "页头↔首区块、宽松弹窗/抽屉内边距、主次分栏槽距" },
  { token: "--af-space-section", prop: "section", comfortable: "24px", compact: "16px", pxC: 24, pxK: 16, use: "页面一级 Section 纵间距、长表单分组间距" },
  { token: "--af-space-page", prop: "page", comfortable: "24px", compact: "16px", pxC: 24, pxK: 16, use: "AfPage 页面四周标准留白" },
  { token: "--af-space-page-lg", prop: "page-lg", comfortable: "32px", compact: "20px", pxC: 32, pxK: 20, use: "宽屏画布、空状态引导或营销着陆区大呼吸留白" },
] as const;

function WorkbenchCompositionDemo({
  blueprint,
  density,
}: {
  blueprint: boolean;
  density: AsterDensity;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [range, setRange] = useState("7d");
  const [selectedRow, setSelectedRow] = useState<ServiceRow | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [autoScale, setAutoScale] = useState(true);
  const [auditLog, setAuditLog] = useState(true);

  const filtered = useMemo(() => {
    return SERVICE_ROWS.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (search.trim() && !`${row.name} ${row.region}`.toLowerCase().includes(search.trim().toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [search, statusFilter]);

  const kpiGap = density === "compact" ? "8px" : "12px";
  const pagePad = density === "compact" ? "16px" : "24px";

  return (
    <AfPage maxWidth="wide">
      <AfPageHeader
        breadcrumb={
          <AfBreadcrumb
            items={[
              { label: "工作台", icon: "home" },
              { label: "服务监控" },
            ]}
          />
        }
        title="基础组件工作台实战"
        badge={
          <AfInline gap="tight">
            <AfTag tone="accent" variant="soft" size="sm">
              100% Core 基础件
            </AfTag>
            {blueprint ? <span className="af-lg-bp-tag">page-pad: {pagePad}</span> : null}
          </AfInline>
        }
        description="整页仅由核心布局原语（AfPage / AfColumns / AfSection / AfToolbar / AfListRow）与基础控件拼装，零手写间距样式。"
        actions={
          <AfInline gap="inline">
            <AfSegmented
              size="md"
              value={range}
              onChange={setRange}
              options={[
                { value: "24h", label: "24h" },
                { value: "7d", label: "7d" },
                { value: "30d", label: "30d" },
              ]}
            />
            <AfButton
              size="md"
              variant="secondary"
              icon="download"
              onClick={() => afMessage.info("已导出当前周期监控快照")}
            >
              导出
            </AfButton>
            <AfButton
              size="md"
              variant="primary"
              icon="plus"
              onClick={() => afMessage.success("已触发新建服务向导")}
            >
              新建服务
            </AfButton>
          </AfInline>
        }
      />

      {/* 1. 四列指标卡：AfColumns columns={4} gap="group" (12px / compact 8px) */}
      <AfSection
        title="核心运行指标"
        description={blueprint ? `AfColumns columns={4} gap="group" (${kpiGap}) · 全部数值等宽 tabular-nums` : "实时聚合请求量、时延与配额消耗"}
        action={blueprint ? <span className="af-lg-bp-tag">gap: group ({kpiGap})</span> : undefined}
      >
        <AfColumns columns={4} gap="group">
          <AfStat
            bordered
            label="总请求量"
            value={range === "24h" ? "184,210" : range === "7d" ? "1,284,620" : "5,412,900"}
            delta="+12.4%"
            trend="up"
            deltaTone="success"
            sparkline={[42, 48, 46, 59, 64, 72, 84]}
          />
          <AfStat
            bordered
            label="P95 响应时延"
            value={range === "24h" ? "26" : "31"}
            suffix="ms"
            delta="-4.2%"
            trend="down"
            deltaTone="success"
            sparkline={[38, 36, 35, 33, 31, 30, 28]}
          />
          <AfStat
            bordered
            label="错误率"
            value="0.18"
            suffix="%"
            delta="+0.04%"
            trend="up"
            deltaTone="warning"
            sparkline={[12, 14, 13, 15, 19, 17, 18]}
          />
          <AfStat
            bordered
            label="月度预算"
            value="$418.20"
            hint="上限 $600 · 剩余 30%"
          />
        </AfColumns>
      </AfSection>

      {/* 2. 双栏内容区：AfColumns columns={2} gap="block" (16px / compact 12px) */}
      <AfColumns columns={2} gap="block">
        <AfCard
          title="存储与配额分布"
          description="AfCard 默认 16px 内边距，内部用 AfStack gap='group' 保持 12px 节奏"
          extra={<AfTag size="xs" tone="neutral">实时</AfTag>}
        >
          <AfStack gap="group">
            <AfMeterBar
              size="md"
              showLegend
              formatValue={(value) => `${value} GB`}
              segments={[
                { key: "vec", label: "向量索引", value: 48, tone: "accent" },
                { key: "log", label: "运行日志", value: 26, tone: "success" },
                { key: "cache", label: "热缓存", value: 14, tone: "warning" },
                { key: "free", label: "可用空间", value: 12, tone: "neutral" },
              ]}
            />
            <AfDivider />
            <AfStack gap="tight">
              <AfInline justify="between">
                <AfText tone="muted">并发工作池</AfText>
                <AfText numeric strong>
                  18 / 24 slots
                </AfText>
              </AfInline>
              <AfProgress value={75} tone="accent" size="sm" />
            </AfStack>
            <AfAlert
              tone="info"
              title="缓存命中率稳定在 86.4%"
              description="当前无需扩容；当 P95 连续 10 分钟超过 120ms 时将自动弹性扩缩。"
            />
          </AfStack>
        </AfCard>

        <AfCard
          title="运行策略开关"
          description="AfCard flush + AfHoverList + AfListRow（同心圆角 + 1px 发丝分隔）"
          flush
        >
          <AfHoverList tone="wash">
            <AfListRow
              icon="bolt"
              title="自动弹性扩容"
              badge={<AfTag size="xs" tone="success" variant="soft">推荐</AfTag>}
              description="当队列积压超过 500 时自动拉起备用实例"
              control={<AfSwitch checked={autoScale} onChange={setAutoScale} aria-label="自动弹性扩容" />}
            />
            <AfListRow
              icon="shield"
              title="高危操作审计留痕"
              description="记录全部权限变更、密钥轮换与配置回滚"
              control={<AfSwitch checked={auditLog} onChange={setAuditLog} aria-label="高危操作审计留痕" />}
            />
            <AfListRow
              icon="clock"
              title="日志归档周期"
              description="超期自动转存至冷存储对象桶"
              meta="90 天"
              control={
                <AfButton size="sm" variant="secondary" onClick={() => afMessage.info("已打开归档策略配置")}>
                  调整
                </AfButton>
              }
            />
          </AfHoverList>
        </AfCard>
      </AfColumns>

      {/* 3. 工具栏 + 数据表格 + 抽屉检视 */}
      <AfSection
        title="服务实例清单"
        description="AfToolbar 保证搜索框、筛选器与按钮严格同高对齐（size='md' = 32px / compact 28px）"
        action={
          selectedKeys.length > 0 ? (
            <AfInline gap="inline">
              <AfText tone="muted" numeric>
                已选 {selectedKeys.length} 项
              </AfText>
              <AfButton size="sm" variant="secondary" onClick={() => setSelectedKeys([])}>
                取消选择
              </AfButton>
            </AfInline>
          ) : undefined
        }
      >
        <AfStack gap="group">
          <AfToolbar
            leading={
              <>
                <AfInput
                  size="md"
                  leadingIcon="search"
                  placeholder="搜索服务名或可用区…"
                  value={search}
                  onValueChange={setSearch}
                  allowClear
                  style={{ width: 240 }}
                />
                <AfSelect
                  size="md"
                  aria-label="筛选状态"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 148 }}
                  options={[
                    { value: "all", label: "全部状态" },
                    { value: "healthy", label: "运行正常" },
                    { value: "degraded", label: "延迟偏高" },
                    { value: "idle", label: "空闲待命" },
                  ]}
                />
              </>
            }
            trailing={
              <>
                {blueprint ? <span className="af-lg-bp-tag">toolbar gap: inline</span> : null}
                <AfButton
                  size="md"
                  variant="ghost"
                  icon="refresh"
                  onClick={() => afMessage.info("实例状态已刷新")}
                >
                  刷新
                </AfButton>
              </>
            }
          />

          <AfTable
            caption="服务实例监控表"
            selectable
            selectedKeys={selectedKeys}
            onSelectedKeysChange={setSelectedKeys}
            columns={[
              {
                key: "name",
                title: "服务名称",
                dataIndex: "name",
                sortable: true,
                render: (val) => <AfText strong>{String(val)}</AfText>,
              },
              {
                key: "region",
                title: "可用区",
                dataIndex: "region",
                render: (val) => <AfText code>{String(val)}</AfText>,
              },
              {
                key: "status",
                title: "状态",
                dataIndex: "status",
                render: (val) =>
                  val === "healthy" ? (
                    <AfStatus tone="success" pulse>
                      运行正常
                    </AfStatus>
                  ) : val === "degraded" ? (
                    <AfStatus tone="warning">延迟偏高</AfStatus>
                  ) : (
                    <AfStatus tone="neutral">空闲</AfStatus>
                  ),
              },
              {
                key: "qps",
                title: "吞吐 (req/m)",
                dataIndex: "qps",
                sortable: true,
                sortType: "number",
                align: "right",
                render: (val) => <AfText numeric>{Number(val).toLocaleString("en-US")}</AfText>,
              },
              {
                key: "p95",
                title: "P95",
                dataIndex: "p95",
                sortable: true,
                sortType: "number",
                align: "right",
                render: (val) => <AfText numeric>{String(val)} ms</AfText>,
              },
              {
                key: "action",
                title: "操作",
                align: "right",
                render: (_val, row) => (
                  <AfButton size="xs" variant="ghost" onClick={() => setSelectedRow(row as ServiceRow)}>
                    检视
                  </AfButton>
                ),
              },
            ]}
            data={filtered}
          />
        </AfStack>
      </AfSection>

      <AfDrawer
        open={Boolean(selectedRow)}
        onClose={() => setSelectedRow(null)}
        title={selectedRow?.name ?? "服务详情"}
        description={selectedRow ? `${selectedRow.region} · 最近心跳 ${selectedRow.updated}` : undefined}
        footer={
          <AfInline justify="end" gap="inline">
            <AfButton size="md" variant="secondary" onClick={() => setSelectedRow(null)}>
              关闭
            </AfButton>
            <AfButton
              size="md"
              variant="primary"
              onClick={() => {
                afMessage.success(`已向 ${selectedRow?.name} 下发平滑重启`);
                setSelectedRow(null);
              }}
            >
              滚动重启
            </AfButton>
          </AfInline>
        }
      >
        {selectedRow ? (
          <AfStack gap="block">
            <AfDescriptions
              bordered
              columns={2}
              items={[
                { label: "服务标识", children: selectedRow.id, mono: true },
                { label: "部署区域", children: selectedRow.region, mono: true },
                { label: "分钟吞吐", children: `${selectedRow.qps.toLocaleString("en-US")} req/m` },
                { label: "P95 延迟", children: `${selectedRow.p95} ms` },
              ]}
            />
            <AfAlert
              tone={selectedRow.status === "degraded" ? "warning" : "success"}
              title={selectedRow.status === "degraded" ? "检测到上游池排队波动" : "各项健康探针均通过"}
              description="抽屉正文统一使用 AfStack gap='block' (16px)，底部遵循左次右主 + 8px 按钮间距。"
            />
          </AfStack>
        ) : null}
      </AfDrawer>
    </AfPage>
  );
}

function SettingsFormCompositionDemo({ blueprint }: { blueprint: boolean }) {
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [channel, setChannel] = useState("stable");

  return (
    <AfPage maxWidth="narrow">
      <AfPageHeader
        title="单列设置与表单规范"
        badge={blueprint ? <span className="af-lg-bp-tag">maxWidth: narrow (680px)</span> : undefined}
        description="设置页与表单页统一收束至 680px 最佳阅读宽，避免超宽屏下标签与右侧开关跨度过大导致视线断裂。"
        divider
      />

      <AfSection title="通用与通道偏好" description="成组开关/下拉选项放入 AfCard flush + AfHoverList + AfListRow">
        <AfCard flush>
          <AfHoverList tone="wash">
            <AfListRow
              icon="mail"
              title="异常告警邮件摘要"
              description="每小时汇总一次失败任务与限流警告"
              control={<AfSwitch checked={notifyEmail} onChange={setNotifyEmail} aria-label="异常告警邮件摘要" />}
            />
            <AfListRow
              icon="gitBranch"
              title="更新发布通道"
              description="生产环境建议锁定稳定版通道"
              control={
                <AfSelect
                  size="sm"
                  aria-label="更新发布通道"
                  value={channel}
                  onChange={setChannel}
                  style={{ width: 140 }}
                  options={[
                    { value: "stable", label: "Stable 稳定" },
                    { value: "beta", label: "Beta 预览" },
                    { value: "nightly", label: "Nightly 每日" },
                  ]}
                />
              }
            />
            <AfListRow
              icon="trash"
              title="清空本地构建缓存"
              description="释放磁盘空间，不影响已保存配置"
              control={
                <AfButton
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    const ok = await AfModal.confirm({
                      title: "确认清空本地缓存？",
                      content: "清空后下次构建将重新拉取依赖，该操作耗时约 15 秒。",
                      okText: "确认清空",
                      cancelText: "保留缓存",
                      tone: "danger",
                    });
                    if (ok) afMessage.success("本地缓存已清空");
                  }}
                >
                  清空缓存
                </AfButton>
              }
            />
          </AfHoverList>
        </AfCard>
      </AfSection>

      <AfSection
        title="工作区参数表单"
        description="字段纵距 16px，双列字段用 AfColumns columns={2} gap='group' (12px)，提交栏顶部分隔线 + 左次右主"
        divider
      >
        <AfCard>
          <AfForm
            onFinish={() => afMessage.success("工作区配置已保存")}
            initialValues={{ workspace: "Aster Studio", slug: "aster-studio", concurrency: 8, timeout: 30, note: "" }}
          >
            <AfColumns columns={2} gap="group">
              <AfFormItem
                name="workspace"
                label="工作区名称"
                rules={[{ required: true, message: "请输入工作区名称" }]}
              >
                <AfInput placeholder="输入名称" allowClear />
              </AfFormItem>
              <AfFormItem
                name="slug"
                label="访问标识"
                hint="仅支持小写字母与连字符"
              >
                <AfInput prefix="app.aster/" placeholder="aster-studio" />
              </AfFormItem>
            </AfColumns>

            <AfColumns columns={2} gap="group">
              <AfFormItem name="concurrency" label="最大并发数" hint="推荐 4–16">
                <AfNumberInput min={1} max={32} unit="workers" />
              </AfFormItem>
              <AfFormItem name="timeout" label="请求超时阈值" hint="超时后自动重试一次">
                <AfNumberInput min={5} max={300} unit="sec" />
              </AfFormItem>
            </AfColumns>

            <AfFormItem name="note" label="变更备注" hint="将自动记录在审计日志中">
              <AfTextarea minRows={2} maxRows={4} placeholder="说明本次调整的原因（可选）…" />
            </AfFormItem>

            <AfDivider />

            <AfInline justify="between" gap="group">
              <AfText tone="muted">左次右主 · 按钮间距 8px (--af-space-inline)</AfText>
              <AfInline gap="inline">
                <AfButton type="reset" variant="secondary">
                  重置
                </AfButton>
                <AfButton type="submit" variant="primary">
                  保存更改
                </AfButton>
              </AfInline>
            </AfInline>
          </AfForm>
        </AfCard>
      </AfSection>
    </AfPage>
  );
}

function TokenRulerDemo({ density }: { density: AsterDensity }) {
  const isCompact = density === "compact";

  return (
    <AfPage maxWidth="wide">
      <AfPageHeader
        title="间距标尺、控件同高与表面层级"
        description="切换上方「舒适 / 紧凑」密度开关，下方所有语义间距令牌、控件高度与行高会联动实时缩放。"
      />

      <AfSection title="1. 九级语义间距阶梯（4px 基准网格）" description="组件外部拼装统一引用 --af-space-* 或 AfStack / AfColumns 的语义 gap">
        <AfCard flush>
          <div className="af-lg-ruler">
            {SPACING_TOKENS.map((item) => {
              const px = isCompact ? item.pxK : item.pxC;
              return (
                <div key={item.token} className="af-lg-ruler__row">
                  <span className="af-lg-ruler__token">
                    {item.token}
                  </span>
                  <span className="af-lg-ruler__val">{px}px</span>
                  <span className="af-lg-ruler__barwrap">
                    <span className="af-lg-ruler__bar" style={{ width: px * 3 }} />
                  </span>
                  <span className="af-lg-ruler__use">
                    <AfTag size="xs" tone="neutral" style={{ marginRight: 6 }}>
                      gap=&quot;{item.prop}&quot;
                    </AfTag>
                    {item.use}
                  </span>
                </div>
              );
            })}
          </div>
        </AfCard>
      </AfSection>

      <AfSection title="2. 同排控件严格等高对齐" description="同一操作行内的 Input、Select、Segmented 与 Button 必须共用同一 size 档位">
        <AfCard>
          <AfStack gap="group">
            {(["sm", "md", "lg"] as const).map((sz) => (
              <AfInline key={sz} gap="inline" align="center">
                <AfTag size="xs" tone="accent" variant="soft" style={{ minWidth: 84, justifyContent: "center" }}>
                  size=&quot;{sz}&quot;
                </AfTag>
                <AfInput size={sz} placeholder="关键词检索" style={{ width: 170 }} />
                <AfSelect
                  size={sz}
                  aria-label={`示例选择 ${sz}`}
                  defaultValue="all"
                  style={{ width: 120 }}
                  options={[{ value: "all", label: "全部" }, { value: "active", label: "活跃" }]}
                />
                <AfSegmented
                  size={sz === "lg" ? "md" : sz}
                  defaultValue="list"
                  options={[{ value: "list", label: "列表" }, { value: "board", label: "看板" }]}
                />
                <AfButton size={sz} variant="secondary">
                  次按钮
                </AfButton>
                <AfButton size={sz} variant="primary">
                  主操作
                </AfButton>
              </AfInline>
            ))}
          </AfStack>
        </AfCard>
      </AfSection>

      <AfColumns columns={2} gap="block">
        <AfSection title="3. 表面明度分层（严禁双层卡片叠边框）">
          <AfColumns columns={2} gap="group">
            <AfSurface level="canvas" bordered padding="sm" radius="md">
              <div className="af-lg-surface-step" style={{ padding: 0 }}>
                <span className="af-lg-surface-step__name">画布 / 侧栏</span>
                <span className="af-lg-surface-step__token">--af-canvas</span>
                <span className="af-lg-surface-step__desc">窗口最底层与侧栏导航底色</span>
              </div>
            </AfSurface>
            <AfSurface level="surface" bordered padding="sm" radius="md">
              <div className="af-lg-surface-step" style={{ padding: 0 }}>
                <span className="af-lg-surface-step__name">标准卡片</span>
                <span className="af-lg-surface-step__token">--af-surface</span>
                <span className="af-lg-surface-step__desc">单层 1px 发丝环 + 轻投影</span>
              </div>
            </AfSurface>
            <AfSurface level="sunken" bordered padding="sm" radius="md">
              <div className="af-lg-surface-step" style={{ padding: 0 }}>
                <span className="af-lg-surface-step__name">卡内下沉槽</span>
                <span className="af-lg-surface-step__token">--af-surface-sunken</span>
                <span className="af-lg-surface-step__desc">卡内二次分区，替代卡套卡</span>
              </div>
            </AfSurface>
            <AfSurface level="overlay" bordered padding="sm" radius="md">
              <div className="af-lg-surface-step" style={{ padding: 0 }}>
                <span className="af-lg-surface-step__name">浮层 / 弹窗</span>
                <span className="af-lg-surface-step__token">--af-overlay</span>
                <span className="af-lg-surface-step__desc">Popover / Modal / Drawer 最高层</span>
              </div>
            </AfSurface>
          </AfColumns>
        </AfSection>

        <AfSection title="4. 字体阶梯与等宽数字">
          <AfCard>
            <AfStack gap="inline">
              <AfTitle level={2}>页面标题 · 20px / 600</AfTitle>
              <AfTitle level={4}>区块标题 · 15px / 600</AfTitle>
              <AfParagraph>
                正文标准 13.5px / 21px 行高，保证中文与拉丁 Inter 混排清晰克制；所有指标金额与时间戳必须使用{" "}
                <AfText numeric strong>
                  1,284,620 · 99.94% · 00:14:28
                </AfText>{" "}
                等宽数字。
              </AfParagraph>
              <AfInline gap="inline">
                <AfText tone="muted">辅助说明 12px (--af-muted)</AfText>
                <AfText code>--af-mono</AfText>
              </AfInline>
            </AfStack>
          </AfCard>
        </AfSection>
      </AfColumns>
    </AfPage>
  );
}

function BeforeAfterCompareDemo() {
  return (
    <AfPage maxWidth="wide">
      <AfPageHeader
        title="反模式 vs 规范拼装对照"
        description="用纯基础组件搭界面时最容易踩的 4 类间距与层级问题，对照一眼看清差距。"
      />

      <AfColumns columns={2} gap="block">
        {/* 对比 1：工具栏同高对齐 */}
        <AfCard
          title="① 工具栏控件高度与间距"
          extra={<AfTag size="xs" tone="danger" variant="soft">反模式</AfTag>}
        >
          <AfStack gap="group">
            <div className="af-lg-bad-box">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
                <AfInput size="sm" placeholder="搜索..." style={{ width: 140 }} />
                <AfSelect
                  size="lg"
                  aria-label="反面下拉"
                  defaultValue="a"
                  style={{ width: 110 }}
                  options={[{ value: "a", label: "高 36px" }]}
                />
                <AfButton size="xs" variant="primary">
                  新建
                </AfButton>
              </div>
            </div>
            <AfText tone="muted">问题：混用 sm(28) / lg(36) / xs(24)，顶部对齐高低错落且 3px 间距粘连。</AfText>
          </AfStack>
        </AfCard>

        <AfCard
          title="① 工具栏控件高度与间距"
          extra={<AfTag size="xs" tone="success" variant="soft">规范写法</AfTag>}
        >
          <AfStack gap="group">
            <AfToolbar
              surface="sunken"
              leading={
                <>
                  <AfInput size="sm" leadingIcon="search" placeholder="搜索..." style={{ width: 150 }} />
                  <AfSelect
                    size="sm"
                    aria-label="规范下拉"
                    defaultValue="a"
                    style={{ width: 110 }}
                    options={[{ value: "a", label: "同高 28px" }]}
                  />
                </>
              }
              trailing={
                <AfButton size="sm" variant="primary" icon="plus">
                  新建
                </AfButton>
              }
            />
            <AfText tone="muted">规范：统一 size=&quot;sm&quot;，AfToolbar 自动左右推开并保持 8px 间距与光学居中。</AfText>
          </AfStack>
        </AfCard>

        {/* 对比 2：卡内嵌套层级 */}
        <AfCard
          title="② 卡片内部二次分组"
          extra={<AfTag size="xs" tone="danger" variant="soft">反模式</AfTag>}
        >
          <AfStack gap="group">
            <AfCard title="外层卡片内再套 AfCard">
              <AfCard title="重复的白底 + 双层阴影环">
                <AfText tone="muted">两层相同的 --af-surface 与 --af-shadow-card 叠在一起，视觉厚重发虚。</AfText>
              </AfCard>
            </AfCard>
          </AfStack>
        </AfCard>

        <AfCard
          title="② 卡片内部二次分组"
          extra={<AfTag size="xs" tone="success" variant="soft">规范写法</AfTag>}
        >
          <AfStack gap="group">
            <AfSurface level="sunken" bordered padding="sm" radius="md">
              <AfStack gap="micro">
                <AfText strong>使用 AfSurface level=&quot;sunken&quot;</AfText>
                <AfText tone="muted">卡内二级参数区下沉一级底色 + 1px 极淡内环，层次安静清爽，零重影边框。</AfText>
              </AfStack>
            </AfSurface>
            <AfText tone="muted">规范：外层 AfCard (--af-surface) → 内层 AfSurface level=&quot;sunken&quot; (--af-surface-sunken)。</AfText>
          </AfStack>
        </AfCard>

        {/* 对比 3：按钮顺序与危险区 */}
        <AfCard
          title="③ 表单/弹窗操作栏排序"
          extra={<AfTag size="xs" tone="danger" variant="soft">反模式</AfTag>}
        >
          <AfStack gap="group">
            <div className="af-lg-bad-box">
              <div style={{ display: "flex", gap: 4 }}>
                <AfButton variant="primary">保存</AfButton>
                <AfButton variant="danger">删除账号</AfButton>
                <AfButton variant="secondary">取消</AfButton>
              </div>
            </div>
            <AfText tone="muted">问题：主操作靠左、危险操作紧挨主按钮，极易误点。</AfText>
          </AfStack>
        </AfCard>

        <AfCard
          title="③ 表单/弹窗操作栏排序"
          extra={<AfTag size="xs" tone="success" variant="soft">规范写法</AfTag>}
        >
          <AfStack gap="group">
            <AfSurface level="sunken" bordered padding="sm" radius="md">
              <AfInline justify="between" gap="group">
                <AfButton variant="danger" size="sm">
                  删除账号
                </AfButton>
                <AfInline gap="inline">
                  <AfButton variant="secondary" size="sm">
                    取消
                  </AfButton>
                  <AfButton variant="primary" size="sm">
                    保存更改
                  </AfButton>
                </AfInline>
              </AfInline>
            </AfSurface>
            <AfText tone="muted">规范：危险操作隔离到最左侧，主操作区靠右且严格「左次右主」+ 8px 间距。</AfText>
          </AfStack>
        </AfCard>
      </AfColumns>
    </AfPage>
  );
}

function LayoutGuideSpecimen() {
  const outer = useAsterTheme();
  const [tab, setTab] = useState<GuideTab>("workbench");
  const [density, setDensity] = useState<AsterDensity>("comfortable");
  const [radius, setRadius] = useState<AsterRadiusScale>("md");
  const [blueprint, setBlueprint] = useState(false);

  return (
    <div className="af-lg-shell">
      <div className="af-lg-bar">
        <AfSegmented<GuideTab>
          size="sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: "workbench", label: "工作台实战" },
            { value: "settings", label: "设置与表单" },
            { value: "tokens", label: "间距与标尺" },
            { value: "compare", label: "正反对照" },
          ]}
        />
        <div className="af-lg-bar__controls">
          <div className="af-lg-ctrl">
            <span className="af-lg-ctrl__label">密度</span>
            <AfSegmented<AsterDensity>
              size="xs"
              value={density}
              onChange={setDensity}
              options={[
                { value: "comfortable", label: "标准" },
                { value: "compact", label: "紧凑" },
              ]}
            />
          </div>
          <div className="af-lg-ctrl">
            <span className="af-lg-ctrl__label">圆角</span>
            <AfSegmented<AsterRadiusScale>
              size="xs"
              value={radius}
              onChange={setRadius}
              options={[
                { value: "sm", label: "SM" },
                { value: "md", label: "MD" },
                { value: "lg", label: "LG" },
              ]}
            />
          </div>
          <label className="af-lg-ctrl" style={{ cursor: "pointer" }}>
            <span className="af-lg-ctrl__label">间距标注</span>
            <AfSwitch size="sm" checked={blueprint} onChange={setBlueprint} aria-label="显示间距标注" />
          </label>
        </div>
      </div>

      <AsterThemeProvider
        mode={outer.resolved}
        accent={outer.accent}
        density={density}
        radius={radius}
        storage={false}
      >
        <div className="af-lg-viewport">
          <div className="af-lg-canvas" data-blueprint={blueprint || undefined}>
            {tab === "workbench" ? (
              <WorkbenchCompositionDemo blueprint={blueprint} density={density} />
            ) : tab === "settings" ? (
              <SettingsFormCompositionDemo blueprint={blueprint} />
            ) : tab === "tokens" ? (
              <TokenRulerDemo density={density} />
            ) : (
              <BeforeAfterCompareDemo />
            )}
          </div>
        </div>
      </AsterThemeProvider>
    </div>
  );
}

/** 基础组件排版与间距规范示范页。 */
export const layoutGuideSpecs: ComponentSpec[] = [
  {
    id: "layout-guide",
    title: "Layout & Spacing Guide",
    group: "基础控件",
    source: "project",
    note: "纯基础组件拼装规范实景页：内置 AfPage / AfPageHeader / AfSection / AfStack / AfInline / AfColumns / AfToolbar / AfListRow 九级语义间距原语，支持实时切换舒适/紧凑密度与间距标注。",
    render: LayoutGuideSpecimen,
    width: 1060,
    height: 680,
  },
];

void AfSpacer;
