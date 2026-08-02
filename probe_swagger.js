const baseUrl = 'https://84-234-99-41.sslip.io';

const swaggerEndpoints = [
  '/api/docs-json',
  '/api/docs/json',
  '/api-json',
  '/swagger-json',
  '/api/swagger.json',
  '/docs-json'
];

async function getSwagger() {
  for (const path of swaggerEndpoints) {
    try {
      const res = await fetch(`${baseUrl}${path}`);
      if (res.ok) {
        const json = await res.json();
        console.log(`🎉 Swagger JSON trouvé sur ${path} !`);
        console.log("Routes disponibles :");
        if (json.paths) {
          for (const route of Object.keys(json.paths)) {
            const methods = Object.keys(json.paths[route]).join(', ').toUpperCase();
            console.log(`  ${methods.padEnd(8)} ${route}`);
          }
        }
        return;
      }
    } catch (e) {}
  }

  // Si pas de json direct, scrapons /api/docs pour trouver le fichier spec
  try {
    const res = await fetch(`${baseUrl}/api/docs`);
    const html = await res.text();
    console.log("Swagger UI HTML reçu, recherche d'URL spec...");
    const match = html.match(/url:\s*["']([^"']+)["']/i) || html.match(/href=["']([^"']*json[^"']*)["']/i);
    if (match) {
      console.log("Found spec url:", match[1]);
    } else {
      console.log("Extrait HTML Swagger UI:", html.substring(0, 500));
    }
  } catch (e) {
    console.error(e);
  }
}

getSwagger();
