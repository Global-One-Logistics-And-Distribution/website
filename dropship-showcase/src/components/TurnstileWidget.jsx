import { useEffect, useRef } from "react";

const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const FALLBACK_SITE_KEY = "0x4AAAAAAC0P9J95dUCXYXRV";

function ensureScriptLoaded() {
  if (window.turnstile) return Promise.resolve();

  const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => resolve(), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.body.appendChild(script);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function TurnstileWidget({ onToken, onExpire, onAvailabilityChange, onServiceError }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || FALLBACK_SITE_KEY;

    const renderWidget = async () => {
      let loaded = false;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        await ensureScriptLoaded();
        if (window.turnstile) {
          loaded = true;
          break;
        }
        await wait(400 * attempt);
      }

      if (!mounted || !containerRef.current || !loaded || !window.turnstile || !siteKey) {
        onAvailabilityChange?.(false);
        onServiceError?.("Turnstile service is temporarily unavailable. Please try again in a moment.");
        return;
      }

      onAvailabilityChange?.(true);
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => {
          onToken?.(token);
        },
        "expired-callback": () => {
          onExpire?.();
          onToken?.("");
        },
        "error-callback": () => {
          onToken?.("");
          onAvailabilityChange?.(false);
          onServiceError?.("Cloudflare Turnstile could not complete verification. Check your network and retry.");
        },
      });
    };

    renderWidget();

    return () => {
      mounted = false;
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [onToken, onExpire, onAvailabilityChange, onServiceError]);

  return <div ref={containerRef} className="flex justify-center" />;
}
