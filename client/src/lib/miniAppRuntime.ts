function hasMiniAppLaunchMarker() {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname.toLowerCase();
  if (hostname === "bota.bantah.fun" || hostname === "battle.bantah.fun") {
    return true;
  }

  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, "");
  if (pathname === "/bota") {
    return true;
  }

  const params = new URLSearchParams(window.location.search);
  const explicitValue =
    params.get("miniApp") ||
    params.get("miniapp") ||
    params.get("fcMiniApp") ||
    params.get("fc_miniapp");

  if (explicitValue && ["1", "true", "yes", "farcaster"].includes(explicitValue.toLowerCase())) {
    return true;
  }

  return params.has("fc_frame") || params.has("fcFrame");
}

export async function signalFarcasterMiniAppReady() {
  if (!hasMiniAppLaunchMarker()) return;

  let attempts = 0;
  const maxAttempts = 20;

  const attemptReady = async () => {
    attempts += 1;
    try {
      const { sdk } = await import("@farcaster/miniapp-sdk");
      await sdk.actions.ready();
      return;
    } catch {
      // Ignore outside Farcaster-compatible Mini App hosts.
    }

    if (attempts < maxAttempts) {
      window.setTimeout(attemptReady, 300);
    }
  };

  window.setTimeout(attemptReady, 0);
}
