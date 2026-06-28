import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { Page, Layout, Card, BlockStack, Text, List } from "@shopify/polaris";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

const FAQS: { question: string; answer: string }[] = [
  {
    question: "Why isn't my badge showing on the storefront?",
    answer:
      "Three things need to line up: the badge must be Active (Customizer), it needs at least one Display Rule (Display Rules page), and the storefront surface it should appear on must be toggled on (Display Locations). Also confirm the app's App Embed is activated once in Theme Editor > App embeds.",
  },
  {
    question: "How do I add the badge to my theme?",
    answer:
      "Open your theme editor, go to App embeds, and turn on \"Product Badges (Global)\" — this covers Collection Cards, Search, Featured/Homepage sections automatically. For the Product Detail Page specifically, add the \"Product Badge\" app block inside your product template for pixel-precise placement.",
  },
  {
    question: "What's the difference between Display Rules and Display Locations?",
    answer:
      "Display Rules decide WHICH products a badge shows on (e.g. discounted products, a specific collection). Display Locations decide WHERE on your storefront badges are allowed to appear at all (e.g. Product Cards, Search Results). A badge needs both to be configured correctly.",
  },
  {
    question: "Can I use a badge on more than one set of products?",
    answer:
      "Yes — create a second badge from the Badges page or Create Badge, and give it its own Display Rule. Each badge has independent rules.",
  },
];

export default function Help() {
  return (
    <Page title="Help">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {FAQS.map((faq) => (
              <Card key={faq.question}>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    {faq.question}
                  </Text>
                  <Text as="p" tone="subdued">
                    {faq.answer}
                  </Text>
                </BlockStack>
              </Card>
            ))}
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Quick Checklist
              </Text>
              <List type="number">
                <List.Item>Select or create a badge</List.Item>
                <List.Item>Customize its look in the Customizer</List.Item>
                <List.Item>Add a Display Rule</List.Item>
                <List.Item>Turn on the relevant Display Location(s)</List.Item>
                <List.Item>Activate the App Embed in Theme Editor</List.Item>
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
