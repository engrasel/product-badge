import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useNavigation, useSubmit } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Badge as StatusBadge,
  Button,
  List,
  Icon,
} from "@shopify/polaris";
import { CheckIcon } from "@shopify/polaris-icons";

import { authenticate, PREMIUM_PLAN } from "../shopify.server";
import { getShopPlan, setShopFree, setShopPremium } from "../services/plan.service";

// Dev stores can't be charged real money; everywhere else this is a real $1
// charge. Override with BILLING_TEST_MODE=true|false if you need to force it
// (e.g. testing on a non-development store without spending real money).
function isTestCharge() {
  const override = process.env.BILLING_TEST_MODE;
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const shop = session.shop;

  const { hasActivePayment, appSubscriptions } = await billing.check({
    plans: [PREMIUM_PLAN],
  });

  // Re-sync our own plan record from Shopify's truth on every visit to this
  // page — covers a merchant approving/cancelling outside our own action
  // (e.g. the subscriptions_update webhook hasn't landed yet).
  const current = await getShopPlan(shop);
  if (hasActivePayment && appSubscriptions[0] && current.plan !== "PREMIUM") {
    await setShopPremium(shop, { chargeId: appSubscriptions[0].id });
  } else if (!hasActivePayment && current.plan === "PREMIUM") {
    await setShopFree(shop);
  }

  const plan = await getShopPlan(shop);

  return {
    plan: plan.plan,
    isPremium: plan.isPremium,
    subscriptionId: appSubscriptions[0]?.id ?? null,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");
  const appUrl = process.env.SHOPIFY_APP_URL || "";

  if (intent === "upgrade") {
    return billing.request({
      plan: PREMIUM_PLAN,
      isTest: isTestCharge(),
      returnUrl: `${appUrl}/app/billing`,
    });
  }

  if (intent === "cancel") {
    const subscriptionId = String(formData.get("subscriptionId") ?? "");
    if (subscriptionId) {
      await billing.cancel({
        subscriptionId,
        prorate: true,
        isTest: isTestCharge(),
      });
    }
    await setShopFree(session.shop);
    return { ok: true };
  }

  return { ok: false };
};

const FREE_FEATURES = ["2 active badges (Sale & New templates)", "Product card & product page placement", "All products / Sale products rules"];
const PREMIUM_FEATURES = [
  "All 20+ badge templates & custom badge designer",
  "Unlimited active badges",
  "Gradient backgrounds & full shape library",
  "Advanced product, collection, tag & inventory rules",
  "All display locations",
  "Scheduling, animations & custom CSS",
  "Priority display rules",
];

export default function Billing() {
  const { isPremium, subscriptionId } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  const upgrade = () => submit({ intent: "upgrade" }, { method: "post" });
  const cancel = () => {
    if (!window.confirm("Cancel your Premium subscription? Premium features will be locked immediately.")) {
      return;
    }
    submit({ intent: "cancel", subscriptionId: subscriptionId ?? "" }, { method: "post" });
  };

  return (
    <Page title="Billing & Plans">
      <Layout>
        <Layout.Section>
          <InlineStack gap="400" wrap blockAlign="stretch">
            <div style={{ flex: "1 1 320px", minWidth: 280 }}>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingLg">Free</Text>
                    <StatusBadge tone="success">Free</StatusBadge>
                  </InlineStack>
                  <Text as="p" variant="heading2xl">$0/month</Text>
                  <List>
                    {FREE_FEATURES.map((feature) => (
                      <List.Item key={feature}>{feature}</List.Item>
                    ))}
                  </List>
                  {!isPremium && (
                    <Button disabled fullWidth>
                      Current Plan
                    </Button>
                  )}
                </BlockStack>
              </Card>
            </div>

            <div style={{ flex: "1 1 320px", minWidth: 280 }}>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h2" variant="headingLg">Premium</Text>
                    <StatusBadge tone="warning">Premium</StatusBadge>
                  </InlineStack>
                  <Text as="p" variant="heading2xl">$1/month</Text>
                  <List>
                    {PREMIUM_FEATURES.map((feature) => (
                      <List.Item key={feature}>
                        <InlineStack gap="150" blockAlign="center">
                          <Icon source={CheckIcon} tone="success" />
                          <Text as="span">{feature}</Text>
                        </InlineStack>
                      </List.Item>
                    ))}
                  </List>
                  {isPremium ? (
                    <Button onClick={cancel} loading={isSubmitting} tone="critical" fullWidth>
                      Cancel Subscription
                    </Button>
                  ) : (
                    <Button onClick={upgrade} loading={isSubmitting} variant="primary" fullWidth>
                      Upgrade to Premium
                    </Button>
                  )}
                </BlockStack>
              </Card>
            </div>
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
