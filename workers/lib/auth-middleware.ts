import type { Context, MiddlewareHandler } from 'hono';
import type { Env, CloudflareAccessJWTPayload, AuthContext } from './types';
import { AUTH_CACHE_EXPIRY_MS } from './constants';
import { authLogger } from './logger';

interface JsonWebKeySet {
  keys: JsonWebKey[];
}

// Cache for public keys
let cachedKeys: JsonWebKeySet | null = null;
let cacheExpiry = 0;

async function getPublicKeys(teamName: string): Promise<JsonWebKeySet> {
  const now = Date.now();

  if (cachedKeys && now < cacheExpiry) {
    return cachedKeys;
  }

  const url = `https://${teamName}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch public keys: ${response.status}`);
  }

  cachedKeys = (await response.json()) as JsonWebKeySet;
  cacheExpiry = now + AUTH_CACHE_EXPIRY_MS;

  return cachedKeys;
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function verifyJWT(
  token: string,
  teamName: string,
  expectedAud: string
): Promise<CloudflareAccessJWTPayload> {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header and payload
  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerB64)));
  const payload = JSON.parse(
    new TextDecoder().decode(base64UrlDecode(payloadB64))
  ) as CloudflareAccessJWTPayload;

  // Verify expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('JWT has expired');
  }

  // Verify audience
  if (!payload.aud.includes(expectedAud)) {
    throw new Error('Invalid JWT audience');
  }

  // Fetch public keys and verify signature
  const jwks = await getPublicKeys(teamName);
  const key = jwks.keys.find((k) => k.kid === header.kid);

  if (!key) {
    throw new Error('No matching key found');
  }

  // Import the key for verification
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    key,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Verify signature
  const signatureArrayBuffer = base64UrlDecode(signatureB64);
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const isValid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureArrayBuffer,
    data
  );

  if (!isValid) {
    throw new Error('Invalid JWT signature');
  }

  return payload;
}

type AppEnv = { Bindings: Env; Variables: { auth: AuthContext } };

export function createAuthMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const env = c.env;

    // Skip auth in development
    if (env.ENVIRONMENT === 'development') {
      c.set('auth', {
        userId: 'dev-user',
        email: 'dev@localhost',
      });
      return next();
    }

    // Get JWT from Cloudflare Access header
    const jwt = c.req.header('Cf-Access-Jwt-Assertion');

    if (!jwt) {
      return c.json({ error: 'Missing authentication token' }, 401);
    }

    const teamName = env.CF_ACCESS_TEAM_NAME;
    const expectedAud = env.CF_ACCESS_AUD;

    if (!teamName || !expectedAud) {
      authLogger.error('CF_ACCESS_TEAM_NAME or CF_ACCESS_AUD not configured');
      return c.json({ error: 'Authentication not configured' }, 500);
    }

    try {
      const payload = await verifyJWT(jwt, teamName, expectedAud);

      c.set('auth', {
        userId: payload.sub,
        email: payload.email,
      });

      return next();
    } catch (error) {
      authLogger.error('JWT verification failed', error);
      return c.json(
        {
          error: 'Invalid authentication token',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        401
      );
    }
  };
}

export function getAuth(c: Context<AppEnv>): AuthContext {
  const auth = c.get('auth');
  if (!auth) {
    throw new Error('Auth context not available');
  }
  return auth;
}
