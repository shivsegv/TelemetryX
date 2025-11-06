package server

// Legacy notifier logic has been retired. The HTTP SSE endpoint now polls PostgreSQL for
// fresh samples, removing the need for in-memory subscription tracking.
