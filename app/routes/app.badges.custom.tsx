import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, useNavigate, useSubmit } from "react-router";
import { Page, BlockStack, Spinner, InlineStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createCustomBadge } from "../services/badge.service";
import { getShopPlan } from "../services/plan.service";

// "Create Badge" in the sidebar is a quick-create entry point: it creates a
// blank badge and drops the merchant straight into the same Customizer used
// to edit any badge (app.badges.$id.tsx), rather than duplicating that UI.
// The custom designer itself is Premium-only — Free shops are sent to the
// Badge Library instead, where they can still pick Sale/New.
//
// This route is reached by a top-level NavMenu navigation (not a client
// fetch), so the redirect can't happen in the loader — a raw Response
// redirect from a loader hit that way doesn't get followed correctly inside
// the embedded iframe. Instead the loader just reports the plan, and the
// component does the redirect client-side (useNavigate for Free, a real
// action submit for Premium) — the same mechanism every other redirect in
// this app already uses successfully.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { plan } = await getShopPlan(session.shop);
  return { plan };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const badge = await createCustomBadge(session.shop);
  return redirect(`/app/badges/${badge.id}`);
};

export default function CreateBadgeEntry() {
  const { plan } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();

  useEffect(() => {
    if (plan === "FREE") {
      navigate("/app/badges", { replace: true });
      return;
    }
    submit({}, { method: "post" });
    // Only ever needs to run once per mount of this entry route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Page>
      <BlockStack gap="400">
        <InlineStack align="center">
          <Spinner accessibilityLabel="Creating badge" size="large" />
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
