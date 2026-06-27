import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { setShopFree, setShopPremium } from "../services/plan.service";

interface AppSubscriptionsUpdatePayload {
  app_subscription?: {
    admin_graphql_api_id?: string;
    status?: string;
  };
}

// Keeps ShopSettings.plan truthful if the merchant cancels, or the
// subscription lapses/freezes, from Shopify's own admin rather than from our
// Billing page — the in-app flow (app.billing.tsx) handles the happy path,
// this is the safety net for everything else.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const subscription = (payload as AppSubscriptionsUpdatePayload).app_subscription;
  if (subscription?.status === "ACTIVE") {
    await setShopPremium(shop, { chargeId: subscription.admin_graphql_api_id ?? "" });
  } else {
    await setShopFree(shop);
  }

  return new Response();
};
