// Pages Function: Proxy /api/* requests to Workers API
// Forwards CF_Authorization cookie as Cf-Access-Jwt-Assertion header

interface Env {
  WORKERS_API_URL?: string;
}

interface EventContext {
  request: Request;
  env: Env;
}

export async function onRequest(context: EventContext): Promise<Response> {
  const { request, env } = context;

  // Get the path after /api/
  const url = new URL(request.url);
  const apiPath = url.pathname; // e.g., /api/upload, /api/process

  // Workers API URL
  const workersUrl = env.WORKERS_API_URL || 'https://vox-mind-api.byungkim82.workers.dev';
  const targetUrl = `${workersUrl}${apiPath}${url.search}`;

  // Get CF_Authorization cookie
  const cookies = request.headers.get('Cookie') || '';
  const cfAuthMatch = cookies.match(/CF_Authorization=([^;]+)/);
  const cfAuthToken = cfAuthMatch ? cfAuthMatch[1] : null;

  // Create new headers
  const headers = new Headers(request.headers);

  // Add Cf-Access-Jwt-Assertion header if we have the token
  if (cfAuthToken) {
    headers.set('Cf-Access-Jwt-Assertion', cfAuthToken);
  }

  // Remove cookie header to avoid sending all cookies to Workers
  headers.delete('Cookie');

  // Forward the request
  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
    // @ts-ignore - duplex is needed for streaming body
    duplex: 'half',
  });

  // Return the response with CORS headers
  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', url.origin);
  responseHeaders.set('Access-Control-Allow-Credentials', 'true');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
};
