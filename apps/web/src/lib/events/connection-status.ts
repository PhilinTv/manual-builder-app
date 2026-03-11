export type ConnectionStatus = "connected" | "connecting" | "disconnected";

const DISCONNECT_THRESHOLD_MS = 10_000;

export function createConnectionStatusTracker() {
  let showIndicator = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let currentStatus: ConnectionStatus = "connecting";
  const subscribers: Array<(show: boolean) => void> = [];

  function notify() {
    for (const fn of subscribers) {
      fn(showIndicator);
    }
  }

  function update(status: ConnectionStatus) {
    currentStatus = status;

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    if (status === "disconnected") {
      timer = setTimeout(() => {
        showIndicator = true;
        notify();
      }, DISCONNECT_THRESHOLD_MS);
    } else {
      if (showIndicator) {
        showIndicator = false;
        notify();
      }
    }
  }

  function shouldShowIndicator() {
    return showIndicator;
  }

  function subscribe(fn: (show: boolean) => void) {
    subscribers.push(fn);
    return () => {
      const idx = subscribers.indexOf(fn);
      if (idx >= 0) subscribers.splice(idx, 1);
    };
  }

  function destroy() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    showIndicator = false;
    subscribers.length = 0;
  }

  return { update, shouldShowIndicator, subscribe, destroy };
}
