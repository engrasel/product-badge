import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { getStorefrontConfig } from "../services/storefront.service";

// Resource route (no default export) — the App Proxy endpoint configured in
// shopify.app.toml. Shopify forwards requests from
// https://{shop}/apps/product-badges/storefront-config here with a verified
// HMAC signature, so authenticate.public.appProxy both confirms the request
// really came from Shopify and tells us which shop it's for — no CORS issues
// since the storefront fetch is same-origin from the shop's own domain.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.public.appProxy(request);

  if (!session || !admin) {
    return Response.json({ enabled: false, locations: {}, badges: [] });
  }

  const config = await getStorefrontConfig(session.shop, admin);

  return Response.json(config, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
};
