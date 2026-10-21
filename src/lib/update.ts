// Updates apply only on the next launch from the start screen, never mid-round.
let pending: null | ((reloadPage?: boolean) => Promise<void>) = null;

export function registerUpdates(): void {
  if (!("serviceWorker" in navigator)) return;
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateFn = registerSW({
        immediate: true,
        onNeedRefresh() {
          pending = updateFn;
        },
      });
    })
    .catch(() => {});
}

/** True when an update was pending: the page reloads shortly, so the caller must not start a round. */
export function applyPendingUpdate(): boolean {
  if (!pending) return false;
  const fn = pending;
  pending = null;
  void fn(true).catch(() => {});
  return true;
}
