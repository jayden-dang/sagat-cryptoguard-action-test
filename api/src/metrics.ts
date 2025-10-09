import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

// Single registry for all metrics
export const register = new Registry();

// Enable default metrics collection (Node.js runtime metrics)
collectDefaultMetrics({ register });

// HTTP Request Metrics
export const httpRequestDuration = new Histogram({
	name: 'http_request_duration_seconds',
	help: 'Duration of HTTP requests in seconds',
	labelNames: ['method', 'route', 'status_code'],
	registers: [register],
});

export const httpRequestTotal = new Counter({
	name: 'http_requests_total',
	help: 'Total number of HTTP requests',
	labelNames: ['method', 'route', 'status_code'],
	registers: [register],
});

// Authentication Metrics
export const authAttempts = new Counter({
	name: 'auth_attempts_total',
	help: 'Total number of authentication attempts',
	labelNames: ['status'],
	registers: [register],
});

export const activeJwtTokens = new Gauge({
	name: 'active_jwt_tokens',
	help: 'Number of active JWT tokens',
	registers: [register],
});

// Multisig Transaction Metrics
export const multisigTransactions = new Counter({
	name: 'multisig_transactions_total',
	help: 'Total number of multisig transactions',
	labelNames: ['network', 'status'],
	registers: [register],
});

export const multisigSignatures = new Counter({
	name: 'multisig_signatures_total',
	help: 'Total number of signatures on multisig transactions',
	labelNames: ['network'],
	registers: [register],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
	name: 'db_query_duration_seconds',
	help: 'Duration of database queries in seconds',
	labelNames: ['operation', 'table'],
	registers: [register],
});

export const dbConnectionPoolSize = new Gauge({
	name: 'db_connection_pool_size',
	help: 'Number of connections in the database pool',
	labelNames: ['state'],
	registers: [register],
});

export const dbQueryErrors = new Counter({
	name: 'db_query_errors_total',
	help: 'Total number of database query errors',
	labelNames: ['operation', 'table'],
	registers: [register],
});

// RPC Metrics
export const rpcRequestDuration = new Histogram({
	name: 'rpc_request_duration_seconds',
	help: 'Duration of RPC requests in seconds',
	labelNames: ['network', 'method'],
	registers: [register],
});

export const rpcRequestErrors = new Counter({
	name: 'rpc_request_errors_total',
	help: 'Total number of RPC request errors',
	labelNames: ['network', 'method', 'error_type'],
	registers: [register],
});
