// Resolve once at build time so all static metadata uses the same origin.
const configured = process.env.NEXT_PUBLIC_SITE_URL;
const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = new URL(
  configured || (productionDomain ? `https://${productionDomain}` : "http://localhost:4173"),
).origin;
