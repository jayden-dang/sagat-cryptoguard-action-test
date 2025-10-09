import { Context, Next } from 'hono';

import {
	httpRequestDuration,
	httpRequestTotal,
} from '../metrics';

export const metricsMiddleware = async (
	c: Context,
	next: Next,
) => {
	const start = Date.now();
	const method = c.req.method;
	const path = c.req.path;

	await next();

	const duration = (Date.now() - start) / 1000;
	const status = c.res.status;

	httpRequestDuration.observe(
		{ method, route: path, status_code: status.toString() },
		duration,
	);

	httpRequestTotal.inc({
		method,
		route: path,
		status_code: status.toString(),
	});
};
