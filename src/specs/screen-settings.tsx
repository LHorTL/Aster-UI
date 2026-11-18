import { useState } from "react";
import {
  AfSettingsGeneral,
  AfSettingsMembers,
  AfSettingsModels,
  AfSettingsNotifications,
  AfSettingsPreferences,
  AfSettingsPrivacy,
  AfSettingsProfile,
  AfSettingsSecurity,
  AfSettingsSubscription,
  resolveSettingsSlug,
  type AfSettingsSlug,
} from "../components/screens-settings";
import type { ComponentSpec } from "../types";

/**
 * Interactive 9-page Settings Suite stage host:
 * Each entry opens directly on its target page (`initialSlug`), while clicking any sidebar item
 * (or "Manage members" / "+" in Billing) switches seamlessly across all 9 pages inside the shell.
 */
function SettingsSuiteSpecimen({ initialSlug }: { initialSlug: AfSettingsSlug }) {
  const [activeSlug, setActiveSlug] = useState<AfSettingsSlug>(initialSlug);

  const handleNavigate = (label: string) => {
    const target = resolveSettingsSlug(label);
    if (target) setActiveSlug(target);
  };

  switch (activeSlug) {
    case "settings-general":
      return <AfSettingsGeneral onNavigate={handleNavigate} />;
    case "settings-members":
      return <AfSettingsMembers onNavigate={handleNavigate} />;
    case "settings-models":
      return <AfSettingsModels onNavigate={handleNavigate} />;
    case "settings-notifications":
      return <AfSettingsNotifications onNavigate={handleNavigate} />;
    case "settings-preferences":
      return <AfSettingsPreferences onNavigate={handleNavigate} />;
    case "settings-privacy":
      return <AfSettingsPrivacy onNavigate={handleNavigate} />;
    case "settings-profile":
      return <AfSettingsProfile onNavigate={handleNavigate} />;
    case "settings-security":
      return <AfSettingsSecurity onNavigate={handleNavigate} />;
    case "settings-subscription":
      return <AfSettingsSubscription onNavigate={handleNavigate} />;
  }
}

function SettingsGeneralSpecimen() {
  return <SettingsSuiteSpecimen initialSlug="settings-general" />;
}

function SettingsMembersSpecimen() {
  return <SettingsSuiteSpecimen initialSlug="settings-members" />;
}

function SettingsModelsSpecimen() {
  return <SettingsSuiteSpecimen initialSlug="settings-models" />;
}

function SettingsNotificationsSpecimen() {
  return <SettingsSuiteSpecimen initialSlug="settings-notifications" />;
}

function SettingsPreferencesSpecimen() {
  return <SettingsSuiteSpecimen initialSlug="settings-preferences" />;
}

function SettingsPrivacySpecimen() {
  return <SettingsSuiteSpecimen initialSlug="settings-privacy" />;
}

function SettingsProfileSpecimen() {
  return <SettingsSuiteSpecimen initialSlug="settings-profile" />;
}

function SettingsSecuritySpecimen() {
  return <SettingsSuiteSpecimen initialSlug="settings-security" />;
}

function SettingsSubscriptionSpecimen() {
  return <SettingsSuiteSpecimen initialSlug="settings-subscription" />;
}

export const screenSettingsSpecs: ComponentSpec[] = [
  {
    id: "settings-general",
    title: "Settings / General",
    group: "Screens",
    source: "pro",
    note: "工作区通用设置：方形徽标上传与移除、失焦即存名称与 URL 前缀、助手公司上下文（支持展开与 Token 估算）及输名解锁删除危险区。",
    render: SettingsGeneralSpecimen,
    height: 940,
  },
  {
    id: "settings-members",
    title: "Settings / Teams",
    group: "Screens",
    source: "pro",
    note: "成员与团队管理：席位概览指标条、搜索与角色过滤、CSV 导出、行内邮件邀请、批量改角色/席位及移除（本人受保护）与团队分组页签。",
    render: SettingsMembersSpecimen,
    height: 940,
  },
  {
    id: "settings-models",
    title: "Settings / Models",
    group: "Screens",
    source: "pro",
    note: "模型中心设置：默认对话/生图模型与 Auto 路由轮盘说明、按托管区域分组的可折叠模型厂商卡、按模型开关与权限下拉、自定义端点与 BYOK 密钥。",
    render: SettingsModelsSpecimen,
    height: 940,
  },
  {
    id: "settings-notifications",
    title: "Settings / Notifications",
    group: "Screens",
    source: "pro",
    note: "个人通知设置：每日摘要开关与滑入时间选择、周报开关、带表头批量预设的通知事件投递渠道表，以及夜间免打扰时段。",
    render: SettingsNotificationsSpecimen,
    height: 940,
  },
  {
    id: "settings-preferences",
    title: "Settings / Preferences",
    group: "Screens",
    source: "pro",
    note: "个人偏好设置：默认模型与 Auto 轮盘、语言与亮暗外观单选、对话工具复选砖、可暂停保留文案的自定义指令，以及助手记忆管理。",
    render: SettingsPreferencesSpecimen,
    height: 940,
  },
  {
    id: "settings-privacy",
    title: "Settings / Privacy",
    group: "Screens",
    source: "pro",
    note: "隐私与会话设置：遥测与模型训练开关、行内展开 Cookie 细项、邮件订阅、活跃设备登出（本机标识受保护）、分享对话过滤撤销及全量导出/清空。",
    render: SettingsPrivacySpecimen,
    height: 940,
  },
  {
    id: "settings-profile",
    title: "Settings / Profile",
    group: "Screens",
    source: "pro",
    note: "个人资料设置：头像上传与移除、姓名/职位失焦即存、行内改邮箱、时区与周起始日选择、个人助手上下文及密码修改。",
    render: SettingsProfileSpecimen,
    height: 940,
  },
  {
    id: "settings-security",
    title: "Settings / Security",
    group: "Screens",
    source: "pro",
    note: "工作区安全设置：邮箱域名 DNS TXT 验证（解锁域名自动加入与 SAML SSO）、两步验证与会话时长、一键复制 IdP 参数、CIDR 白名单与全员登出。",
    render: SettingsSecuritySpecimen,
    height: 940,
  },
  {
    id: "settings-subscription",
    title: "Settings / Billing",
    group: "Screens",
    source: "pro",
    note: "订阅与账单：当前方案与下期账单明细展开、席位与额度 4 列用量条、月付/年付方案切换与升级卡片、支付方式与历史发票下载。",
    render: SettingsSubscriptionSpecimen,
    height: 940,
  },
];
