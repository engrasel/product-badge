import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { Page, Layout, Card, BlockStack, Text, List } from "@shopify/polaris";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function About() {
  return (
    <Page title="About">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingLg">
                Product Badges App
              </Text>
              <Text as="p" tone="subdued">
                Create beautiful product badges that increase conversions.
              </Text>
              <Text as="p">
                Design, customize, and place sale, new, and promotional badges
                anywhere across your storefront — no theme code required.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Built With
              </Text>
              <List>
                <List.Item>Remix on React Router + Vite</List.Item>
                <List.Item>Shopify Polaris &amp; App Bridge</List.Item>
                <List.Item>Prisma ORM (PostgreSQL)</List.Item>
                <List.Item>Shopify Admin GraphQL API</List.Item>
                <List.Item>Theme App Extension (App Blocks &amp; App Embeds)</List.Item>
              </List>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
