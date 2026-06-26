import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Mandatory GDPR compliance webhook, fired ~48 hours after a shop uninstalls
// the app — the final, permanent purge point. Unlike app/uninstalled (which
// only clears the session, in case the merchant reinstalls shortly after),
// this is where all of the shop's app data actually gets deleted.
// DisplayRule rows cascade-delete with their Badge (see schema.prisma).
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  await Promise.all([
    db.badge.deleteMany({ where: { shop } }),
    db.displayLocation.deleteMany({ where: { shop } }),
    db.shopSettings.deleteMany({ where: { shop } }),
    db.session.deleteMany({ where: { shop } }),
  ]);

  return new Response();
};
