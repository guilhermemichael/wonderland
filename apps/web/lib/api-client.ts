export function apiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !envUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is missing in production environment. Failing initialization.");
  }

  const base = (envUrl ?? "http://localhost:8000").replace(/\/$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

export function apiEventsUrl(): string {
  const base = apiBaseUrl();
  return base.endsWith("/events") ? base : `${base}/events`;
}
