// ============================================================
// KesslerX Handoff API Hook
// Follows the existing useKesslerAPI.ts patterns
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  HandoffUser, HandoffEvent, Handoff, TimelineEntry,
  HandoffCreatePayload,
} from '../data/handoffTypes';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ============================================================
// Generic fetch helper
// ============================================================

async function handoffFetch<T>(
  url: string,
  options?: RequestInit & { userId?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.userId ? { 'x-user-id': options.userId } : {}),
  };

  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> || {}) },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// Data Fetching Hooks
// ============================================================

export function useUsers() {
  const [users, setUsers] = useState<HandoffUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await handoffFetch<{ users: HandoffUser[] }>(`${API}/api/users`);
      setUsers(data.users);
    } catch (err) {
      console.warn('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { users, loading, refresh };
}

export function useEvents() {
  const [events, setEvents] = useState<HandoffEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await handoffFetch<{ events: HandoffEvent[] }>(`${API}/api/events`);
      setEvents(data.events);
    } catch (err) {
      console.warn('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { events, loading, refresh };
}

export function useEvent(eventId: string) {
  const [event, setEvent] = useState<HandoffEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    try {
      const data = await handoffFetch<HandoffEvent>(`${API}/api/events/${eventId}`);
      setEvent(data);
    } catch (err) {
      console.warn('Failed to fetch event:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { event, loading, refresh };
}

export function useEventHandoffs(eventId: string) {
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    try {
      const data = await handoffFetch<{ handoffs: Handoff[] }>(
        `${API}/api/events/${eventId}/handoffs`
      );
      setHandoffs(data.handoffs);
    } catch (err) {
      console.warn('Failed to fetch handoffs:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { handoffs, loading, refresh };
}

export function useEventTimeline(eventId: string) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    try {
      const data = await handoffFetch<{ timeline: TimelineEntry[] }>(
        `${API}/api/events/${eventId}/timeline`
      );
      setTimeline(data.timeline);
    } catch (err) {
      console.warn('Failed to fetch timeline:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { timeline, loading, refresh };
}

export function usePendingHandoffs(userId: string) {
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const data = await handoffFetch<{ handoffs: Handoff[] }>(
        `${API}/api/handoffs/pending`,
        { userId }
      );
      if (mountedRef.current) setHandoffs(data.handoffs);
    } catch (err) {
      console.warn('Failed to fetch pending handoffs:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const interval = setInterval(refresh, 10000); // Poll every 10s
    return () => { mountedRef.current = false; clearInterval(interval); };
  }, [refresh]);

  return { handoffs, loading, refresh };
}

export function useHandoff(handoffId: string) {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!handoffId) return;
    try {
      const data = await handoffFetch<Handoff>(`${API}/api/handoffs/${handoffId}`);
      setHandoff(data);
    } catch (err) {
      console.warn('Failed to fetch handoff:', err);
    } finally {
      setLoading(false);
    }
  }, [handoffId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { handoff, loading, refresh };
}

// ============================================================
// Action Functions
// ============================================================

export async function createHandoff(
  eventId: string,
  payload: HandoffCreatePayload,
  userId: string,
): Promise<Handoff> {
  return handoffFetch<Handoff>(`${API}/api/events/${eventId}/handoffs`, {
    method: 'POST',
    body: JSON.stringify(payload),
    userId,
  });
}

export async function generateNote(handoffId: string): Promise<Handoff> {
  return handoffFetch<Handoff>(`${API}/api/handoffs/${handoffId}/generate-note`, {
    method: 'POST',
  });
}

export async function updateNote(handoffId: string, note: string): Promise<Handoff> {
  return handoffFetch<Handoff>(`${API}/api/handoffs/${handoffId}/update-note`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function confirmTransfer(handoffId: string, userId: string): Promise<Handoff> {
  return handoffFetch<Handoff>(`${API}/api/handoffs/${handoffId}/confirm`, {
    method: 'POST',
    userId,
  });
}

export async function acceptHandoff(handoffId: string, userId: string): Promise<Handoff> {
  return handoffFetch<Handoff>(`${API}/api/handoffs/${handoffId}/accept`, {
    method: 'POST',
    userId,
  });
}

export async function requestClarification(
  handoffId: string, userId: string, message: string,
): Promise<Handoff> {
  return handoffFetch<Handoff>(`${API}/api/handoffs/${handoffId}/clarification`, {
    method: 'POST',
    body: JSON.stringify({ message }),
    userId,
  });
}

export async function rejectHandoff(
  handoffId: string, userId: string, reason: string, reassignTo?: string,
): Promise<Handoff> {
  return handoffFetch<Handoff>(`${API}/api/handoffs/${handoffId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason, reassign_to_user_id: reassignTo || '' }),
    userId,
  });
}

export async function checkTimeouts(timeout?: number): Promise<any> {
  const url = timeout
    ? `${API}/api/handoffs/check-timeouts?timeout=${timeout}`
    : `${API}/api/handoffs/check-timeouts`;
  return handoffFetch(url, { method: 'POST' });
}

export async function triggerEscalation(handoffId: string): Promise<Handoff> {
  return handoffFetch<Handoff>(`${API}/api/handoffs/${handoffId}/escalate`, {
    method: 'POST',
  });
}
