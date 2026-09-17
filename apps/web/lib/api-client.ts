const DEFAULT_PRODUCTION_API_URL = "https://wonderland-api-wmxc.onrender.com";
const DEFAULT_DEVELOPMENT_API_URL = "http://localhost:8000";

export function apiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const fallbackUrl = process.env.NODE_ENV === "production"
    ? DEFAULT_PRODUCTION_API_URL
    : DEFAULT_DEVELOPMENT_API_URL;

  const base = (envUrl ?? fallbackUrl).replace(/\/$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

export function apiEventsUrl(): string {
  const base = apiBaseUrl();
  return base.endsWith("/events") ? base : `${base}/events`;
}
