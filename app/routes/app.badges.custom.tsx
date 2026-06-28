import { useEffect } from "react";
import type { ActionFunctionArgs } from "react-router";
import { redirect, useSubmit } from "react-router";
import { Page, BlockStack, Spinner, InlineStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { createCustomBadge } from "../services/badge.service";

// "Create Badge" entry point: creates a blank badge and drops the merchant
// straight into the same Customizer used to edit any badge (app.badges.$id.tsx),
// rather than duplicating that UI.
//
// This route is reached by a top-level NavMenu/page-action navigation (not a
// client fetch), so the redirect can't happen in the loader — a raw Response
// redirect from a loader hit that way doesn't get followed correctly inside
// the embedded iframe. Instead the component submits the action on mount,
// which redirects once the badge is created — the same mechanism every other
// redirect in this app already uses successfully.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const badge = await createCustomBadge(session.shop);
  return redirect(`/app/badges/${badge.id}`);
};

export default function CreateBadgeEntry() {
  const submit = useSubmit();

  useEffect(() => {
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
