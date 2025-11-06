package server

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"telemetry-agent/internal/server/storage"
)

type httpAPI struct {
	store  *storage.PostgresStore
	logger *slog.Logger
}

// NewHTTPHandler wires HTTP routes that expose telemetry data to the dashboard.
func NewHTTPHandler(store *storage.PostgresStore, logger *slog.Logger) http.Handler {
	h := &httpAPI{store: store, logger: logger}
	mux := http.NewServeMux()

	mux.HandleFunc("/api/metrics", h.handleMetrics)
	mux.HandleFunc("/api/metrics/stream", h.handleStream)
	mux.HandleFunc("/api/agents", h.handleAgents)

	return mux
}

func (h *httpAPI) handleMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	agentID := r.URL.Query().Get("agent_id")
	limitParam := r.URL.Query().Get("limit")

	limit := 60
	if limitParam != "" {
		if parsed, err := strconv.Atoi(limitParam); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	w.Header().Set("Content-Type", "application/json")

	if agentID != "" {
		records, err := h.store.List(ctx, agentID, limit)
		if err != nil {
			h.writeError(w, http.StatusInternalServerError, err)
			return
		}

		if err := json.NewEncoder(w).Encode(map[string]any{
			"agentId": agentID,
			"records": records,
		}); err != nil {
			h.logger.Warn("write metrics response", "agent", agentID, "error", err)
		}
		return
	}

	agents, err := h.store.Agents(ctx)
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err)
		return
	}

	summaries := make([]map[string]any, 0, len(agents))
	for _, id := range agents {
		record, ok, err := h.store.Latest(ctx, id)
		if err != nil {
			h.logger.Error("load latest metric", "agent", id, "error", err)
			continue
		}
		if !ok {
			continue
		}

		summaries = append(summaries, map[string]any{
			"agentId": id,
			"latest":  record,
		})
	}

	if err := json.NewEncoder(w).Encode(map[string]any{"agents": summaries}); err != nil {
		h.logger.Warn("write metrics summary", "error", err)
	}
}

func (h *httpAPI) handleStream(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		h.writeError(w, http.StatusInternalServerError, fmt.Errorf("streaming unsupported"))
		return
	}

	agentID := r.URL.Query().Get("agent_id")
	if agentID == "" {
		h.writeError(w, http.StatusBadRequest, fmt.Errorf("agent_id is required"))
		return
	}

	ctx := r.Context()

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	lastSent := time.Time{}

	if latest, ok, err := h.store.Latest(ctx, agentID); err == nil && ok {
		if payload, err := json.Marshal(latest); err == nil {
			if _, err := fmt.Fprintf(w, "data: %s\n\n", payload); err != nil {
				h.logger.Warn("write initial sse", "agent", agentID, "error", err)
				return
			}
			lastSent = latest.CollectedAt
			flusher.Flush()
		} else {
			h.logger.Warn("marshal initial sse", "error", err)
		}
	} else if err != nil {
		h.logger.Error("load initial metric", "agent", agentID, "error", err)
		return
	}

	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			record, ok, err := h.store.Latest(ctx, agentID)
			if err != nil {
				h.logger.Warn("poll latest metric", "agent", agentID, "error", err)
				continue
			}
			if !ok || !record.CollectedAt.After(lastSent) {
				continue
			}

			payload, err := json.Marshal(record)
			if err != nil {
				h.logger.Warn("marshal sse", "error", err)
				continue
			}
			if _, err := fmt.Fprintf(w, "data: %s\n\n", payload); err != nil {
				h.logger.Warn("write sse", "agent", record.AgentID, "error", err)
				return
			}
			lastSent = record.CollectedAt
			flusher.Flush()
		}
	}
}

func (h *httpAPI) handleAgents(w http.ResponseWriter, r *http.Request) {
	agents, err := h.store.Agents(r.Context())
	if err != nil {
		h.writeError(w, http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]any{"agents": agents}); err != nil {
		h.logger.Warn("write agents response", "error", err)
	}
}

func (h *httpAPI) writeError(w http.ResponseWriter, status int, err error) {
	h.logger.Error("http error", "status", status, "error", err)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if encErr := json.NewEncoder(w).Encode(map[string]any{
		"error": err.Error(),
	}); encErr != nil {
		h.logger.Warn("write error response", "status", status, "error", encErr)
	}
}
