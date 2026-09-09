/**
 * Storyboard Grid Exporter
 * Generates high-resolution (2x Retina) composite grid images using HTML5 Canvas.
 * Supports exporting in sets of 10 (2 rows x 5 columns) or as 1 master continuous grid.
 */

import { StoryboardScreen } from '@/lib/types';

export interface StoryboardExportOptions {
  title?: string;
  includeActions?: boolean;
  theme?: 'light' | 'dark';
}

/**
 * Recalculate sequential badges (#1, #1a, #2, #2a...) for a list of screens
 */
export function computeStepBadges(screens: StoryboardScreen[]): StoryboardScreen[] {
  let primaryIndex = 0;
  let subIndex = 0;

  return screens.map((screen, idx) => {
    if (idx === 0 || !screen.isSubScreen) {
      primaryIndex++;
      subIndex = 0;
      return {
        ...screen,
        stepBadge: `#${primaryIndex}`
      };
    } else {
      const subLetter = String.fromCharCode(97 + subIndex); // 'a', 'b', 'c'...
      subIndex++;
      return {
        ...screen,
        stepBadge: `#${primaryIndex}${subLetter}`
      };
    }
  });
}

/**
 * Preload HTMLImageElement from a URL or Blob
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Create fallback transparent canvas if image fails to load
      const fallback = new Image();
      fallback.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="600" fill="%23222"><text x="50%" y="50%" fill="%23888" text-anchor="middle">Image Not Available</text></svg>';
      fallback.onload = () => resolve(fallback);
      fallback.onerror = (e) => reject(e);
    };
    img.src = url;
  });
}

/**
 * Render a single grid of up to N screens onto an HTML5 Canvas
 */
async function renderGridCanvas(
  screens: StoryboardScreen[],
  options: {
    title: string;
    includeActions: boolean;
    theme: 'light' | 'dark';
    partLabel?: string;
  }
): Promise<HTMLCanvasElement> {
  const { title, includeActions, theme, partLabel } = options;
  const isDark = theme === 'dark';

  const cols = 5;
  const count = screens.length;
  const rows = Math.ceil(count / cols);

  // Geometric specifications (in base pixels, scaled by 2x for Retina export)
  const scale = 2;
  const cardWidth = 340;
  const cardPadding = 16;
  const imageWidth = cardWidth - cardPadding * 2; // 308px
  const imageHeight = Math.round(imageWidth * 1.85); // standard phone ratio 9:16.6 ~ 570px

  const titleAreaHeight = 32;
  const actionsAreaHeight = includeActions ? 110 : 0;
  const cardHeight = cardPadding * 2 + imageHeight + titleAreaHeight + actionsAreaHeight;

  const gap = 24;
  const marginX = 40;
  const marginTop = 100; // Room for header banner
  const marginBottom = 40;

  const canvasWidth = marginX * 2 + cols * cardWidth + (cols - 1) * gap;
  const canvasHeight = marginTop + rows * cardHeight + (rows - 1) * gap + marginBottom;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create canvas 2d context');

  ctx.scale(scale, scale);

  // 1. Draw Canvas Background
  ctx.fillStyle = isDark ? '#141413' : '#F9F9FB';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. Draw Top Header Banner
  ctx.fillStyle = isDark ? '#FFFFFF' : '#111827';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(title, marginX, 48);

  ctx.fillStyle = isDark ? '#00FF88' : '#059669';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const subtitle = partLabel 
    ? `${partLabel.toUpperCase()} • ${count} SCREEN${count === 1 ? '' : 'S'} • QA TEST STUDIO STORYBOARD`
    : `${count} SCREEN${count === 1 ? '' : 'S'} IN SEQUENCE • QA TEST STUDIO STORYBOARD`;
  ctx.fillText(subtitle, marginX, 74);

  // Timestamp on top right
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  ctx.fillStyle = isDark ? '#737871' : '#9CA3AF';
  ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Generated on ${dateStr}`, canvasWidth - marginX, 58);
  ctx.textAlign = 'left';

  // 3. Preload all screen images
  const loadedImages = await Promise.all(screens.map((s) => loadImage(s.previewUrl)));

  // 4. Render each card
  for (let i = 0; i < screens.length; i++) {
    const screen = screens[i];
    const img = loadedImages[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = marginX + col * (cardWidth + gap);
    const y = marginTop + row * (cardHeight + gap);

    // A. Card Chassis / Rounded Box
    ctx.save();
    drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 18);
    ctx.fillStyle = isDark ? '#1D1E1C' : '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = isDark ? '#2D302B' : '#E5E7EB';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // B. Phone Device Frame
    const imgX = x + cardPadding;
    const imgY = y + cardPadding;

    ctx.save();
    drawRoundedRect(ctx, imgX, imgY, imageWidth, imageHeight, 14);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.clip(); // Clip image inside rounded phone bezel

    // Draw the image maintaining aspect ratio
    const imgAspect = img.width / img.height;
    const frameAspect = imageWidth / imageHeight;
    let renderW = imageWidth;
    let renderH = imageHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > frameAspect) {
      // Image is wider than frame
      renderH = imageHeight;
      renderW = imageHeight * imgAspect;
      offsetX = (imageWidth - renderW) / 2;
    } else {
      // Image is taller or equal
      renderW = imageWidth;
      renderH = imageWidth / imgAspect;
      offsetY = 0; // Align to top of phone
    }

    ctx.drawImage(img, imgX + offsetX, imgY + offsetY, renderW, renderH);
    ctx.restore();

    // Frame outer border
    ctx.save();
    drawRoundedRect(ctx, imgX, imgY, imageWidth, imageHeight, 14);
    ctx.strokeStyle = isDark ? '#3D4039' : '#D1D5DB';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // C. Step Number Badge (Upper-left of card)
    ctx.save();
    const badgeText = screen.stepBadge || `#${i + 1}`;
    ctx.font = 'bold 12px ui-monospace, SFMono-Regular, monospace';
    const badgeMetrics = ctx.measureText(badgeText);
    const badgeW = Math.max(34, badgeMetrics.width + 14);
    const badgeH = 22;
    const badgeX = imgX + 8;
    const badgeY = imgY + 8;

    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 8);
    ctx.fillStyle = isDark ? '#00FF88' : '#111827';
    ctx.fill();

    ctx.fillStyle = isDark ? '#111827' : '#FFFFFF';
    ctx.fillText(badgeText, badgeX + 7, badgeY + 15);
    ctx.restore();

    // D. Step Title Text
    const textStartY = imgY + imageHeight + 18;
    ctx.fillStyle = isDark ? '#FFFFFF' : '#111827';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const titleText = truncateText(ctx, screen.name || `Screen ${i + 1}`, imageWidth);
    ctx.fillText(titleText, imgX, textStartY);

    // E. Action Details (if enabled)
    if (includeActions) {
      const actionStartY = textStartY + 18;

      // Divider line
      ctx.strokeStyle = isDark ? '#2D302B' : '#F3F4F6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(imgX, actionStartY - 5);
      ctx.lineTo(imgX + imageWidth, actionStartY - 5);
      ctx.stroke();

      ctx.fillStyle = isDark ? '#00FF88' : '#059669';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('User Actions:', imgX, actionStartY + 8);

      // Render up to 3 action bullet lines
      const actionsList = (screen.actions && screen.actions.length > 0)
        ? screen.actions.map(a => a.description)
        : (screen.name ? [screen.name] : ['Interact with screen elements']);

      ctx.fillStyle = isDark ? '#A6ABA1' : '#4B5563';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      actionsList.slice(0, 3).forEach((act, actIdx) => {
        const bulletText = truncateText(ctx, `${actIdx + 1}. ${act}`, imageWidth);
        ctx.fillText(bulletText, imgX, actionStartY + 24 + actIdx * 16);
      });

      // Expected response (if present)
      if (screen.expectedResult) {
        ctx.fillStyle = isDark ? '#60A5FA' : '#2563EB';
        ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const expText = truncateText(ctx, `Expected: ${screen.expectedResult}`, imageWidth);
        ctx.fillText(expText, imgX, actionStartY + 24 + Math.min(actionsList.length, 3) * 16 + 2);
      }
    }
  }

  return canvas;
}

/**
 * Helper to draw a rounded rectangle
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Truncate text with ellipsis if it exceeds max width
 */
function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * Download a canvas as a high-res PNG file
 */
function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve();
      }, 500);
    }, 'image/png');
  });
}

/**
 * Export 1 Master Combined Image (all screens in 1 continuous grid)
 */
export async function exportStoryboardMasterImage(
  screens: StoryboardScreen[],
  options?: StoryboardExportOptions
): Promise<void> {
  if (screens.length === 0) return;
  const computedScreens = computeStepBadges(screens);
  const flowTitle = options?.title?.trim() || 'Feature User Flow';
  const includeActions = options?.includeActions ?? true;
  const theme = options?.theme ?? 'light';

  const canvas = await renderGridCanvas(computedScreens, {
    title: flowTitle,
    includeActions,
    theme,
    partLabel: 'Complete Flow'
  });

  const safeName = flowTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  await downloadCanvasAsPng(canvas, `${safeName}_storyboard_master.png`);
}

/**
 * Export in Sets of 10 (e.g. 10 screens per image, exactly matching 2 rows x 5 cols)
 */
export async function exportStoryboardInSetsOf10(
  screens: StoryboardScreen[],
  options?: StoryboardExportOptions
): Promise<void> {
  if (screens.length === 0) return;
  const computedScreens = computeStepBadges(screens);
  const flowTitle = options?.title?.trim() || 'Feature User Flow';
  const includeActions = options?.includeActions ?? true;
  const theme = options?.theme ?? 'light';

  const chunkSize = 10;
  const totalSets = Math.ceil(computedScreens.length / chunkSize);
  const safeName = flowTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

  for (let setIdx = 0; setIdx < totalSets; setIdx++) {
    const chunk = computedScreens.slice(setIdx * chunkSize, (setIdx + 1) * chunkSize);
    const startNum = setIdx * chunkSize + 1;
    const endNum = Math.min((setIdx + 1) * chunkSize, computedScreens.length);
    const partLabel = totalSets > 1 
      ? `Part ${setIdx + 1} of ${totalSets} (Screens ${startNum}–${endNum})`
      : `Screens 1–${endNum}`;

    const canvas = await renderGridCanvas(chunk, {
      title: flowTitle,
      includeActions,
      theme,
      partLabel
    });

    const filename = totalSets > 1
      ? `${safeName}_storyboard_part_${setIdx + 1}_of_${totalSets}.png`
      : `${safeName}_storyboard.png`;

    await downloadCanvasAsPng(canvas, filename);
  }
}
