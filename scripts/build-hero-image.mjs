// Turns the owner's hero photograph into the responsive set the page loads.
//
// The site previously hotlinked a 421 KB JPEG from princeton.edu. That was the LCP
// candidate, it spent a third party's bandwidth, it carried a Drupal ?itok= derivative
// token that expires whenever the university rebuilds its image styles, and it was
// university-owned imagery on an independent site. A self-hosted photo we hold the
// rights to removes all four problems at once.
//
// Source:  src/assets/hero-nassau-hall.jpg  (any resolution, landscape)
// Outputs: public/hero-nassau-hall-{800,1200,1600,2000}.webp
//          public/hero-nassau-hall-1600.jpg   (fallback for browsers without WebP)
//          public/og-hero.jpg                 (1200x630 social card)
//
// If the source file is absent the script exits cleanly, so the build keeps working
// until the photograph is dropped in.

import { access, mkdir, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { constants } from "node:fs";

const run = promisify(execFile);

const SOURCE = new URL("../src/assets/hero-nassau-hall.jpg", import.meta.url);
const PUBLIC_DIR = new URL("../public/", import.meta.url);
const WIDTHS = [800, 1200, 1600, 2000];
const WEBP_QUALITY = "82";

async function exists(url) {
  try {
    await access(url, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function haveBinary(name) {
  try {
    await run("which", [name]);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(SOURCE))) {
  console.log("Hero source src/assets/hero-nassau-hall.jpg not found. Skipping hero image build.");
  process.exit(0);
}

if (!(await haveBinary("sips")) || !(await haveBinary("cwebp"))) {
  console.error("Hero image build needs sips (macOS) and cwebp (brew install webp).");
  process.exit(1);
}

await mkdir(PUBLIC_DIR, { recursive: true });

const tmp = new URL("../.hero-tmp/", import.meta.url);
await mkdir(tmp, { recursive: true });

for (const width of WIDTHS) {
  const intermediate = new URL(`resized-${width}.jpg`, tmp);
  // sips resamples on the longest edge and preserves aspect ratio.
  await run("sips", ["--resampleWidth", String(width), SOURCE.pathname, "--out", intermediate.pathname]);

  const webp = new URL(`hero-nassau-hall-${width}.webp`, PUBLIC_DIR);
  await run("cwebp", ["-q", WEBP_QUALITY, "-m", "6", intermediate.pathname, "-o", webp.pathname]);
  console.log(`  wrote hero-nassau-hall-${width}.webp`);

  if (width === 1600) {
    const jpg = new URL("hero-nassau-hall-1600.jpg", PUBLIC_DIR);
    await run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "72", intermediate.pathname, "--out", jpg.pathname]);
    console.log("  wrote hero-nassau-hall-1600.jpg (fallback)");
  }
}

// Social card. Open Graph wants 1200x630, so crop to that box after resizing.
const ogIntermediate = new URL("og-source.jpg", tmp);
await run("sips", ["--resampleWidth", "1200", SOURCE.pathname, "--out", ogIntermediate.pathname]);
await run("sips", ["-c", "630", "1200", ogIntermediate.pathname, "--out", new URL("og-hero.jpg", PUBLIC_DIR).pathname]);
console.log("  wrote og-hero.jpg (1200x630)");

await rm(tmp, { recursive: true, force: true });
console.log("Hero image set built.");
