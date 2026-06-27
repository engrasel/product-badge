import type {
  HeadersFunction,
  LinksFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyBridgeProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { AppProvider as PolarisProvider, Frame } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import badgeStyles from "../styles/badges.css?url";

import { authenticate } from "../shopify.server";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
  { rel: "stylesheet", href: badgeStyles },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <ShopifyBridgeProvider embedded apiKey={apiKey}>
      <PolarisProvider i18n={polarisTranslations}>
        {/* Renders as Shopify Admin's own left sidebar — not custom chrome */}
        <NavMenu>
          <a href="/app" rel="home">
            Dashboard
          </a>
          <a href="/app/badges">Badge Library</a>
          <a href="/app/my-badges">My Badges</a>
          <a href="/app/badges/custom">Create Badge</a>
          <a href="/app/rules">Display Rules</a>
          <a href="/app/locations">Display Locations</a>
          <a href="/app/billing">Billing / Upgrade</a>
          <a href="/app/settings">Settings</a>
        </NavMenu>
        <Frame>
          <Outlet />
        </Frame>
      </PolarisProvider>
    </ShopifyBridgeProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
