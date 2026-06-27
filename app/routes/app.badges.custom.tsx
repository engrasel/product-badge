import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { createCustomBadge } from "../services/badge.service";
import { getShopPlan } from "../services/plan.service";

// "Create Badge" in the sidebar is a quick-create entry point: it creates a
// blank badge and drops the merchant straight into the same Customizer used
// to edit any badge (app.badges.$id.tsx), rather than duplicating that UI.
// The custom designer itself is Premium-only — Free shops are sent to the
// Badge Library instead, where they can still pick Sale/New.
async function createAndRedirect(request: Request) {
  const { session } = await authenticate.admin(request);
  const { plan } = await getShopPlan(session.shop);
  if (plan === "FREE") {
    return redirect("/app/badges");
  }
  const badge = await createCustomBadge(session.shop);
  return redirect(`/app/badges/${badge.id}`);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return createAndRedirect(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return createAndRedirect(request);
};
