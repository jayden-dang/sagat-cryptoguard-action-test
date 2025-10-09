import {
	collectDefaultMetrics,
	Counter,
	Gauge,
	Histogram,
	Registry,
} from 'prom-client';

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

// Multisig Transaction Metrics (Gauges tracking DB state)
export const multisigProposalsByStatus = new Gauge({
	name: 'multisig_proposals_by_status',
	help: 'Current number of multisig proposals by network and status',
	labelNames: ['network', 'status'],
	registers: [register],
});

export const multisigTotalSignatures = new Gauge({
	name: 'multisig_signatures',
	help: 'Current total number of signatures on multisig proposals by network',
	labelNames: ['network'],
	registers: [register],
});

// Counter for events (still useful for rate tracking)
export const multisigProposalEvents = new Counter({
	name: 'multisig_proposal_events_total',
	help: 'Total number of multisig proposal events',
	labelNames: ['network', 'event_type'],
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

// Debounced metrics update - prevents database overload
let metricsUpdatePending = false;
let metricsUpdateTimer: NodeJS.Timeout | null = null;

async function _updateMultisigMetricsNow() {
	try {
		const { db } = await import('./db');
		const { SchemaProposals, SchemaProposalSignatures, ProposalStatus } = await import('./db/schema');
		const { sql } = await import('drizzle-orm');

		// Use efficient aggregate queries with indexes
		const proposalCounts = await db
			.select({
				network: SchemaProposals.network,
				status: SchemaProposals.status,
				count: sql<number>`count(*)::int`,
			})
			.from(SchemaProposals)
			.groupBy(SchemaProposals.network, SchemaProposals.status);

		// Reset all gauges
		multisigProposalsByStatus.reset();

		// Update gauges with current counts
		for (const row of proposalCounts) {
			const statusName = Object.keys(ProposalStatus).find(
				key => ProposalStatus[key as keyof typeof ProposalStatus] === row.status
			) || 'unknown';

			multisigProposalsByStatus.set(
				{ network: row.network, status: statusName.toLowerCase() },
				row.count
			);
		}

		// Signature counts by network
		const signatureCounts = await db
			.select({
				network: SchemaProposals.network,
				count: sql<number>`count(${SchemaProposalSignatures.signature})::int`,
			})
			.from(SchemaProposalSignatures)
			.innerJoin(SchemaProposals, sql`${SchemaProposalSignatures.proposalId} = ${SchemaProposals.id}`)
			.groupBy(SchemaProposals.network);

		multisigTotalSignatures.reset();
		for (const row of signatureCounts) {
			multisigTotalSignatures.set({ network: row.network }, row.count);
		}
	} catch (error) {
		console.error('Failed to update multisig metrics:', error);
	} finally {
		metricsUpdatePending = false;
	}
}

// Debounced update - waits 5 seconds after last call before executing
// This batches rapid sequential updates into a single DB query
export function updateMultisigMetrics() {
	// Clear existing timer if any
	if (metricsUpdateTimer) {
		clearTimeout(metricsUpdateTimer);
	}

	// Set new timer - will execute 5 seconds after last call
	metricsUpdateTimer = setTimeout(() => {
		if (!metricsUpdatePending) {
			metricsUpdatePending = true;
			_updateMultisigMetricsNow();
		}
	}, 5000); // 5 second debounce
}

// Initialize metrics on startup
_updateMultisigMetricsNow();
