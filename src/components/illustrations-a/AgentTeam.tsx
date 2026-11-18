import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { LENA_AVATAR, NOAH_AVATAR, THEO_AVATAR } from "./_avatars";

export type AfAgentTeamTool =
  | "linkedin"
  | "hubspot"
  | "slack"
  | "gmail"
  | "salesforce"
  | "notion"
  | "github"
  | "linear"
  | (string & {});

export interface AfAgentTeamMember {
  role: string;
  avatar: string;
  tools?: (AfAgentTeamTool | ReactNode)[];
}

export interface AfAgentTeamProps {
  /** Prompt typed into the pill before the team is assembled. */
  prompt?: string;
  /** Three agent roles spawned beneath the prompt. */
  members?: [AfAgentTeamMember, AfAgentTeamMember, AfAgentTeamMember];
  /** Accessible description of the illustration. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULT_PROMPT = "Build a team to work my inbound pipeline";

const DEFAULT_MEMBERS: [AfAgentTeamMember, AfAgentTeamMember, AfAgentTeamMember] = [
  { role: "Lead Researcher", avatar: LENA_AVATAR, tools: ["linkedin", "hubspot"] },
  { role: "Inbound Qualifier", avatar: THEO_AVATAR, tools: ["hubspot", "slack"] },
  { role: "Outbound SDR", avatar: NOAH_AVATAR, tools: ["gmail", "salesforce"] },
];

const AGENT_XS = [102, 300, 498] as const;

function renderToolIcon(tool: AfAgentTeamTool | ReactNode): ReactNode {
  if (typeof tool !== "string") return tool;
  switch (tool) {
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <svg x="2" y="2" width="20" height="20" viewBox="0 0 256 256">
            <path
              fill="#0A66C2"
              d="M218.123 218.127h-37.931v-59.403c0-14.165-.253-32.4-19.728-32.4-19.756 0-22.779 15.434-22.779 31.369v60.43h-37.93V95.967h36.413v16.694h.51a39.907 39.907 0 0 1 35.928-19.733c38.445 0 45.533 25.288 45.533 58.186l-.016 67.013ZM56.955 79.27c-12.157.002-22.014-9.852-22.016-22.009-.002-12.157 9.851-22.014 22.008-22.016 12.157-.003 22.014 9.851 22.016 22.008A22.013 22.013 0 0 1 56.955 79.27m18.966 138.858H37.95V95.967h37.97v122.16ZM237.033.018H18.89C8.58-.098.125 8.161-.001 18.471v219.053c.122 10.315 8.576 18.582 18.89 18.474h218.144c10.336.128 18.823-8.139 18.966-18.474V18.454c-.147-10.33-8.635-18.588-18.966-18.453"
            />
          </svg>
        </svg>
      );
    case "hubspot":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#FF7A59"
            d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z"
          />
        </svg>
      );
    case "slack":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <svg x="2" y="2" width="20" height="20" viewBox="0 0 2447.6 2452.5">
            <g clipRule="evenodd" fillRule="evenodd">
              <path
                d="m897.4 0c-135.3.1-244.8 109.9-244.7 245.2-.1 135.3 109.5 245.1 244.8 245.2h244.8v-245.1c.1-135.3-109.5-245.1-244.9-245.3.1 0 .1 0 0 0m0 654h-652.6c-135.3.1-244.9 109.9-244.8 245.2-.2 135.3 109.4 245.1 244.7 245.3h652.7c135.3-.1 244.9-109.9 244.8-245.2.1-135.4-109.5-245.2-244.8-245.3z"
                fill="#36c5f0"
              />
              <path
                d="m2447.6 899.2c.1-135.3-109.5-245.1-244.8-245.2-135.3.1-244.9 109.9-244.8 245.2v245.3h244.8c135.3-.1 244.9-109.9 244.8-245.3zm-652.7 0v-654c.1-135.2-109.4-245-244.7-245.2-135.3.1-244.9 109.9-244.8 245.2v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.3z"
                fill="#2eb67d"
              />
              <path
                d="m1550.1 2452.5c135.3-.1 244.9-109.9 244.8-245.2.1-135.3-109.5-245.1-244.8-245.2h-244.8v245.2c-.1 135.2 109.5 245 244.8 245.2zm0-654.1h652.7c135.3-.1 244.9-109.9 244.8-245.2.2-135.3-109.4-245.1-244.7-245.3h-652.7c-135.3.1-244.9 109.9-244.8 245.2-.1 135.4 109.4 245.2 244.7 245.3z"
                fill="#ecb22e"
              />
              <path
                d="m0 1553.2c-.1 135.3 109.5 245.1 244.8 245.2 135.3-.1 244.9-109.9 244.8-245.2v-245.2h-244.8c-135.3.1-244.9 109.9-244.8 245.2zm652.7 0v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.2v-653.9c.2-135.3-109.4-245.1-244.7-245.3-135.4 0-244.9 109.8-244.8 245.1 0 0 0 .1 0 0"
                fill="#e01e5a"
              />
            </g>
          </svg>
        </svg>
      );
    case "gmail":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <svg x="2" y="2" width="20" height="20" viewBox="0 49.4 512 399.42">
            <g fill="none" fillRule="evenodd">
              <g fillRule="nonzero">
                <path fill="#4285f4" d="M34.91 448.818h81.454V251L0 163.727V413.91c0 19.287 15.622 34.91 34.91 34.91z" />
                <path fill="#34a853" d="M395.636 448.818h81.455c19.287 0 34.909-15.622 34.909-34.909V163.727L395.636 251z" />
                <path fill="#fbbc04" d="M395.636 99.727V251L512 163.727v-46.545c0-43.142-49.25-67.782-83.782-41.891z" />
              </g>
              <path fill="#ea4335" d="M116.364 251V99.727L256 204.455 395.636 99.727V251L256 355.727z" />
              <path fill="#c5221f" fillRule="nonzero" d="M0 117.182v46.545L116.364 251V99.727L83.782 75.291C49.25 49.4 0 74.04 0 117.18z" />
            </g>
          </svg>
        </svg>
      );
    case "salesforce":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <svg x="1" y="1" width="22" height="22" viewBox=".5 .5 999 699.242">
            <path
              fill="#00A1E0"
              d="M416.224 76.763c32.219-33.57 77.074-54.391 126.682-54.391 65.946 0 123.48 36.772 154.12 91.361 26.626-11.896 56.098-18.514 87.106-18.514 118.94 0 215.368 97.268 215.368 217.247 0 119.993-96.428 217.261-215.368 217.261a213.735 213.735 0 0 1-42.422-4.227c-26.981 48.128-78.397 80.646-137.412 80.646-24.705 0-48.072-5.706-68.877-15.853-27.352 64.337-91.077 109.448-165.348 109.448-77.344 0-143.261-48.939-168.563-117.574-11.057 2.348-22.513 3.572-34.268 3.572C75.155 585.74.5 510.317.5 417.262c0-62.359 33.542-116.807 83.378-145.937-10.26-23.608-15.967-49.665-15.967-77.06C67.911 87.25 154.79.5 261.948.5c62.914 0 118.827 29.913 154.276 76.263"
            />
          </svg>
        </svg>
      );
    case "notion":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#171717"
            d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z"
          />
        </svg>
      );
    case "linear":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#5E6AD2"
            d="M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7" fill="#52525b" />
        </svg>
      );
  }
}

type Phase = "typing" | "sent" | "team" | "reset";

/**
 * Animated illustration where a single prompt fans out into a three-agent team with tool badges.
 */
export function AfAgentTeam(props: AfAgentTeamProps = {}) {
  const {
    prompt = DEFAULT_PROMPT,
    members = DEFAULT_MEMBERS,
    label,
    className,
    style,
  } = props;

  const uid = useId().replace(/:/g, "_");
  const [phase, setPhase] = useState<Phase>("typing");
  const [typedLen, setTypedLen] = useState(0);

  useEffect(() => {
    const mq = typeof window !== "undefined" ? window.matchMedia?.("(prefers-reduced-motion: reduce)") : null;
    if (mq?.matches) {
      setTypedLen(prompt.length);
      setPhase("team");
      return;
    }

    let cancelled = false;
    const timers = new Set<number>();
    const wait = (ms: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        if (!cancelled) fn();
      }, ms);
      timers.add(id);
    };

    const runCycle = () => {
      setPhase("typing");
      setTypedLen(0);
      let idx = 0;

      const stepType = () => {
        idx += 1;
        setTypedLen(idx);
        if (idx < prompt.length) {
          const ch = prompt[idx - 1];
          const delay = ch === " " ? 52 : 34 + ((idx * 13) % 24);
          wait(delay, stepType);
        } else {
          wait(260, () => {
            setPhase("sent");
            wait(420, () => {
              setPhase("team");
              wait(3400, () => {
                setPhase("reset");
                wait(620, runCycle);
              });
            });
          });
        }
      };

      wait(260, stepType);
    };

    runCycle();

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [prompt]);

  const ariaLabel =
    label ??
    `A prompt – “${prompt}” – builds a team of three agents: ${members.map((m) => m.role).join(", ")}`;

  const paths = [
    "M300 110C300 162 102 152 102 196",
    "M300 110V196",
    "M300 110C300 162 498 152 498 196",
  ] as const;

  return (
    <div
      className={className ? `ui-atm ${className}` : "ui-atm"}
      data-phase={phase}
      role="img"
      aria-label={ariaLabel}
      style={style}
    >
      <svg className="ui-atm-lines" viewBox="0 0 600 400" aria-hidden="true">
        <defs>
          {paths.map((d, i) => (
            <mask
              key={i}
              id={`ui-atm-${uid}-reveal-${i}`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="600"
              height="400"
            >
              <path className="ui-atm-reveal" d={d} pathLength={1} />
            </mask>
          ))}
        </defs>
        {paths.map((d, i) => (
          <path key={i} className="ui-atm-line" d={d} mask={`url(#ui-atm-${uid}-reveal-${i})`} />
        ))}
      </svg>

      <div className="ui-atm-halo" aria-hidden="true" />

      <div className="ui-atm-prompt" aria-hidden="true">
        <span className="ui-atm-text">
          <bdi className="ui-atm-typed">
            {prompt.slice(0, typedLen)}
            {phase === "typing" ? <span className="ui-atm-caret" /> : null}
          </bdi>
        </span>
        <span className="ui-atm-send">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 18.5v-13M6.5 11 12 5.5l5.5 5.5" />
          </svg>
        </span>
      </div>

      {members.map((member, i) => (
        <div
          key={`${member.role}-${i}`}
          className="ui-atm-agent"
          aria-hidden="true"
          style={
            {
              left: `calc(${AGENT_XS[i]} * var(--u))`,
              "--i": i,
            } as CSSProperties
          }
        >
          <div className="ui-atm-node">
            <span className="ui-atm-face">
              <img alt="" draggable={false} src={member.avatar} />
            </span>
            <span className="ui-atm-dot" />
          </div>
          <div className="ui-atm-role">
            {member.tools && member.tools.length > 0 ? (
              <span className="ui-atm-tools">
                {member.tools.map((tool, tIdx) => (
                  <span key={tIdx} className="ui-atm-tool">
                    {renderToolIcon(tool)}
                  </span>
                ))}
              </span>
            ) : null}
            <span>{member.role}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
