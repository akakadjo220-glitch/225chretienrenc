/**
 * Cloudflare Worker proxy natif pour OpenWA API
 * Intercepte /openwa-proxy/* sur le domaine production (workers.dev / pages.dev)
 * Résout 100% des erreurs CORS et 405 Method Not Allowed
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy OpenWA API
    if (url.pathname.startsWith('/openwa-proxy')) {
      // 1. Réponse preflight CORS OPTIONS
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400'
          }
        });
      }

      try {
        const customTarget = request.headers.get('x-target-url');
        const baseUrl = customTarget ? customTarget.replace(/\/$/, '') : 'https://193-29-187-66.sslip.io';
        const subPath = url.pathname.replace(/^\/openwa-proxy/, '');
        const targetUrl = `${baseUrl}${subPath}${url.search}`;

        const headers = new Headers(request.headers);
        const targetHost = new URL(baseUrl).host;
        headers.set('host', targetHost);

        const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

        const response = await fetch(targetUrl, {
          method: request.method,
          headers: headers,
          body: body
        });

        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', '*');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message || 'Erreur Proxy Cloudflare Worker' }), {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Servir les assets statiques par défaut
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return fetch(request);
  }
};
