export interface DepthEffectOptions {
  effectType: 'colorGrade' | 'blur' | 'desaturate' | 'heatmap' | 'xray';
  intensity: number;
  depthRange: [number, number];
  foregroundColor?: string;
  backgroundFolor?: string;
}

export function applyDepthEffect(
  originalData: ImageData,
  depthData: ImageData,
  options: DepthEffectOptions
): ImageData {
  const output = new ImageData(
    new Uint8ClampedArray(originalData.data),
    originalData.width,
    originalData.height
  );

  const [minDepth, maxDepth] = options.depthRange;

  for (let i = 0; i < depthData.data.length; i += 4) {
    const depth = depthData.data[i] / 255;
    if (depth < minDepth || depth > maxDepth) continue;

    switch (options.effectType) {
      case 'colorGrade':
        applyColorGrade(output.data, i, depth, options.intensity);
        break;
      case 'blur':
        break;
      case 'desaturate':
        applyDesaturation(output.data, i, options.intensity);
        break;
      case 'heatmap':
        applyHeatmap(output.data, i, depth);
        break;
      case 'xray':
        applyXray(output.data, i, depth, options.intensity);
        break;
    }
  }

  return output;
}

function applyColorGrade(data: Uint8ClampedArray, i: number, depth: number, strength: number): void {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  if (depth > 0.5) {
    data[i] = Math.max(0, r - strength * 50);
    data[i + 2] = Math.min(255, b + strength * 50);
  } else {
    data[i] = Math.min(255, r + strength * 50);
    data[i + 1] = Math.max(0, g - strength * 15);
  }
}

function applyDesaturation(data: Uint8ClampedArray, i: number, strength: number): void {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  data[i] = r + (gray - r) * strength;
  data[i + 1] = g + (gray - g) * strength;
  data[i + 2] = b + (gray - b) * strength;
}

function applyHeatmap(data: Uint8ClampedArray, i: number, depth: number): void {
  const hue = (1 - depth) * 240;
  const rgb = hslToRgb(hue / 360, 1, 0.5);
  data[i] = rgb[0];
  data[i + 1] = rgb[1];
  data[i + 2] = rgb[2];
}

function applyXray(data: Uint8ClampedArray, i: number, depth: number, _strength: number): void {
  // Same HSL → RGB vibe as heatmap: fixed x-ray hue (cyan/blue), depth drives saturation & lightness
  const hue = 195 / 360; // cyan-blue x-ray tint
  const saturation = 0.2 + (1 - depth) * 0.6; // near = whiter (low sat), far = more teal (higher sat)
  const lightness = 0.5 + depth * 0.45; // near = brighter, far = darker
  const rgb = hslToRgb(hue, saturation, lightness);
  data[i] = rgb[0];
  data[i + 1] = rgb[1];
  data[i + 2] = rgb[2];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
