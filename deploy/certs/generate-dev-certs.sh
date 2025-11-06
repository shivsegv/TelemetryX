#!/bin/sh
set -euo pipefail

CERT_DIR="$(cd "$(dirname "$0")" && pwd)/dev"
mkdir -p "$CERT_DIR"

CA_KEY="$CERT_DIR/ca-key.pem"
CA_CERT="$CERT_DIR/ca.pem"
SERVER_KEY="$CERT_DIR/server-key.pem"
SERVER_CSR="$CERT_DIR/server.csr"
SERVER_CERT="$CERT_DIR/server.pem"

if command -v openssl >/dev/null 2>&1; then
  :
else
  echo "openssl not found in PATH" >&2
  exit 1
fi

if [ -f "$CA_CERT" ] || [ -f "$SERVER_CERT" ]; then
  echo "Existing certificates detected in $CERT_DIR" >&2
  echo "Move or delete them before regenerating." >&2
  exit 1
fi

echo "Generating development CA (for local testing only)" >&2
openssl req \
  -x509 \
  -nodes \
  -newkey rsa:4096 \
  -keyout "$CA_KEY" \
  -out "$CA_CERT" \
  -days 3650 \
  -subj "/CN=TelemetryX Dev CA" \
  -sha256

SAN_FILE=$(mktemp)
trap 'rm -f "$SAN_FILE" "$SERVER_CSR" "$CERT_DIR"/ca.srl' EXIT INT TERM

echo "subjectAltName = DNS:localhost,IP:127.0.0.1" > "$SAN_FILE"
echo "extendedKeyUsage = serverAuth" >> "$SAN_FILE"
echo "basicConstraints = CA:FALSE" >> "$SAN_FILE"
echo "subjectKeyIdentifier = hash" >> "$SAN_FILE"
echo "authorityKeyIdentifier = keyid,issuer" >> "$SAN_FILE"

echo "Generating server key and CSR" >&2
openssl req \
  -nodes \
  -newkey rsa:4096 \
  -keyout "$SERVER_KEY" \
  -out "$SERVER_CSR" \
  -subj "/CN=telemetryx-dev" \
  -sha256

echo "Signing server certificate using the development CA" >&2
openssl x509 \
  -req \
  -in "$SERVER_CSR" \
  -CA "$CA_CERT" \
  -CAkey "$CA_KEY" \
  -CAcreateserial \
  -out "$SERVER_CERT" \
  -days 825 \
  -sha256 \
  -extfile "$SAN_FILE"

rm -f "$SAN_FILE" "$SERVER_CSR" "$CERT_DIR"/ca.srl
trap - EXIT INT TERM

echo "Generated:" >&2
echo "  CA certificate: $CA_CERT" >&2
echo "  CA key:         $CA_KEY" >&2
echo "  Server cert:    $SERVER_CERT" >&2
echo "  Server key:     $SERVER_KEY" >&2

echo "Remember: never use these development certificates in production." >&2
