import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Product Badges</h1>
        <p className={styles.text}>
          Create beautiful product badges that increase conversions.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Badge Library</strong>. Pick from free and premium badge
            templates — Sale, New, Best Seller, Flash Sale, and more.
          </li>
          <li>
            <strong>Full Customizer</strong>. Colors, shape, animation,
            position — with a live preview as you design.
          </li>
          <li>
            <strong>No theme editing</strong>. Badges render through a Theme
            App Extension, with rules for exactly which products show them.
          </li>
        </ul>
      </div>
    </div>
  );
}
