/**
 * Cloudflare Pages Function Proxy pour OpenWA
 * Route : /openwa-proxy/api/sessions/...
 * Élimine à 100% les erreurs CORS en production Cloudflare Workers / Pages
 */

export async function onRequest(context: any): Promise<Response> {
  const { request, params } = context;

  // 1. Gestion des requêtes Preflight OPTIONS CORS
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
    // 2. Extraire le chemin relatif de la sous-requête
    const url = new URL(request.url);
    const subPath = url.pathname.replace(/^\/openwa-proxy/, '');
    const targetUrl = `https://193-29-187-66.sslip.io${subPath}${url.search}`;

    // 3. Préparer les en-têtes pour le serveur OpenWA
    const headers = new Headers(request.headers);
    headers.set('host', '193-29-187-66.sslip.io');

    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

    // 4. Exécuter l'appel de serveur à serveur (Server-to-Server sans restriction CORS)
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: body
    });

    // 5. Renvoyer la réponse au navigateur avec les en-têtes CORS autorisés
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Erreur Proxy Cloudflare OpenWA' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
