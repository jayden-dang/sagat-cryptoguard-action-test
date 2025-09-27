import { getFullnodeUrl } from '@mysten/sui/client';

const jwtSecret = process.env.JWT_SECRET;
const suiEnv = process.env.SUI_ENV;

if (!jwtSecret) throw new Error('JWT_SECRET is not set');
if (!suiEnv) throw new Error('SUI_ENV is not set');

const suiRpcUrl = process.env.SUI_RPC_URL || getFullnodeUrl(suiEnv as any);

export const JWT_SECRET = jwtSecret;
export const SUI_ENV = suiEnv;
export const SUI_RPC_URL = suiRpcUrl;
