#!/usr/bin/env node
// Regenerates every app icon from the one Kindling mark in mark.mjs. Run from the repo root:
//   npm run icons
// Uses `sharp`, which Next.js already installs for the web app.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { svg } from "./mark.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sharp = createRequire(join(root, "apps/web/package.json"))("sharp");
const write = (path, buffer) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), buffer);
  console.log(`wrote ${path}`);
};
const png = (opts, size) => sharp(Buffer.from(svg(opts)), { density: 300 }).resize(size, size).png();
// Apple rejects an App Store icon that has an alpha channel, so full-bleed icons are flattened.
const opaque = (opts, size) => png(opts, size).flatten({ background: "#4a33c0" }).removeAlpha().toBuffer();

// iOS app icon and the web's apple-touch icon: full-bleed, no transparency (the OS rounds the corners).
write("apps/mobile/assets/icon.png", await opaque({ background: "full", scale: 1.06 }, 1024));
write("apps/web/src/app/apple-icon.png", await opaque({ background: "full", scale: 1.06 }, 180));

// Rounded-square icons with transparent corners: browser tab, installed web app, Expo web favicon.
write("apps/web/src/app/icon.svg", Buffer.from(svg({ background: "rounded", scale: 1.1 })));
write("apps/web/public/icons/icon-192.png", await png({ background: "rounded", scale: 1.06 }, 192).toBuffer());
write("apps/web/public/icons/icon-512.png", await png({ background: "rounded", scale: 1.06 }, 512).toBuffer());
write("apps/mobile/assets/favicon.png", await png({ background: "rounded", scale: 1.1 }, 512).toBuffer());

// Maskable: the OS crops it to any shape, so the mark stays well inside the central safe zone.
write("apps/web/public/icons/icon-maskable-512.png", await opaque({ background: "full", scale: 0.86 }, 512));

// Splash: the mark alone on transparent, sitting on the splash screen's dark background.
write("apps/mobile/assets/splash-icon.png", await png({ background: "none", scale: 1 }, 640).toBuffer());

// Android adaptive icon layers (the background colour is set in app.json): the mark within the 66% safe zone.
write("apps/mobile/assets/android-icon-foreground.png", await png({ background: "none", scale: 0.74 }, 1024).toBuffer());
write("apps/mobile/assets/android-icon-monochrome.png", await png({ background: "none", scale: 0.74, mono: "#ffffff" }, 1024).toBuffer());
