import { handleGroq } from './providers/groq.js';
import { handleOpenAI } from './providers/openai.js';
import { handleAnthropic } from './providers/anthropic.js';
import { authenticate } from './middleware/auth.js';
import { checkRateLimit } from './middleware/rateLimit.js';
import { corsHeaders, errorResponse } from './utils.js';

const PROVIDER_ROUTES = {
  groq: handleGroq,
  openai: handleOpenAI,
  anthropic: handleAnthropic,
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const path = url.pathname; // e.g. /v1/groq/chat/completions

    // Health check — no auth required
    if (path === '/health') {
      return Response.json({ status: 'ok', version: '1.0.0' }, { headers: corsHeaders() });
    }

    // Parse provider from path: /v1/{provider}/...
    const match = path.match(/^\/v1\/([^/]+)(\/.*)?$/);
    if (!match) {
      return errorResponse(404, 'Not found. Use /v1/{provider}/... paths.');
    }

    const providerName = match[1].toLowerCase();
    const handler = PROVIDER_ROUTES[providerName];
    if (!handler) {
      return errorResponse(404, `Provider "${providerName}" is not supported. Available: ${Object.keys(PROVIDER_ROUTES).join(', ')}`);
    }

    // Authenticate the client
    const authResult = await authenticate(request, env);
    if (!authResult.ok) {
      return errorResponse(401, authResult.error);
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(authResult.clientId, env);
    if (!rateLimitResult.ok) {
      return errorResponse(429, rateLimitResult.error, {
        'Retry-After': String(rateLimitResult.retryAfter),
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': '0',
      });
    }

    // Forward to provider
    try {
      const upstreamPath = match[2] || '/';
      const response = await handler(request, env, upstreamPath);

      // Attach CORS headers to provider response
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders()).forEach(([k, v]) => newHeaders.set(k, v));
      newHeaders.set('X-Thanzi-Client', authResult.clientId);
      newHeaders.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (err) {
      console.error(`[${providerName}] upstream error:`, err.message);
      return errorResponse(502, `Upstream provider error: ${err.message}`);
    }
  },
};
