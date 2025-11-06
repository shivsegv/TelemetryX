import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentSummary, TelemetryRecord } from "../types";

const API_BASE = "/api";
export const HISTORY_LIMIT = 120;

interface UseTelemetryReturn {
  agents: AgentSummary[];
  loading: boolean;
  error?: string;
  history: TelemetryRecord[];
  latest?: TelemetryRecord;
  refreshAgents: () => Promise<void>;
}

export function useTelemetryData(agentId: string | null): UseTelemetryReturn {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [history, setHistory] = useState<TelemetryRecord[]>([]);
  const [latest, setLatest] = useState<TelemetryRecord | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const retryDelayRef = useRef<number>(1000);

  const refreshAgents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/metrics`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`metrics overview request failed (${res.status})`);
      }
      const data = (await res.json()) as { agents?: { agentId: string; latest?: TelemetryRecord }[] };
      const summaries = (data.agents ?? []).map((entry) => ({
        agentId: entry.agentId,
        latest: entry.latest
      }));
      setAgents(summaries);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    refreshAgents();
  }, [refreshAgents]);

  useEffect(() => {
    if (!agentId) {
      setHistory([]);
      setLatest(undefined);
      return;
    }

    const id = agentId;
    let cancelled = false;

    async function bootstrap() {
      setLoading(true);
      setError(undefined);

      try {
        const res = await fetch(
          `${API_BASE}/metrics?agent_id=${encodeURIComponent(id)}&limit=${HISTORY_LIMIT}`
        );
        if (!res.ok) {
          throw new Error(`history request failed (${res.status})`);
        }
        const data = (await res.json()) as { records: TelemetryRecord[] };
        if (!cancelled) {
          const ordered = [...(data.records ?? [])].sort(
            (a: TelemetryRecord, b: TelemetryRecord) =>
              new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime()
          );
          setHistory(ordered);
          setLatest(ordered[ordered.length - 1]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [agentId]);

  useEffect(() => {
    if (!agentId) {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      return;
    }

    const id = agentId;
    retryDelayRef.current = 1000;
    let disposed = false;

    const scheduleReconnect = () => {
      if (disposed) {
        return;
      }
      const delay = retryDelayRef.current;
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        // Cap exponential backoff at 30s to balance load and responsiveness.
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, 30000);
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposed) {
        return;
      }
      const source = new EventSource(`${API_BASE}/metrics/stream?agent_id=${encodeURIComponent(id)}`);
      eventSourceRef.current = source;

      source.onopen = () => {
        retryDelayRef.current = 1000;
      };

      source.onmessage = (event) => {
        const payload = JSON.parse(event.data) as TelemetryRecord;
        setHistory((prev: TelemetryRecord[]) => {
          const next = [...prev, payload];
          const deduped = Array.from(
            next.reduce((map, record) => map.set(record.collectedAt, record), new Map<string, TelemetryRecord>()).values()
          ).sort(
            (a: TelemetryRecord, b: TelemetryRecord) =>
              new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime()
          );
          return deduped.slice(-HISTORY_LIMIT);
        });
        setAgents((prev) => {
          const seen = new Set(prev.map((agent) => agent.agentId));
          const updated = prev.map((agent) =>
            agent.agentId === payload.agentId ? { ...agent, latest: payload } : agent
          );
          if (seen.has(payload.agentId)) {
            return updated;
          }
          return [...updated, { agentId: payload.agentId, latest: payload }];
        });
        setLatest((current) => {
          if (!current) {
            return payload;
          }
          const currentTs = new Date(current.collectedAt).getTime();
          const nextTs = new Date(payload.collectedAt).getTime();
          return nextTs >= currentTs ? payload : current;
        });
      };

      source.onerror = () => {
        source.close();
        if (eventSourceRef.current === source) {
          eventSourceRef.current = null;
        }
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      disposed = true;
      const current = eventSourceRef.current;
      if (current) {
        current.close();
        if (eventSourceRef.current === current) {
          eventSourceRef.current = null;
        }
      }
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [agentId]);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, []);

  const enrichedAgents = useMemo(() => {
    if (!agents.length) {
      return agents;
    }
    if (!history.length) {
      return agents;
    }
    const latestById = new Map(history.map((record: TelemetryRecord) => [record.agentId, record] as const));
    return agents.map((agent: AgentSummary) => ({
      ...agent,
      latest: latestById.get(agent.agentId) ?? agent.latest
    }));
  }, [agents, history]);

  return {
    agents: enrichedAgents,
    history,
    latest,
    loading,
    error,
    refreshAgents
  };
}
