import { Hono } from 'hono';
import addressesRouter from './routes/addresses';
import multisigRouter from './routes/multisig';
import { ValidationError } from './errors';
import proposalsRouter from './routes/proposals';
import authRouter from './routes/auth';
import { SUPPORTED_NETWORKS } from './db/env';
import { cors } from 'hono/cors';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: 'http://localhost:5173', // Vite's default dev server port
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
    credentials: true,
  }),
);
// Health check.
app.get('/', (c) => {
  return c.text(
    `Sagat API is up and running on networks: ${SUPPORTED_NETWORKS.join(', ')}`,
  );
});

app.route('/auth', authRouter);
app.route('/addresses', addressesRouter);
app.route('/multisig', multisigRouter);
app.route('/proposals', proposalsRouter);

// Map known errors
app.onError((err, c) => {
  if (err instanceof ValidationError) {
    return c.json({ error: err.message }, 400);
  }
  return c.json({ error: 'Internal Server Error' }, 500);
});

export default app;
