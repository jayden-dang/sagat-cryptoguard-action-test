import { Hono } from 'hono';
import { connectToPublicKey, disconnect } from '../services/auth.service';

const authRouter = new Hono();

authRouter.post('/connect', connectToPublicKey);
authRouter.post('/disconnect', disconnect);

export default authRouter;
