import { describe, it, expect, beforeEach } from 'vitest';
import { trackEvent } from './analytics';

describe('Analytics sequence allocation', () => {
  beforeEach(() => {
    if (typeof globalThis.window === 'undefined') {
      const store: Record<string, string> = {};
      (globalThis as any).window = {
        addEventListener: () => {},
        localStorage: {
          getItem: (key: string) => store[key] || null,
          setItem: (key: string, val: string) => { store[key] = val; },
          clear: () => { for (const key in store) delete store[key]; }
        }
      };
    } else if (window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('allocates positive bounded integers even when localStorage is unavailable for sequence', () => {
    // Mock getItem to simulate Date.now() bug scenario (e.g. storage error)
    const originalGetItem = window.localStorage.getItem;
    const originalSetItem = window.localStorage.setItem;
    
    let simulatedSequenceError = true;
    
    window.localStorage.getItem = (key: string) => {
      if (key === 'wonderland_client_sequence' && simulatedSequenceError) {
        throw new Error("Simulated storage error");
      }
      return originalGetItem.call(window.localStorage, key);
    };
    
    window.localStorage.setItem = (key: string, value: string) => {
      if (key === 'wonderland_client_sequence' && simulatedSequenceError) {
        throw new Error("Simulated storage error");
      }
      return originalSetItem.call(window.localStorage, key, value);
    };

    try {
      trackEvent({ event_name: 'rabbit_started', page: 'test', properties: { host: 'test' } });
      trackEvent({ event_name: 'rabbit_watch_seen', page: 'test', properties: { host: 'test' } });
      
      const queueRaw = originalGetItem.call(window.localStorage, 'wonderland_event_queue');
      const queue = JSON.parse(queueRaw || '[]');
      
      expect(queue.length).toBe(2);
      const e1 = queue[0];
      const e2 = queue[1];
      
      // Sequence must not be Date.now() which is > 1 trillion
      expect(e1.client_sequence).toBeLessThan(100000000);
      expect(e1.client_sequence).toBeGreaterThan(0);
      expect(e2.client_sequence).toBeGreaterThan(e1.client_sequence);
      expect(Number.isInteger(e1.client_sequence)).toBe(true);
      expect(Number.isInteger(e2.client_sequence)).toBe(true);
    } finally {
      window.localStorage.getItem = originalGetItem;
      window.localStorage.setItem = originalSetItem;
    }
  });
});
