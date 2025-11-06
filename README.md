# TelemetryX
TelemetryX is a compact observability lab: a Go agent samples host metrics, a Go server ingests them over TLS-secured gRPC and exposes REST/SSE views, and a React dashboard visualises the feed.

## Repository layout

```
cmd/agent       # agent entrypoint
cmd/server      # server entrypoint (gRPC + HTTP)
internal/agent  # configuration, sampling, streaming logic
internal/server # gRPC service, HTTP API, storage
pkg/api         # protobuf definitions and generated Go code
web/dashboard   # React dashboard (Vite + Material UI)
```

## Requirements

- Go 1.24+
- Node.js 18+ (UI)
- `make`
- Docker Engine / Desktop 24+ with Compose v2 (optional but recommended)
- `protoc` + Go plugins for regenerating stubs (see `make proto`)

## Manual quick start

```
make build        # build ./bin/agent and ./bin/server

# Generate local TLS material (writes to deploy/certs/dev/, git-ignored)
./deploy/certs/generate-dev-certs.sh

# Start PostgreSQL (swap credentials as needed)
docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=telemetry postgres:16

# Launch the server with environment variables (TLS defaults point at deploy/certs/dev)
TELEMETRY_SERVER_POSTGRES_DSN="postgres://postgres:telemetry@localhost:5432/postgres?sslmode=disable" \
  make run-server

# In another terminal start the agent (ID and interval are optional)
TELEMETRY_AGENT_ID="agent-local" make run-agent
```

The server auto-creates the `telemetry_records` table and exposes REST/SSE endpoints on `http://localhost:8080` (gRPC on `localhost:50051`).

## Docker stack

```bash
./deploy/certs/generate-dev-certs.sh   # one time
docker compose up --build -d           # PostgreSQL + server + 2 agents + dashboard
```

- Dashboard: http://localhost:3000
- REST/SSE: http://localhost:8080
- gRPC: `localhost:50051`

Tear down with `docker compose down [-v]`. Modify credentials, agent IDs, or ports via `docker-compose.yml` or an `.env` file. Individual images can be built with `docker build -f Dockerfile.<component> .`.

## Security notes

- Certificates generated in `deploy/certs/dev/` are for local use only.
- Rotate the demo credentials (`postgres:telemetry`) outside dev setups.
- Do not commit secrets; regenerate protobufs via `make proto` when needed.

### Generate sample activity

```bash
for i in {1..10}; do curl -s http://localhost:8080/api/metrics > /dev/null; sleep 0.5; done
dd if=/dev/zero of=$HOME/tmp_telemetry_test bs=1m count=200 && rm -f $HOME/tmp_telemetry_test
```

## Agent configuration

Environment variables (also available as CLI flags) control connectivity and cadence:

| Variable | Default | Description |
| --- | --- | --- |
| `TELEMETRY_SERVER_ADDR` | `127.0.0.1:50051` | gRPC server address |
| `TELEMETRY_AGENT_ID` | host name | Identifier reported to the server |
| `TELEMETRY_SCRAPE_INTERVAL` | `2s` | Sampling interval |
| `TELEMETRY_SERVER_CA_CERT` | `deploy/certs/dev/ca.pem` | CA bundle used to verify the server |
| `TELEMETRY_SERVER_NAME` | derived from server address | Expected TLS server name |
| `TELEMETRY_DIAL_TIMEOUT` | `5s` | Timeout for gRPC dial attempts |

## Server configuration

| Variable | Default | Description |
| --- | --- | --- |
| `TELEMETRY_SERVER_GRPC_ADDR` | `:50051` | gRPC listen address |
| `TELEMETRY_SERVER_HTTP_ADDR` | `:8080` | HTTP API listen address |
| `TELEMETRY_SERVER_TLS_CERT` | `deploy/certs/dev/server.pem` | Server certificate for TLS |
| `TELEMETRY_SERVER_TLS_KEY` | `deploy/certs/dev/server-key.pem` | TLS private key (PEM) |
| `TELEMETRY_SERVER_POSTGRES_DSN` | _(required)_ | PostgreSQL DSN used for durable storage |

## HTTP API surface

| Endpoint | Description |
| --- | --- |
| `GET /api/metrics` | Latest sample per agent, or full history when `agent_id` is provided |
| `GET /api/metrics/stream?agent_id=<id>` | Live Server-Sent Events for a specific agent |
| `GET /api/agents` | List of active agent identifiers |

Each response serialises `internal/server/storage.Record`, which includes the rate calculations performed by the gRPC service the moment a sample arrives.

## React dashboard

```bash
cd web/dashboard
npm install
npm run dev     # opens http://localhost:5173 with a proxy to the Go backend

npm run build   # optional production build (outputs to dist/)
```

The dev server proxies `/api/*` requests to `http://localhost:8080`, so keep the Go server running while developing the UI.

## Regenerating protobufs

Update `pkg/api/telemetry.proto` and then run:

```bash
make proto
```

This regenerates Go bindings under `pkg/api` and updates `go.sum` when required.

## Developer workflow helpers

| Command | Purpose |
| --- | --- |
| `make fmt` | Format Go sources with `gofmt` |
| `make tidy` | Clean up module dependencies |
| `make lint` | (If configured) run static analysis |

## Troubleshooting

- **No metrics arriving** – ensure the agent can reach the gRPC endpoint (`127.0.0.1:50051` by default) and that firewalls allow the connection.
- **Headline throughput stuck at zero** – generate traffic using the scripts above; rates depend on byte differences between samples.
- **Dashboard shows “metrics overview request failed (500)”** – the front-end proxy could not reach `GET /api/metrics`. Verify `make run-server` (or `go run cmd/server/main.go`) is running and repeats the listening logs for :8080, then retry `curl http://localhost:8080/api/metrics` to confirm it returns JSON. The server log will emit an `http error` line if a backend bug triggered the 500.
- **SSE stream disconnects** – the server now polls PostgreSQL for fresh samples per client; check the logs for repeated "poll latest metric" warnings that may indicate connectivity issues.