package agent

import (
	"context"
	"crypto/x509"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"

	"telemetry-agent/pkg/api"
)

// Runner encapsulates the lifecycle of the agent streaming loop.
type Runner struct {
	cfg     Config
	logger  *slog.Logger
	sampler *Sampler
}

// NewRunner creates a configured telemetry runner.
func NewRunner(cfg Config, logger *slog.Logger, sampler *Sampler) *Runner {
	return &Runner{cfg: cfg, logger: logger, sampler: sampler}
}

// Run connects to the telemetry server and begins streaming metrics until ctx is cancelled.
func (r *Runner) Run(ctx context.Context) error {
	creds, err := r.clientCredentials()
	if err != nil {
		return err
	}

	dialCtx, cancel := context.WithTimeout(ctx, r.cfg.DialTimeout)
	defer cancel()

	conn, err := grpc.DialContext(dialCtx, r.cfg.ServerAddr, grpc.WithTransportCredentials(creds), grpc.WithBlock())
	if err != nil {
		return fmt.Errorf("dial telemetry server: %w", err)
	}
	defer func() {
		if cerr := conn.Close(); cerr != nil {
			r.logger.Warn("closing grpc connection", "error", cerr)
		}
	}()

	client := api.NewTelemetryClient(conn)
	stream, err := client.StreamMetrics(ctx)
	if err != nil {
		return fmt.Errorf("open metrics stream: %w", err)
	}
	defer func() {
		if cerr := stream.CloseSend(); cerr != nil && !errors.Is(cerr, context.Canceled) {
			r.logger.Warn("closing metric stream", "error", cerr)
		}
	}()

	if err := r.publishSample(ctx, stream); err != nil {
		return err
	}

	ticker := time.NewTicker(r.cfg.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
			if err := r.publishSample(ctx, stream); err != nil {
				if errors.Is(err, context.Canceled) {
					return nil
				}
				return err
			}
		}
	}
}

func (r *Runner) clientCredentials() (credentials.TransportCredentials, error) {
	pem, err := os.ReadFile(r.cfg.CACertPath)
	if err != nil {
		return nil, fmt.Errorf("read ca certificate: %w", err)
	}

	pool := x509.NewCertPool()
	if ok := pool.AppendCertsFromPEM(pem); !ok {
		return nil, fmt.Errorf("append ca certificate: not a valid PEM block")
	}

	return credentials.NewClientTLSFromCert(pool, r.cfg.ServerName), nil
}

func (r *Runner) publishSample(ctx context.Context, stream api.Telemetry_StreamMetricsClient) error {
	metric, err := r.sampler.Sample(ctx, r.cfg.AgentID)
	if err != nil {
		r.logger.Error("sample metrics failed", "error", err)
		return nil
	}

	if err := stream.Send(metric); err != nil {
		if errors.Is(err, context.Canceled) {
			return err
		}
		return fmt.Errorf("send metric: %w", err)
	}

	return nil
}
