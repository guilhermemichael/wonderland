"use client";

import { useEffect } from "react";
import { initializeAnalytics } from "../lib/analytics";

export function AnalyticsBootstrap() {
  useEffect(() => initializeAnalytics(), []);
  return null;
}
