package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"telemetry-agent/internal/agent"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := agent.LoadConfig()
	if err != nil {
		logger.Error("load configuration", "error", err)
		os.Exit(1)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	logger.Info("starting telemetry agent", "server", cfg.ServerAddr, "interval", cfg.Interval)

	sampler := agent.NewSampler()
	runner := agent.NewRunner(cfg, logger, sampler)

	if err := runner.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		logger.Error("agent terminated", "error", err)
	}
}
