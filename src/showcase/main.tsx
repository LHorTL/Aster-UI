import { createRoot } from "react-dom/client";
import { AsterThemeProvider, readThemeUrlMode } from "../theme";
import "../styles.css";
import "./app.css";
import { Showcase } from "./Showcase";

const params = new URLSearchParams(location.search);
const embed = params.get("embed") === "1";

createRoot(document.getElementById("root")!).render(
  <AsterThemeProvider
    defaultMode="system"
    initialMode={readThemeUrlMode(params.get("theme"))}
    initialAccent={params.get("accent") ?? undefined}
    className={embed ? "ast ast--embed" : "ast"}
  >
    <Showcase />
  </AsterThemeProvider>,
);
