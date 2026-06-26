import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// Mandatory GDPR compliance webhook. This app stores no customer personal
// data at all — only shop-level badge designs, display rules, and location
// toggles (see prisma/schema.prisma) — so there's nothing to redact here.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  return new Response();
};
