import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// index.html carried a hand-maintained datePublished/dateModified pair in its JSON-LD.
// A frozen date keeps asserting freshness the site no longer has, and nobody remembers
// to bump it. Stamp it at build time instead. SOURCE_DATE_EPOCH is honored so a
// reproducible build can pin the value.
const buildDate = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000)
  : new Date();
const today = buildDate.toISOString().slice(0, 10);

function stampBuildDate() {
  return {
    name: "stamp-build-date",
    transformIndexHtml(html) {
      return html
        .replace(/"datePublished":\s*"\d{4}-\d{2}-\d{2}"/g, `"datePublished": "${today}"`)
        .replace(/"dateModified":\s*"\d{4}-\d{2}-\d{2}"/g, `"dateModified": "${today}"`);
    },
  };
}

export default defineConfig({
  plugins: [react(), stampBuildDate()],
});
