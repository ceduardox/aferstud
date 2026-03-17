import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const handleOpenConversationMessage = (conversationId: number) => {
  if (!Number.isInteger(conversationId) || conversationId <= 0) return;

  const params = new URLSearchParams(window.location.search);
  params.set("conversationId", String(conversationId));
  const nextUrl = `/?${params.toString()}`;
  const requiresRouteChange = window.location.pathname !== "/";
  const historyState = window.history.state;

  if (requiresRouteChange) {
    window.history.pushState(historyState, "", nextUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  } else {
    window.history.replaceState(historyState, "", nextUrl);
  }

  window.dispatchEvent(new CustomEvent("ryz:open-conversation", { detail: { conversationId } }));
};

if (typeof navigator !== "undefined" && navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data as { type?: string; conversationId?: number | null } | undefined;
    if (data?.type !== "RYZ_OPEN_CONVERSATION") return;
    if (typeof data.conversationId !== "number") return;
    handleOpenConversationMessage(data.conversationId);
  });
}

createRoot(document.getElementById("root")!).render(<App />);

const splash = document.getElementById("splash");
if (splash) {
  splash.classList.add("hide");
  const fastConversationLaunch =
    typeof window !== "undefined" &&
    Boolean((window as typeof window & { __FAST_CONVERSATION_LAUNCH__?: boolean }).__FAST_CONVERSATION_LAUNCH__);
  setTimeout(() => splash.remove(), fastConversationLaunch ? 0 : 400);
}
