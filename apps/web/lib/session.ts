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

import { apiBaseUrl } from "./api-client";

export function getLocalSessionId(): string | undefined {
  return storage()?.getItem(SESSION_KEY) ?? undefined;
}

export async function getCurrentSession(): Promise<SessionState | null> {
  const sessionId = getLocalSessionId();
  if (!sessionId) return null;

  try {
    const response = await fetch(`${apiBaseUrl()}/sessions/${sessionId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.is_expired ? null : data;
  } catch {
    return null;
  }
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
      // Continue to authoritative session creation below.
    }
  }

  try {
    const response = await fetch(`${apiBaseUrl()}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campaign_slug: "wonderland" }),
    });

    if (response.ok) {
      const data = await response.json();
      store.setItem(SESSION_KEY, data.public_session_id);
      return data;
    }
  } catch {
    // Session bootstrap failure is surfaced by callers as unavailable state.
  }

  return null;
}

export async function forceNewSession(): Promise<SessionState | null> {
  const store = storage();
  if (!store) return null;

  try {
    const response = await fetch(`${apiBaseUrl()}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campaign_slug: "wonderland" }),
    });

    if (response.ok) {
      const data = await response.json();
      store.setItem(SESSION_KEY, data.public_session_id);
      return data;
    }
  } catch {
    // Preserve the previous local session identity if creation fails.
  }

  return null;
}

export function clearLocalSessionId(): void {
  storage()?.removeItem(SESSION_KEY);
}

export async function updateSession(
  updates: Partial<Pick<SessionState, "selected_path" | "entry_affinity" | "final_segment">>,
): Promise<boolean> {
  const sessionId = getLocalSessionId();
  if (!sessionId) return false;

  try {
    const response = await fetch(`${apiBaseUrl()}/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(updates),
    });
    return response.ok;
  } catch {
    return false;
  }
}
