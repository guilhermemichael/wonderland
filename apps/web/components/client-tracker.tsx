"use client";

import { useEffect, useRef } from "react";
import { trackEvent, EventName } from "../lib/analytics";

export function ClientTracker({ event }: { event: EventName }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackEvent({
        event_name: event,
        page: window.location.pathname,
      });
    }
  }, [event]);

  return null;
}
