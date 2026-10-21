import { createRoot } from "react-dom/client";
import App from "./App";
import Parent from "./parent/Parent";
import { useHashRoute } from "./router";
import { registerUpdates } from "./lib/update";
import { initSession } from "./store/session";
import "./styles.css";

function Root() {
  return useHashRoute() === "parent" ? <Parent onExit={() => { location.hash = "#/"; }} /> : <App />;
}

// No StrictMode: its dev double-mount breaks the units' anti-repeat picks
// (the real mount reads the ghost mount's last prompt).
registerUpdates();
const root = createRoot(document.getElementById("root")!);
// Fail-soft: no IndexedDB still renders the game on empty state.
initSession()
  .catch(() => {})
  .then(() => root.render(<Root />));
