import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#fff5f8" />
      <stop offset="45%" stop-color="#fce4ec" />
      <stop offset="80%" stop-color="#f8bbd0" />
      <stop offset="100%" stop-color="#f48fb1" />
    </radialGradient>

    <!-- Ring Gradient -->
    <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd54f" />
      <stop offset="35%" stop-color="#ffb300" />
      <stop offset="70%" stop-color="#ff8f00" />
      <stop offset="100%" stop-color="#ffd54f" />
    </linearGradient>

    <!-- Deep Pink Gradient -->
    <linearGradient id="pinkRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d81b60" />
      <stop offset="50%" stop-color="#ad1457" />
      <stop offset="100%" stop-color="#880e4f" />
    </linearGradient>

    <!-- Ribbon Shading -->
    <linearGradient id="ribbonPink" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f48fb1" />
      <stop offset="50%" stop-color="#ec407a" />
      <stop offset="100%" stop-color="#d81b60" />
    </linearGradient>
    <linearGradient id="ribbonDark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d81b60" />
      <stop offset="60%" stop-color="#ad1457" />
      <stop offset="100%" stop-color="#880e4f" />
    </linearGradient>

    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#880e4f" flood-opacity="0.25" />
    </filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#ad1457" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Circular Base Badge (Fits YouTube circle crop perfectly) -->
  <circle cx="400" cy="400" r="390" fill="url(#bgGrad)" />
  
  <!-- Outer Gold & Deep Pink Framing Rings -->
  <circle cx="400" cy="400" r="380" fill="none" stroke="url(#goldRing)" stroke-width="8" opacity="0.9" />
  <circle cx="400" cy="400" r="365" fill="none" stroke="url(#pinkRing)" stroke-width="4" stroke-dasharray="8 6" opacity="0.6" />

  <!-- Inner Soft Container Card -->
  <circle cx="400" cy="400" r="330" fill="#ffffff" filter="url(#shadow)" />
  <circle cx="400" cy="400" r="328" fill="none" stroke="#fce4ec" stroke-width="4" />

  <!-- Text Along Arcs: Top "LISA'S KITCHEN" -->
  <path id="textArcTop" fill="none" d="M 170 380 A 240 240 0 0 1 630 380" />
  <text font-family="'Fraunces', Georgia, serif" font-size="44" font-weight="900" fill="#880e4f" letter-spacing="7" filter="url(#glow)">
    <textPath href="#textArcTop" startOffset="50%" text-anchor="middle">
      LISA'S KITCHEN
    </textPath>
  </text>

  <!-- Text Along Arcs: Bottom "SURVIVOR COOKING STUDIO" -->
  <path id="textArcBottom" fill="none" d="M 620 440 A 240 240 0 0 1 180 440" />
  <text font-family="'Outfit', -apple-system, sans-serif" font-size="24" font-weight="800" fill="#ad1457" letter-spacing="6">
    <textPath href="#textArcBottom" startOffset="50%" text-anchor="middle">
      SURVIVOR COOKING STUDIO
    </textPath>
  </text>

  <!-- Golden Stars & Ribbon Flourishes -->
  <circle cx="165" cy="400" r="6" fill="#ffb300" />
  <circle cx="635" cy="400" r="6" fill="#ffb300" />

  <!-- Crossed Chef Utensils in Background -->
  <g opacity="0.22" transform="translate(400, 410)">
    <!-- Wooden Spoon Angle 1 -->
    <g transform="rotate(45)">
      <ellipse cx="0" cy="-140" rx="28" ry="42" fill="#ad1457" />
      <rect x="-6" y="-105" width="12" height="230" rx="6" fill="#ad1457" />
    </g>
    <!-- Whisk Angle 2 -->
    <g transform="rotate(-45)">
      <ellipse cx="0" cy="-140" rx="30" ry="46" fill="none" stroke="#ad1457" stroke-width="8" />
      <ellipse cx="0" cy="-140" rx="16" ry="38" fill="none" stroke="#ad1457" stroke-width="6" />
      <rect x="-6" y="-100" width="12" height="230" rx="6" fill="#ad1457" />
    </g>
  </g>

  <!-- Central Breast Cancer Survivor Ribbon (Enhanced 3D Vector) -->
  <g transform="translate(400, 400) scale(3.4)" filter="url(#shadow)">
    <!-- Ribbon Loop Back -->
    <path fill="url(#ribbonDark)" d="M0 -30 C-22 -30 -36 -12 -36 8 C-36 28 -20 46 0 66 C20 46 36 28 36 8 C36 -12 22 -30 0 -30 Z" />
    <ellipse cx="0" cy="8" rx="18" ry="24" fill="#ffffff" />

    <!-- Left Leg (Crossing in front) -->
    <path fill="url(#ribbonPink)" d="M -16 12 C -24 30 -38 52 -44 80 L -22 84 C -16 62 -4 44 2 28 Z" />
    <path fill="#ad1457" d="M -44 80 L -22 84 L -18 96 L -40 92 Z" opacity="0.6" />

    <!-- Right Leg (Underneath) -->
    <path fill="url(#ribbonDark)" d="M 16 12 C 24 30 38 52 44 80 L 22 84 C 16 62 4 44 -2 28 Z" />
    <path fill="#880e4f" d="M 44 80 L 22 84 L 18 96 L 40 92 Z" opacity="0.6" />

    <!-- Ribbon Front Loop Overlay -->
    <path fill="url(#ribbonPink)" d="M 0 -28 C -18 -28 -30 -12 -30 6 C -30 22 -16 38 0 54 C 16 38 30 22 30 6 C 30 -12 18 -28 0 -28 Z" opacity="0.95" />
    <ellipse cx="0" cy="6" rx="14" ry="20" fill="#ffffff" />
    
    <!-- Heart Accent in the Ribbon Center -->
    <path fill="url(#goldRing)" d="M 0 -2 C -1 -5 -6 -7 -9 -4 C -13 0 -9 6 0 12 C 9 6 13 0 9 -4 C 6 -7 1 -5 0 -2 Z" transform="scale(0.85) translate(0, -6)" />
  </g>
</svg>
`;

async function main() {
  const outDir = path.resolve("public");
  fs.writeFileSync(path.join(outDir, "youtube-avatar.svg"), svg.trim());
  
  // Generate 800x800 PNG (YouTube's exact recommended specification)
  await sharp(Buffer.from(svg))
    .resize(800, 800)
    .png({ quality: 100 })
    .toFile(path.join(outDir, "youtube-avatar-800.png"));

  // Generate 1024x1024 PNG for ultra high-res
  await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .png({ quality: 100 })
    .toFile(path.join(outDir, "youtube-avatar-1024.png"));

  console.log("Successfully generated YouTube channel avatar images!");
}

main().catch(console.error);
