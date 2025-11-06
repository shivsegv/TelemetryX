package main

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"

	"telemetry-agent/internal/server"
	"telemetry-agent/internal/server/storage"
	"telemetry-agent/pkg/api"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := server.LoadConfig()
	if err != nil {
		logger.Error("load configuration", "error", err)
		os.Exit(1)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	pgStore, err := storage.NewPostgresStore(ctx, cfg.PostgresDSN)
	if err != nil {
		logger.Error("connect postgres", "error", err)
		os.Exit(1)
	}
	defer pgStore.Close()

	creds, err := loadServerCredentials(cfg)
	if err != nil {
		logger.Error("load server credentials", "error", err)
		os.Exit(1)
	}

	grpcServer := grpc.NewServer(grpc.Creds(creds))
	telemetrySvc := server.NewTelemetryService(pgStore, logger)
	api.RegisterTelemetryServer(grpcServer, telemetrySvc)

	httpServer := &http.Server{
		Addr:    cfg.HTTPAddr,
		Handler: server.NewHTTPHandler(pgStore, logger),
	}

	eg, egCtx := errgroup.WithContext(ctx)

	eg.Go(func() error {
		listener, err := net.Listen("tcp", cfg.GRPCAddr)
		if err != nil {
			return err
		}
		logger.Info("gRPC server listening", "addr", cfg.GRPCAddr)
		return grpcServer.Serve(listener)
	})

	eg.Go(func() error {
		logger.Info("HTTP server listening", "addr", cfg.HTTPAddr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	})

	eg.Go(func() error {
		<-egCtx.Done()
		logger.Info("shutdown initiated")
		grpcServer.GracefulStop()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return httpServer.Shutdown(shutdownCtx)
	})

	if err := eg.Wait(); err != nil && !errors.Is(err, context.Canceled) {
		logger.Error("server terminated", "error", err)
		os.Exit(1)
	}

	logger.Info("server shutdown complete")
}

func loadServerCredentials(cfg server.Config) (credentials.TransportCredentials, error) {
	return credentials.NewServerTLSFromFile(cfg.TLSCertPath, cfg.TLSKeyPath)
}
