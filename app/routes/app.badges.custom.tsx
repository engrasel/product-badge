import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { createCustomBadge } from "../services/badge.service";

// "Custom Badge" in the sidebar is a quick-create entry point: it creates a
// blank badge and drops the merchant straight into the same Customizer used
// to edit any badge (app.badges.$id.tsx), rather than duplicating that UI.
async function createAndRedirect(request: Request) {
  const { session } = await authenticate.admin(request);
  const badge = await createCustomBadge(session.shop);
  return redirect(`/app/badges/${badge.id}`);
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return createAndRedirect(request);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  return createAndRedirect(request);
};
