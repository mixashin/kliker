import { useSyncExternalStore } from "react";

export type Route = "game" | "parent";

const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

const current = (): Route => (location.hash === "#/parent" ? "parent" : "game");

export const useHashRoute = (): Route => useSyncExternalStore(subscribe, current);
