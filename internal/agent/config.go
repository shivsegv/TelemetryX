package agent

import (
	"fmt"
	"net"
	"os"
	"strings"
	"time"
)

// Config captures runtime settings for the agent process.
type Config struct {
	ServerAddr  string
	AgentID     string
	Interval    time.Duration
	CACertPath  string
	ServerName  string
	DialTimeout time.Duration
}

// LoadConfig reads configuration strictly from environment variables with sensible defaults.
//
//	TELEMETRY_SERVER_ADDR       gRPC server host:port (default "127.0.0.1:50051")
//	TELEMETRY_AGENT_ID          unique identifier for this agent (defaults to hostname)
//	TELEMETRY_SCRAPE_INTERVAL   sampling cadence (default "2s")
//	TELEMETRY_SERVER_CA_CERT    CA bundle for verifying the server (default dev cert)
//	TELEMETRY_SERVER_NAME       expected TLS server name (derived from addr when omitted)
//	TELEMETRY_DIAL_TIMEOUT      timeout for establishing the gRPC session (default "5s")
func LoadConfig() (Config, error) {
	defaultAddr := getenv("TELEMETRY_SERVER_ADDR", "127.0.0.1:50051")
	intervalStr := getenv("TELEMETRY_SCRAPE_INTERVAL", "2s")
	dialTimeoutStr := getenv("TELEMETRY_DIAL_TIMEOUT", "5s")

	interval, err := time.ParseDuration(intervalStr)
	if err != nil {
		return Config{}, fmt.Errorf("parse TELEMETRY_SCRAPE_INTERVAL: %w", err)
	}

	dialTimeout, err := time.ParseDuration(dialTimeoutStr)
	if err != nil {
		return Config{}, fmt.Errorf("parse TELEMETRY_DIAL_TIMEOUT: %w", err)
	}

	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown-agent"
	}

	cfg := Config{
		ServerAddr:  defaultAddr,
		AgentID:     getenv("TELEMETRY_AGENT_ID", hostname),
		Interval:    interval,
		CACertPath:  getenv("TELEMETRY_SERVER_CA_CERT", "deploy/certs/dev/ca.pem"),
		ServerName:  getenv("TELEMETRY_SERVER_NAME", hostFromAddr(defaultAddr)),
		DialTimeout: dialTimeout,
	}

	if cfg.ServerAddr == "" {
		return Config{}, fmt.Errorf("server address must be provided")
	}
	if cfg.Interval <= 0 {
		return Config{}, fmt.Errorf("interval must be positive")
	}
	if cfg.DialTimeout <= 0 {
		return Config{}, fmt.Errorf("dial timeout must be positive")
	}
	if cfg.CACertPath == "" {
		return Config{}, fmt.Errorf("CA certificate path must be provided")
	}
	if cfg.ServerName == "" {
		cfg.ServerName = hostFromAddr(cfg.ServerAddr)
		if cfg.ServerName == "" {
			cfg.ServerName = "localhost"
		}
	}

	return cfg, nil
}

func getenv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}

func hostFromAddr(addr string) string {
	trimmed := strings.TrimSpace(addr)
	if host, _, err := net.SplitHostPort(trimmed); err == nil {
		if host != "" {
			return host
		}
		return "localhost"
	}

	if trimmed == "" {
		return ""
	}
	if strings.HasPrefix(trimmed, ":") {
		return "localhost"
	}
	return trimmed
}
