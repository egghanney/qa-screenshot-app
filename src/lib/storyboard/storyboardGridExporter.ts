/**
 * Storyboard Grid Exporter
 * Generates high-resolution (2x Retina) composite grid images using HTML5 Canvas.
 * Supports exporting in sets of 10 (2 rows x 5 columns) or as 1 master continuous grid.
 */

import { StoryboardScreen, StoryboardExecutiveContext } from '@/lib/types';

export interface StoryboardExportOptions {
  title?: string;
  includeActions?: boolean;
  theme?: 'light' | 'dark';
  context?: StoryboardExecutiveContext;
  includeContext?: boolean;
}

/**
 * Recalculate sequential badges (#1, #1a, #1a.1, #2, #2a...) for a list of screens
 */
export function computeStepBadges(screens: StoryboardScreen[]): StoryboardScreen[] {
  let primaryIndex = 0;
  let subIndex = 0;
  let subSubIndex = 0;

  return screens.map((screen, idx) => {
    // Determine effective nest level (0 = Primary, 1 = Sub, 2 = Sub of Sub)
    let level = screen.nestLevel ?? (screen.isSubScreen ? 1 : 0);
    if (idx === 0) level = 0; // First screen must always be primary

    if (level === 0) {
      primaryIndex++;
      subIndex = 0;
      subSubIndex = 0;
      return {
        ...screen,
        isSubScreen: false,
        nestLevel: 0,
        stepBadge: `#${primaryIndex}`
      };
    } else if (level === 1) {
      if (primaryIndex === 0) primaryIndex = 1;
      const subLetter = String.fromCharCode(97 + subIndex); // 'a', 'b', 'c'...
      subIndex++;
      subSubIndex = 0;
      return {
        ...screen,
        isSubScreen: true,
        nestLevel: 1,
        stepBadge: `#${primaryIndex}${subLetter}`
      };
    } else {
      // level === 2 (Sub of a Sub)
      if (primaryIndex === 0) primaryIndex = 1;
      const effectiveSubLetter = String.fromCharCode(97 + Math.max(0, subIndex - 1));
      subSubIndex++;
      return {
        ...screen,
        isSubScreen: true,
        nestLevel: 2,
        stepBadge: `#${primaryIndex}${effectiveSubLetter}.${subSubIndex}`
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
    context?: StoryboardExecutiveContext;
    includeContext?: boolean;
  }
): Promise<HTMLCanvasElement> {
  const { title, includeActions, theme, partLabel, context, includeContext } = options;
  const isDark = theme === 'dark';

  const cols = 5;
  const count = screens.length;
  const rows = Math.ceil(count / cols);

  // Parse Executive Context Pillars
  const rawPillars = [
    { num: 1, title: 'Features & Services', content: context?.featuresAndServices?.trim() },
    { num: 2, title: 'User Types', content: context?.userTypes?.trim() },
    { num: 3, title: 'Journeys & Navigation', content: context?.journeysAndNavigation?.trim() },
    { num: 4, title: 'Interaction & Configuration', content: context?.interactionReference?.trim() },
    { num: 5, title: 'Business Rules & Constraints', content: context?.businessRules?.trim() },
    { num: 6, title: 'System & Failure States', content: context?.systemFailureStates?.trim() },
    { num: 7, title: 'Communications & Dependencies', content: context?.communicationsDependencies?.trim() },
    { num: 8, title: 'Historical Knowledge & Risk', content: context?.historicalKnowledgeRisk?.trim() }
  ];
  const populatedPillars = rawPillars.filter(p => !!p.content);
  const hasExecutiveContext = (includeContext ?? true) && populatedPillars.length > 0;
  const executiveCardHeight = hasExecutiveContext ? (populatedPillars.length > 4 ? 200 : 125) : 0;
  const executiveGap = hasExecutiveContext ? 28 : 0;

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
  const marginTop = 100;
  const effectiveMarginTop = marginTop + executiveCardHeight + executiveGap;
  const marginBottom = 40;

  const canvasWidth = marginX * 2 + cols * cardWidth + (cols - 1) * gap;
  const canvasHeight = effectiveMarginTop + rows * cardHeight + (rows - 1) * gap + marginBottom;

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

  // 3. Draw Executive Header Specifications Card (if context provided and non-empty)
  if (hasExecutiveContext) {
    const execX = marginX;
    const execY = 95;
    const execW = canvasWidth - marginX * 2;
    const execH = executiveCardHeight;

    ctx.save();
    drawRoundedRect(ctx, execX, execY, execW, execH, 16);
    ctx.fillStyle = isDark ? '#1D1E1C' : '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = isDark ? '#2D302B' : '#E5E7EB';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top Bar inside Executive Card
    ctx.fillStyle = isDark ? '#00FF88' : '#059669';
    ctx.font = 'bold 11px ui-monospace, SFMono-Regular, monospace';
    ctx.fillText('EXECUTIVE FLOW SPECIFICATIONS & AI CONTEXT MATRIX', execX + 18, execY + 24);

    // Pill badge for number of defined pillars
    const countBadge = `${populatedPillars.length} OF 8 PILLARS DEFINED`;
    ctx.font = 'bold 10px ui-monospace, SFMono-Regular, monospace';
    const badgeW = ctx.measureText(countBadge).width + 16;
    drawRoundedRect(ctx, execX + execW - badgeW - 18, execY + 12, badgeW, 18, 9);
    ctx.fillStyle = isDark ? '#2D302B' : '#F3F4F6';
    ctx.fill();
    ctx.fillStyle = isDark ? '#A6ABA1' : '#4B5563';
    ctx.fillText(countBadge, execX + execW - badgeW - 10, execY + 25);

    // Grid of Pillars: 4 columns
    const numCols = 4;
    const pillarColWidth = Math.floor((execW - 36 - (numCols - 1) * 20) / numCols);
    const rowHeight = 75;

    populatedPillars.forEach((pillar, pIdx) => {
      const pCol = pIdx % numCols;
      const pRow = Math.floor(pIdx / numCols);
      const px = execX + 18 + pCol * (pillarColWidth + 20);
      const py = execY + 46 + pRow * rowHeight;

      // Pillar Number & Title
      ctx.fillStyle = isDark ? '#FFFFFF' : '#111827';
      ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const titleStr = `${pillar.num}. ${pillar.title}`;
      ctx.fillText(truncateText(ctx, titleStr, pillarColWidth), px, py);

      // Pillar Content snippet
      ctx.fillStyle = isDark ? '#A6ABA1' : '#4B5563';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      drawTextWrapped(ctx, pillar.content || '', px, py + 14, pillarColWidth, 13, 2);
    });

    ctx.restore();
  }

  // 4. Preload all screen images
  const loadedImages = await Promise.all(screens.map((s) => loadImage(s.previewUrl)));

  // 5. Render each card
  for (let i = 0; i < screens.length; i++) {
    const screen = screens[i];
    const img = loadedImages[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = marginX + col * (cardWidth + gap);
    const y = effectiveMarginTop + row * (cardHeight + gap);

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
    if (screen.nestLevel === 2) {
      ctx.fillStyle = isDark ? '#38BDF8' : '#0284C7'; // Cyan for Sub-of-Sub
    } else if (screen.nestLevel === 1) {
      ctx.fillStyle = isDark ? '#00FF88' : '#059669'; // Neon/Emerald for Sub-Screen
    } else {
      ctx.fillStyle = isDark ? '#2D302B' : '#111827'; // Dark Chassis for Primary
    }
    ctx.fill();

    if (screen.nestLevel === 2) {
      ctx.fillStyle = isDark ? '#082F49' : '#FFFFFF';
    } else if (screen.nestLevel === 1) {
      ctx.fillStyle = isDark ? '#064E3B' : '#FFFFFF';
    } else {
      ctx.fillStyle = '#FFFFFF';
    }
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
 * Word wrap text into canvas with max lines
 */
function drawTextWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 3
): number {
  const words = text.split(/\s+/);
  let line = '';
  let linesCount = 0;
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line ? `${line} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      linesCount++;
      if (linesCount === maxLines) {
        ctx.fillText(truncateText(ctx, line.trim(), maxWidth), x, currentY);
        return linesCount;
      }
      ctx.fillText(line.trim(), x, currentY);
      line = words[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line.trim().length > 0 && linesCount < maxLines) {
    ctx.fillText(truncateText(ctx, line.trim(), maxWidth), x, currentY);
    linesCount++;
  }
  return linesCount;
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
    partLabel: 'Complete Flow',
    context: options?.context,
    includeContext: options?.includeContext ?? true
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
      partLabel,
      context: options?.context,
      includeContext: options?.includeContext ?? true
    });

    const filename = totalSets > 1
      ? `${safeName}_storyboard_part_${setIdx + 1}_of_${totalSets}.png`
      : `${safeName}_storyboard.png`;

    await downloadCanvasAsPng(canvas, filename);

    // Stagger multi-part downloads to prevent browser anti-spam blocking
    if (setIdx < totalSets - 1) {
      await new Promise((r) => setTimeout(r, 1200));
    }
  }
}
