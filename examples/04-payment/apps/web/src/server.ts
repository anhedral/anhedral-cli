import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import { proxyApi } from './lib/api-proxy';

const handler = createStartHandler(defaultStreamHandler);

export default {
  fetch(request: Request, bindings: Env) {
    const pathname = new URL(request.url).pathname;
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return proxyApi(request, { binding: bindings.ANHEDRAL_API, development: false });
    }
    // Start retains this server-owned capability only inside the current request.
    return handler(request, { context: { api: bindings.ANHEDRAL_API } });
  },
} satisfies ExportedHandler<Env>;
