"use client";

import { useEffect } from "react";
import { initializeAnalytics } from "../lib/analytics";
import { fetchOrInitializeSession } from "../lib/session";

export function AnalyticsBootstrap() {
  useEffect(() => {
    fetchOrInitializeSession().then(() => {
      initializeAnalytics();
    });
  }, []);
  return null;
}
