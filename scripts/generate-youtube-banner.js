import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const bannerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 1440" width="2560" height="1440">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bgWall" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b111e" />
      <stop offset="30%" stop-color="#541b2e" />
      <stop offset="60%" stop-color="#6a233b" />
      <stop offset="100%" stop-color="#3a1220" />
    </linearGradient>

    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ad1457" stop-opacity="0.45" />
      <stop offset="50%" stop-color="#880e4f" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#3b111e" stop-opacity="0" />
    </radialGradient>

    <!-- Gold Gradients -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe082" />
      <stop offset="35%" stop-color="#ffd54f" />
      <stop offset="70%" stop-color="#ffb300" />
      <stop offset="100%" stop-color="#ffe082" />
    </linearGradient>

    <!-- Pink Gradients -->
    <linearGradient id="pinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8bbd0" />
      <stop offset="40%" stop-color="#f48fb1" />
      <stop offset="80%" stop-color="#ec407a" />
      <stop offset="100%" stop-color="#d81b60" />
    </linearGradient>

    <!-- Shadow Filters -->
    <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.7" />
    </filter>
    <filter id="ribbonShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Base Wall Background -->
  <rect width="2560" height="1440" fill="url(#bgWall)" />

  <!-- Subtle Kitchen Wallpaper Diagonal Stripes Pattern -->
  <g opacity="0.05">
    ${Array.from({ length: 40 }).map((_, i) => `<line x1="${i * 90 - 400}" y1="0" x2="${i * 90 + 1200}" y2="1440" stroke="#ffffff" stroke-width="2" />`).join("")}
  </g>

  <!-- Ambient Light from Center -->
  <rect width="2560" height="1440" fill="url(#centerGlow)" />

  <!-- Decorative Kitchen Vignette Accents (Cast iron skillet, herbs, wooden spoons) -->
  <!-- Left Side Accents (Visible on desktop/TV, outside mobile safe zone) -->
  <g opacity="0.25" transform="translate(280, 720)">
    <!-- Big Cast Iron Skillet Silhouette -->
    <circle cx="0" cy="0" r="220" fill="none" stroke="#f8bbd0" stroke-width="18" />
    <circle cx="0" cy="0" r="190" fill="#2d0c17" />
    <rect x="-30" y="-380" width="60" height="180" rx="20" fill="#f8bbd0" />
    <circle cx="0" cy="-330" r="14" fill="#2d0c17" />
    <text x="0" y="20" font-family="Georgia, serif" font-size="28" fill="#ffd54f" font-weight="700" text-anchor="middle" letter-spacing="4">TEXAS CAST IRON</text>
  </g>

  <!-- Right Side Accents (Visible on desktop/TV) -->
  <g opacity="0.25" transform="translate(2280, 720)">
    <!-- Whisk & Rolling Pin Silhouette -->
    <ellipse cx="0" cy="0" rx="140" ry="240" fill="none" stroke="#f8bbd0" stroke-width="14" stroke-dasharray="16 12" />
    <rect x="-18" y="-320" width="36" height="640" rx="18" fill="#f8bbd0" transform="rotate(35)" />
    <rect x="-18" y="-320" width="36" height="640" rx="18" fill="#ffd54f" transform="rotate(-35)" />
  </g>

  <!-- ======================================================== -->
  <!-- SAFE AREA ZONE: 1546 x 423 px centered at (1280, 720)   -->
  <!-- Perfectly visible across mobile phones, tablets & desktops -->
  <!-- ======================================================== -->

  <!-- Safe Area Card Container -->
  <g transform="translate(1280, 720)">
    <!-- Soft Backing Plaque -->
    <rect x="-700" y="-180" width="1400" height="360" rx="36" fill="#260b14" opacity="0.8" filter="url(#ribbonShadow)" />
    <rect x="-700" y="-180" width="1400" height="360" rx="36" fill="none" stroke="url(#goldGrad)" stroke-width="3" opacity="0.8" />
    <rect x="-686" y="-166" width="1372" height="332" rx="24" fill="none" stroke="#f48fb1" stroke-width="1.5" stroke-dasharray="8 6" opacity="0.4" />

    <!-- Left Breast Cancer Survivor Ribbon Emblem -->
    <g transform="translate(-520, -5) scale(2.2)" filter="url(#ribbonShadow)">
      <!-- Back loop -->
      <path fill="#880e4f" d="M0 -30 C-22 -30 -36 -12 -36 8 C-36 28 -20 46 0 66 C20 46 36 28 36 8 C36 -12 22 -30 0 -30 Z" />
      <ellipse cx="0" cy="8" rx="18" ry="24" fill="#260b14" />
      <!-- Left leg -->
      <path fill="url(#pinkGrad)" d="M -16 12 C -24 30 -38 52 -44 80 L -22 84 C -16 62 -4 44 2 28 Z" />
      <!-- Right leg -->
      <path fill="#ad1457" d="M 16 12 C 24 30 38 52 44 80 L 22 84 C 16 62 4 44 -2 28 Z" />
      <!-- Front loop -->
      <path fill="url(#pinkGrad)" d="M 0 -28 C -18 -28 -30 -12 -30 6 C -30 22 -16 38 0 54 C 16 38 30 22 30 6 C 30 -12 18 -28 0 -28 Z" opacity="0.95" />
      <ellipse cx="0" cy="6" rx="14" ry="20" fill="#260b14" />
      <!-- Gold star -->
      <polygon points="0,-6 2,-1 7,-1 3,2 5,7 0,4 -5,7 -3,2 -7,-1 -2,-1" fill="#ffd54f" />
    </g>

    <!-- Main Typography Block (Positioned in Center Safe Zone) -->
    <g transform="translate(60, 0)">
      <!-- Top Survivor Kicker Badge -->
      <g transform="translate(0, -96)">
        <rect x="-240" y="-18" width="480" height="36" rx="18" fill="#ad1457" />
        <rect x="-240" y="-18" width="480" height="36" rx="18" fill="none" stroke="url(#goldGrad)" stroke-width="1.5" />
        <text x="0" y="6" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="4">
          🎗️ BREAST CANCER SURVIVOR KITCHEN
        </text>
      </g>

      <!-- Main Headline: LISA'S KITCHEN STUDIO -->
      <text x="0" y="-14" font-family="'Fraunces', Georgia, serif" font-size="64" font-weight="900" fill="url(#goldGrad)" text-anchor="middle" letter-spacing="6" filter="url(#textGlow)">
        LISA'S KITCHEN STUDIO
      </text>

      <!-- Subtitle Tagline -->
      <text x="0" y="38" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" fill="#fce4ec" text-anchor="middle" letter-spacing="3" filter="url(#textGlow)">
        SOUTHERN COMFORT • CAJUN TRADITIONS • HEALTHY PET FOOD
      </text>

      <!-- Channel Handle & Local Community Footnote -->
      <g transform="translate(0, 96)">
        <text x="0" y="4" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="600" fill="#f48fb1" text-anchor="middle" letter-spacing="3">
          @LisasKitchenStudio • Raised Bed Gardening &amp; Scratch Recipes • Lubbock &amp; Wolfforth, TX
        </text>
      </g>
    </g>
  </g>

  <!-- Top & Bottom Frame Border Accents -->
  <rect x="0" y="0" width="2560" height="12" fill="url(#goldGrad)" />
  <rect x="0" y="1428" width="2560" height="12" fill="url(#goldGrad)" />
</svg>
`;

async function main() {
  const outDir = path.resolve("public");
  fs.writeFileSync(path.join(outDir, "youtube-banner.svg"), bannerSvg.trim());

  // Generate 2560x1440 PNG (YouTube's exact recommended specification)
  await sharp(Buffer.from(bannerSvg))
    .resize(2560, 1440)
    .png({ quality: 100 })
    .toFile(path.join(outDir, "youtube-banner-2560.png"));

  console.log("Successfully generated YouTube channel cover banner image (2560x1440)!");
}

main().catch(console.error);
