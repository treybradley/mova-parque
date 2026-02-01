// Color theory utilities for generating complementary colors

export function hexToHSL(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

export function HSLToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getComplementaryColor(hex: string): string {
  const [h, s, l] = hexToHSL(hex);
  const complementaryH = (h + 180) % 360;
  return HSLToHex(complementaryH, s, l);
}

// Generate blob tracking colors from dominant palette color
export function generateBlobTrackingColors(dominantColor: string) {
  const complementary = getComplementaryColor(dominantColor);
  const [h, s, l] = hexToHSL(complementary);

  return {
    boundingBoxColor: complementary,
    centroidColor: HSLToHex(h, s, Math.max(l - 10, 20)),
    connectionColor: HSLToHex(h, s, Math.max(l - 20, 10)),
    textColor: complementary,
  };
}

// Complementary color presets for each mood palette
export const blobTrackingColorPresets = [
  // Stasis (cool blues) → Complementary: warm oranges/yellows
  {
    boundingBoxColor: '#ffb847',
    centroidColor: '#ff7700',
    connectionColor: '#ff4400',
    textColor: '#ffb847',
  },
  // Tension (warm coral/pink) → Complementary: cyan/turquoise
  {
    boundingBoxColor: '#00ffcc',
    centroidColor: '#00ccff',
    connectionColor: '#0099ff',
    textColor: '#00ffcc',
  },
  // Flow (healing greens) → Complementary: magentas/purples
  {
    boundingBoxColor: '#ff00ff',
    centroidColor: '#cc00ff',
    connectionColor: '#9900ff',
    textColor: '#ff00ff',
  },
  // Drive (active amber) → Complementary: deep blues
  {
    boundingBoxColor: '#0066ff',
    centroidColor: '#0044cc',
    connectionColor: '#002299',
    textColor: '#0066ff',
  },
  // Kinetic (energetic sunrise) → Complementary: deep blue/purple
  {
    boundingBoxColor: '#4400ff',
    centroidColor: '#6600cc',
    connectionColor: '#8800aa',
    textColor: '#4400ff',
  },
];
