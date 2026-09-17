export type SessionState = {
  public_session_id: string;
  campaign_slug: string;
  current_stage: string;
  selected_path?: string;
  entry_affinity?: string;
  final_segment?: string;
  is_expired: boolean;
};

const SESSION_KEY = "wonderland_session_id";

function storage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function apiBaseUrl() {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

export async function fetchOrInitializeSession(): Promise<SessionState | null> {
  const store = storage();
  if (!store) return null;

  const existingId = store.getItem(SESSION_KEY);

  if (existingId) {
    try {
      const response = await fetch(`${apiBaseUrl()}/sessions/${existingId}`);
      if (response.ok) {
        const data = await response.json();
        if (!data.is_expired) {
          return data;
        }
      }
    } catch {
      // Network error, fallback to returning null or we can try creating a new one
    }
  }

  // Create new session
  try {
    const response = await fetch(`${apiBaseUrl()}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        campaign_slug: "wonderland",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      store.setItem(SESSION_KEY, data.public_session_id);
      return data;
    }
  } catch {
    //
  }

  return null;
}

export function getLocalSessionId(): string | undefined {
  return storage()?.getItem(SESSION_KEY) ?? undefined;
}
