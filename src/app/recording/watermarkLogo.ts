import svgPaths from "@/assets/svg-w6x2cs2wv6";

const LOGO_VIEWBOX = "0 0 48 32.7232";
const LOGO_ASPECT = 32.7232 / 48; // viewBox height / width

export function getWatermarkLogoDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}"><path fill="white" d="${svgPaths.p22b9f120}"/><path fill="white" d="${svgPaths.p21b83b80}"/></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

let cachedWatermarkImage: HTMLImageElement | null = null;

export function getWatermarkLogoImage(): HTMLImageElement {
  if (cachedWatermarkImage) return cachedWatermarkImage;
  const img = new Image();
  img.src = getWatermarkLogoDataUrl();
  cachedWatermarkImage = img;
  return img;
}

export function drawLogoWatermarkGrid(
  ctx: CanvasRenderingContext2D,
  destW: number,
  destH: number,
  opacity: number
): void {
  const img = getWatermarkLogoImage();
  if (!img.complete || !img.naturalWidth) return;
  const tileW = Math.min(destW, destH) * 0.12;
  const tileH = tileW * LOGO_ASPECT;
  const spacingX = tileW * 2.2;
  const spacingY = tileH * 2.2;
  ctx.globalAlpha = opacity;
  for (let i = -2; i <= Math.ceil(destW / spacingX) + 2; i++) {
    for (let j = -2; j <= Math.ceil(destH / spacingY) + 2; j++) {
      const x = i * spacingX - tileW / 2;
      const y = j * spacingY - tileH / 2;
      ctx.drawImage(img, x, y, tileW, tileH);
    }
  }
  ctx.globalAlpha = 1;
}
