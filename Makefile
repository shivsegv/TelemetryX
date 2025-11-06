PROTOC_BIN ?= $(shell go env GOPATH)/bin

.PHONY: build
build:
	go build -o bin/agent cmd/agent/main.go
	go build -o bin/server cmd/server/main.go

.PHONY: run-server
run-server:
	go run cmd/server/main.go

.PHONY: run-agent
run-agent:
	go run -v cmd/agent/main.go

.PHONY: proto
proto:
	PATH="$(PROTOC_BIN):$$PATH" protoc --go_out=. --go-grpc_out=. pkg/api/telemetry.proto

.PHONY: fmt
fmt:
	go fmt ./...

.PHONY: tidy
tidy:
	go mod tidy
