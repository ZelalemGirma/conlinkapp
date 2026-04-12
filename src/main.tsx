import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const PREVIEW_SW_RESET_KEY = "conlink-preview-sw-reset";
const APP_CACHE_PREFIX = "conlink-";
const shouldDisableServiceWorker =
  import.meta.env.DEV ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("id-preview--");

const disablePreviewServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return false;

  const hadController = Boolean(navigator.serviceWorker.controller);
  const registrations = await navigator.serviceWorker.getRegistrations();

  await Promise.allSettled(
    registrations.map((registration) => registration.unregister())
  );

  if ("caches" in window) {
    const cacheKeys = await caches.keys();
    await Promise.allSettled(
      cacheKeys
        .filter((cacheKey) => cacheKey.startsWith(APP_CACHE_PREFIX))
        .map((cacheKey) => caches.delete(cacheKey))
    );
  }

  return hadController || registrations.length > 0;
};

if (shouldDisableServiceWorker && "serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    () => {
      void disablePreviewServiceWorker();
    },
    { once: true }
  );
}

const bootstrap = async () => {
  if (shouldDisableServiceWorker) {
    const didReset = await disablePreviewServiceWorker();
    const alreadyReloaded =
      sessionStorage.getItem(PREVIEW_SW_RESET_KEY) === "true";

    if (didReset && !alreadyReloaded) {
      sessionStorage.setItem(PREVIEW_SW_RESET_KEY, "true");
      window.location.reload();
      return;
    }

    sessionStorage.removeItem(PREVIEW_SW_RESET_KEY);
  }

  createRoot(document.getElementById("root")!).render(<App />);
};

void bootstrap();
