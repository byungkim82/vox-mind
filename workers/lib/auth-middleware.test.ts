import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAuthMiddleware, getAuth } from './auth-middleware';
import type { Env, AuthContext } from './types';

// Mock logger
vi.mock('./logger', () => ({
  authLogger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('auth-middleware', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  const createMockContext = (env: Partial<Env> = {}, headers: Record<string, string> = {}) => {
    const variables: Record<string, any> = {};
    return {
      env: {
        ENVIRONMENT: 'production',
        CF_ACCESS_TEAM_NAME: 'test-team',
        CF_ACCESS_AUD: 'test-audience',
        ...env,
      } as Env,
      req: {
        header: (name: string) => headers[name],
      },
      json: vi.fn().mockImplementation((body, status) => ({ body, status })),
      set: vi.fn().mockImplementation((key: string, value: any) => {
        variables[key] = value;
      }),
      get: vi.fn().mockImplementation((key: string) => variables[key]),
    };
  };

  describe('createAuthMiddleware', () => {
    describe('development environment', () => {
      it('skips auth and sets dev user in development', async () => {
        const c = createMockContext({ ENVIRONMENT: 'development' });
        const next = vi.fn().mockResolvedValue(undefined);
        const middleware = createAuthMiddleware();

        await middleware(c as any, next);

        expect(c.set).toHaveBeenCalledWith('auth', {
          userId: 'dev-user',
          email: 'dev@localhost',
        });
        expect(next).toHaveBeenCalled();
        expect(c.json).not.toHaveBeenCalled();
      });
    });

    describe('production environment', () => {
      it('returns 401 when JWT is missing', async () => {
        const c = createMockContext({}, {});
        const next = vi.fn();
        const middleware = createAuthMiddleware();

        const result = await middleware(c as any, next);

        expect(result).toEqual({
          body: { error: 'Missing authentication token' },
          status: 401,
        });
        expect(next).not.toHaveBeenCalled();
      });

      it('returns 500 when CF_ACCESS_TEAM_NAME is missing', async () => {
        const c = createMockContext(
          { CF_ACCESS_TEAM_NAME: undefined },
          { 'Cf-Access-Jwt-Assertion': 'some-jwt' }
        );
        const next = vi.fn();
        const middleware = createAuthMiddleware();

        const result = await middleware(c as any, next);

        expect(result).toEqual({
          body: { error: 'Authentication not configured' },
          status: 500,
        });
      });

      it('returns 500 when CF_ACCESS_AUD is missing', async () => {
        const c = createMockContext(
          { CF_ACCESS_AUD: undefined },
          { 'Cf-Access-Jwt-Assertion': 'some-jwt' }
        );
        const next = vi.fn();
        const middleware = createAuthMiddleware();

        const result = await middleware(c as any, next);

        expect(result).toEqual({
          body: { error: 'Authentication not configured' },
          status: 500,
        });
      });

      it('returns 401 for invalid JWT format', async () => {
        const c = createMockContext({}, { 'Cf-Access-Jwt-Assertion': 'invalid-jwt' });
        const next = vi.fn();
        const middleware = createAuthMiddleware();

        const result = await middleware(c as any, next);

        expect(result.status).toBe(401);
        expect(result.body.error).toBe('Invalid authentication token');
        expect(result.body.details).toBe('Invalid JWT format');
      });

      it('returns 401 for expired JWT', async () => {
        // Create a JWT with expired timestamp
        const header = btoa(JSON.stringify({ alg: 'RS256', kid: 'key-1' }))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const expiredPayload = {
          aud: ['test-audience'],
          email: 'user@example.com',
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
          iat: Math.floor(Date.now() / 1000) - 7200,
          sub: 'user-123',
          iss: 'https://test-team.cloudflareaccess.com',
          type: 'app',
        };

        const payload = btoa(JSON.stringify(expiredPayload))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const jwt = `${header}.${payload}.fake-signature`;

        const c = createMockContext({}, { 'Cf-Access-Jwt-Assertion': jwt });
        const next = vi.fn();
        const middleware = createAuthMiddleware();

        const result = await middleware(c as any, next);

        expect(result.status).toBe(401);
        expect(result.body.details).toBe('JWT has expired');
      });

      it('returns 401 for invalid audience', async () => {
        const header = btoa(JSON.stringify({ alg: 'RS256', kid: 'key-1' }))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const invalidAudPayload = {
          aud: ['wrong-audience'],
          email: 'user@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          sub: 'user-123',
          iss: 'https://test-team.cloudflareaccess.com',
          type: 'app',
        };

        const payload = btoa(JSON.stringify(invalidAudPayload))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const jwt = `${header}.${payload}.fake-signature`;

        const c = createMockContext({}, { 'Cf-Access-Jwt-Assertion': jwt });
        const next = vi.fn();
        const middleware = createAuthMiddleware();

        const result = await middleware(c as any, next);

        expect(result.status).toBe(401);
        expect(result.body.details).toBe('Invalid JWT audience');
      });

      it('returns 401 when public keys fetch fails', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
          ok: false,
          status: 500,
        } as Response);

        const header = btoa(JSON.stringify({ alg: 'RS256', kid: 'key-1' }))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const validPayload = {
          aud: ['test-audience'],
          email: 'user@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          sub: 'user-123',
          iss: 'https://test-team.cloudflareaccess.com',
          type: 'app',
        };

        const payload = btoa(JSON.stringify(validPayload))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const jwt = `${header}.${payload}.fake-signature`;

        const c = createMockContext({}, { 'Cf-Access-Jwt-Assertion': jwt });
        const next = vi.fn();
        const middleware = createAuthMiddleware();

        const result = await middleware(c as any, next);

        expect(result.status).toBe(401);
        expect(result.body.details).toContain('Failed to fetch public keys');
      });

      it('returns 401 when no matching key found', async () => {
        vi.mocked(global.fetch).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ keys: [{ kid: 'different-key' }] }),
        } as Response);

        const header = btoa(JSON.stringify({ alg: 'RS256', kid: 'key-1' }))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const validPayload = {
          aud: ['test-audience'],
          email: 'user@example.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          sub: 'user-123',
          iss: 'https://test-team.cloudflareaccess.com',
          type: 'app',
        };

        const payload = btoa(JSON.stringify(validPayload))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const jwt = `${header}.${payload}.fake-signature`;

        const c = createMockContext({}, { 'Cf-Access-Jwt-Assertion': jwt });
        const next = vi.fn();
        const middleware = createAuthMiddleware();

        const result = await middleware(c as any, next);

        expect(result.status).toBe(401);
        expect(result.body.details).toBe('No matching key found');
      });
    });
  });

  describe('getAuth', () => {
    it('returns auth context when available', () => {
      const expectedAuth: AuthContext = {
        userId: 'user-123',
        email: 'user@example.com',
      };

      const c = {
        get: vi.fn().mockReturnValue(expectedAuth),
      };

      const result = getAuth(c as any);

      expect(result).toEqual(expectedAuth);
      expect(c.get).toHaveBeenCalledWith('auth');
    });

    it('throws error when auth context is not available', () => {
      const c = {
        get: vi.fn().mockReturnValue(undefined),
      };

      expect(() => getAuth(c as any)).toThrow('Auth context not available');
    });

    it('throws error when auth context is null', () => {
      const c = {
        get: vi.fn().mockReturnValue(null),
      };

      expect(() => getAuth(c as any)).toThrow('Auth context not available');
    });
  });
});
