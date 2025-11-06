package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// PostgresStore offers a tiny JSONB-backed persistence layer for telemetry records.
type PostgresStore struct {
	db *sql.DB
}

// NewPostgresStore opens the database connection, ensures the schema, and returns a store.
func NewPostgresStore(ctx context.Context, dsn string) (*PostgresStore, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("open postgres connection: %w", err)
	}

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}

	store := &PostgresStore{db: db}
	if err := store.ensureSchema(ctx); err != nil {
		db.Close()
		return nil, err
	}

	return store, nil
}

// Close releases the underlying connection pool.
func (s *PostgresStore) Close() error {
	return s.db.Close()
}

// Save writes a telemetry record to the database.
func (s *PostgresStore) Save(ctx context.Context, record Record) error {
	if record.AgentID == "" {
		return errors.New("record missing agent id")
	}

	payload, err := json.Marshal(record)
	if err != nil {
		return fmt.Errorf("marshal record: %w", err)
	}

	if _, err := s.db.ExecContext(ctx,
		`INSERT INTO telemetry_records (agent_id, collected_at, payload) VALUES ($1, $2, $3)`,
		record.AgentID, record.CollectedAt, payload,
	); err != nil {
		return fmt.Errorf("insert record: %w", err)
	}

	return nil
}

// List retrieves historical records for a given agent ordered oldest to newest.
func (s *PostgresStore) List(ctx context.Context, agentID string, limit int) ([]Record, error) {
	if agentID == "" {
		return nil, errors.New("agent id must be provided")
	}

	query := `SELECT payload FROM telemetry_records WHERE agent_id = $1 ORDER BY collected_at ASC, id ASC`
	var rows *sql.Rows
	var err error

	if limit > 0 {
		query += " LIMIT $2"
		rows, err = s.db.QueryContext(ctx, query, agentID, limit)
	} else {
		rows, err = s.db.QueryContext(ctx, query, agentID)
	}
	if err != nil {
		return nil, fmt.Errorf("query history: %w", err)
	}
	defer rows.Close()

	records := make([]Record, 0)
	for rows.Next() {
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			return nil, fmt.Errorf("scan payload: %w", err)
		}

		var record Record
		if err := json.Unmarshal(raw, &record); err != nil {
			return nil, fmt.Errorf("decode payload: %w", err)
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate history: %w", err)
	}

	return records, nil
}

// Latest returns the newest record for an agent when available.
func (s *PostgresStore) Latest(ctx context.Context, agentID string) (Record, bool, error) {
	if agentID == "" {
		return Record{}, false, errors.New("agent id must be provided")
	}

	var raw []byte
	if err := s.db.QueryRowContext(ctx,
		`SELECT payload FROM telemetry_records WHERE agent_id = $1 ORDER BY collected_at DESC, id DESC LIMIT 1`,
		agentID,
	).Scan(&raw); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Record{}, false, nil
		}
		return Record{}, false, fmt.Errorf("query latest: %w", err)
	}

	var record Record
	if err := json.Unmarshal(raw, &record); err != nil {
		return Record{}, false, fmt.Errorf("decode payload: %w", err)
	}

	return record, true, nil
}

// Agents lists distinct agent identifiers that have persisted data.
func (s *PostgresStore) Agents(ctx context.Context) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT DISTINCT agent_id
		FROM telemetry_records
		ORDER BY agent_id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("query agents: %w", err)
	}
	defer rows.Close()

	agents := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan agent id: %w", err)
		}
		agents = append(agents, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate agents: %w", err)
	}

	return agents, nil
}

func (s *PostgresStore) ensureSchema(ctx context.Context) error {
	if _, err := s.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS telemetry_records (
			id BIGSERIAL PRIMARY KEY,
			agent_id TEXT NOT NULL,
			collected_at TIMESTAMPTZ NOT NULL,
			payload JSONB NOT NULL
		)
	`); err != nil {
		return fmt.Errorf("ensure schema: %w", err)
	}

	if _, err := s.db.ExecContext(ctx, `
		CREATE INDEX IF NOT EXISTS telemetry_records_agent_collected_at_idx
		ON telemetry_records (agent_id, collected_at DESC, id DESC)
	`); err != nil {
		return fmt.Errorf("ensure index: %w", err)
	}

	return nil
}
