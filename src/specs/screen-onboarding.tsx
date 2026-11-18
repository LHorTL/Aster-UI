import { useState } from "react";
import {
  AfAppShellFlat,
  AfOnboarding,
  AfOnboardingBrand,
  AfOnboardingReady,
  AfOnboardingTone,
  AfOnboardingWebsite,
  type AfOnboardingLengthKind,
  type AfOnboardingToneKind,
} from "../components/screens-onboarding";
import type { ComponentSpec } from "../types";

/** 4 步 Assistant Onboarding 可联动舞台宿主：每个条目默认落在自身步骤，同时点击 Continue / Back / Edit 可完整体验仪表盘纵向滑移闭环。 */
function AssistantOnboardingSpecimen({ initialStep }: { initialStep: 1 | 2 | 3 | 4 }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialStep);
  const [domains, setDomains] = useState<string[]>(() => (initialStep === 1 ? [] : ["northwind.com"]));
  const [names, setNames] = useState<string[]>(() =>
    initialStep <= 2 ? ["Northwind"] : ["Northwind", "Northwind Co."],
  );
  const [assistantName, setAssistantName] = useState("Northwind Assistant");
  const [tone, setTone] = useState<AfOnboardingToneKind>("neutral");
  const [length, setLength] = useState<AfOnboardingLengthKind>("balanced");
  const [handoverTo, setHandoverTo] = useState("support@northwind.com");

  const primaryDomain = domains[0] ?? "northwind.com";
  const primaryBrand = names[0] ?? "Northwind";
  const aliases = names.slice(1);

  if (step === 1) {
    return (
      <AfOnboardingWebsite
        defaultDomains={domains}
        onContinue={(nextDomains) => {
          setDomains(nextDomains);
          setStep(2);
        }}
      />
    );
  }

  if (step === 2) {
    return (
      <AfOnboardingBrand
        domain={primaryDomain}
        defaultNames={names}
        onBack={() => setStep(1)}
        onContinue={(nextNames) => {
          setNames(nextNames);
          if (nextNames[0]) setAssistantName(`${nextNames[0]} Assistant`);
          setStep(3);
        }}
      />
    );
  }

  if (step === 3) {
    return (
      <AfOnboardingTone
        domain={primaryDomain}
        brand={primaryBrand}
        aliases={aliases}
        defaultName={assistantName}
        defaultTone={tone}
        defaultLength={length}
        defaultHandover={Boolean(handoverTo)}
        defaultEmail={handoverTo || `support@${primaryDomain}`}
        onBack={() => setStep(2)}
        onContinue={(values) => {
          setAssistantName(values.name);
          setTone(values.tone);
          setLength(values.length);
          setHandoverTo(values.handover ? values.email : "");
          setStep(4);
        }}
      />
    );
  }

  return (
    <AfOnboardingReady
      domains={domains.length > 0 ? domains : ["northwind.com"]}
      brand={primaryBrand}
      aliases={aliases}
      name={assistantName}
      tone={tone}
      length={length}
      handoverTo={handoverTo}
      onBack={() => setStep(3)}
      onEdit={(targetStep) => setStep(targetStep)}
    />
  );
}

function AppShellFlatSpecimen() {
  return <AfAppShellFlat />;
}

function OnboardingWorkspaceSpecimen() {
  return <AfOnboarding defaultStep={2} defaultInvites={["jamie@acme.com"]} />;
}

function OnboardingWebsiteSpecimen() {
  return <AssistantOnboardingSpecimen initialStep={1} />;
}

function OnboardingBrandSpecimen() {
  return <AssistantOnboardingSpecimen initialStep={2} />;
}

function OnboardingToneSpecimen() {
  return <AssistantOnboardingSpecimen initialStep={3} />;
}

function OnboardingReadySpecimen() {
  return <AssistantOnboardingSpecimen initialStep={4} />;
}

export const screenOnboardingSpecs: ComponentSpec[] = [
  {
    id: "app-shell-flat",
    title: "App Shell Flat",
    group: "Screens",
    source: "pro",
    note: "单发丝线三栏无边工作台外壳：灰色可折叠侧栏 + 无边主画布 + 顶栏融合多标签工作区（终端/浏览器/便签/文档）。",
    render: AppShellFlatSpecimen,
    height: 672,
  },
  {
    id: "onboarding",
    title: "Onboarding",
    group: "Screens",
    source: "pro",
    note: "AI 工作区首次启动整页向导：工作区命名、工具开关连接、团队邮件芯片邀请与首个 Agent 模板创建。",
    render: OnboardingWorkspaceSpecimen,
    height: 672,
  },
  {
    id: "onboarding-website",
    title: "Onboarding / Website",
    group: "Screens",
    source: "pro",
    note: "AI 助手引导第 1/4 步：添加官网、文档与帮助中心域名芯片，右侧仪表盘实时同步知识源。",
    render: OnboardingWebsiteSpecimen,
    height: 672,
  },
  {
    id: "onboarding-brand",
    title: "Onboarding / Brand",
    group: "Screens",
    source: "pro",
    note: "AI 助手引导第 2/4 步：自动由主域名推导品牌名并支持简称芯片，右侧同步助手身份卡与问候语。",
    render: OnboardingBrandSpecimen,
    height: 672,
  },
  {
    id: "onboarding-tone",
    title: "Onboarding / Tone",
    group: "Screens",
    source: "pro",
    note: "AI 助手引导第 3/4 步：配置名称、口吻、详略与人工转接开关，右侧滑移聚焦测试对话实时重绘回复文案。",
    render: OnboardingToneSpecimen,
    height: 672,
  },
  {
    id: "onboarding-ready",
    title: "Onboarding / Ready",
    group: "Screens",
    source: "pro",
    note: "AI 助手引导第 4/4 步：语义化描述列表核对配置并支持跳步编辑，一键进入实时工作台。",
    render: OnboardingReadySpecimen,
    height: 672,
  },
];
