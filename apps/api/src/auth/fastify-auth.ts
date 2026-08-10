import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { RuntimeConfig } from '../config.js';
import type { WorkLedgerAuthentication } from './authentication.js';

export function registerAuthenticationRoutes(
  app: FastifyInstance,
  config: RuntimeConfig,
  authentication: WorkLedgerAuthentication,
): void {
  app.route({
    method: ['GET', 'POST'],
    schema: { hide: true },
    url: '/api/auth/*',
    async handler(request, reply) {
      const authRequest = createAuthRequest(request, config);
      const response = await authentication.handler(authRequest);
      return sendAuthResponse(reply, response);
    },
  });
}

function createAuthRequest(request: FastifyRequest, config: RuntimeConfig): Request {
  const requestUrl = new URL(request.raw.url ?? request.url, `${config.canonicalOrigin}/`);
  requestUrl.protocol = new URL(config.canonicalOrigin).protocol;
  requestUrl.host = new URL(config.canonicalOrigin).host;

  const headers = fromNodeHeaders(request.headers);
  headers.delete('forwarded');
  headers.delete('x-forwarded-for');
  headers.delete('x-forwarded-host');
  headers.delete('x-forwarded-proto');
  headers.set('x-forwarded-for', request.ip);

  return new Request(requestUrl, {
    headers,
    method: request.method,
    ...(request.method === 'POST' ? { body: JSON.stringify(request.body ?? {}) } : {}),
  });
}

async function sendAuthResponse(reply: FastifyReply, response: Response): Promise<unknown> {
  reply.status(response.status);
  reply.header('cache-control', 'private, no-store');

  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) reply.header('set-cookie', cookies);
  for (const [name, value] of response.headers) {
    if (name === 'content-length' || name === 'set-cookie' || name === 'cache-control') continue;
    reply.header(name, value);
  }

  if (response.body === null) return reply.send();
  return reply.send(await response.text());
}
