package server

import (
	"fmt"
	"os"
)

// Config stores runtime parameters for the telemetry server.
type Config struct {
	GRPCAddr    string
	HTTPAddr    string
	TLSCertPath string
	TLSKeyPath  string
	PostgresDSN string
}

// LoadConfig reads configuration solely from environment variables, keeping only the
// knobs required for the minimal deployment.
func LoadConfig() (Config, error) {
	cfg := Config{
		GRPCAddr:    getenv("TELEMETRY_SERVER_GRPC_ADDR", ":50051"),
		HTTPAddr:    getenv("TELEMETRY_SERVER_HTTP_ADDR", ":8080"),
		TLSCertPath: getenv("TELEMETRY_SERVER_TLS_CERT", "deploy/certs/dev/server.pem"),
		TLSKeyPath:  getenv("TELEMETRY_SERVER_TLS_KEY", "deploy/certs/dev/server-key.pem"),
		PostgresDSN: getenv("TELEMETRY_SERVER_POSTGRES_DSN", ""),
	}

	if cfg.GRPCAddr == "" {
		return Config{}, fmt.Errorf("TELEMETRY_SERVER_GRPC_ADDR must be set")
	}
	if cfg.HTTPAddr == "" {
		return Config{}, fmt.Errorf("TELEMETRY_SERVER_HTTP_ADDR must be set")
	}
	if cfg.TLSCertPath == "" {
		return Config{}, fmt.Errorf("TELEMETRY_SERVER_TLS_CERT must be provided")
	}
	if cfg.TLSKeyPath == "" {
		return Config{}, fmt.Errorf("TELEMETRY_SERVER_TLS_KEY must be provided")
	}
	if cfg.PostgresDSN == "" {
		return Config{}, fmt.Errorf("TELEMETRY_SERVER_POSTGRES_DSN must be provided")
	}

	return cfg, nil
}

func getenv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}
