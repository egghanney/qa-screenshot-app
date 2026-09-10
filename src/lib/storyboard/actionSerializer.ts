import { ScreenAction, ScreenActionRole } from '@/lib/types';

/**
 * Standard action types supported in the studio
 */
const VALID_ACTION_TYPES = ['tap', 'type', 'swipe', 'scroll', 'verify', 'wait', 'other'] as const;

/**
 * Standard role keywords to prevent misidentifying as custom sections
 */
const ROLE_KEYWORDS = ['opt', 'optional', 'exit', 'link', 'step', 'substep', 'seq', 'sequential'];

/**
 * Parses a serialized or unstructured user_action string into structured ScreenAction objects.
 *
 * Supports:
 * - Bullet-separated formatted actions: "1. [Carousel] [tap] Item A • • [Optional] [Promo] [tap] Claim • ⤶ [Exit] [tap] Close"
 * - Newline-separated actions: "1. [tap] Item A\n2. [tap] Item B"
 * - Role markers: [Optional], [Opt], [Exit], [Link], or numbers "1.", "2."
 * - Section markers: [Carousel], [Sticky Cart], [Search Bar], etc.
 * - Action types: [tap], [type], [swipe], [scroll], [verify], [wait], [other]
 * - Legacy plain text: "User taps Continue button" -> 1 sequential action
 * - JSON encoded strings
 */
export function parseUserActionStringToActions(userActionStr?: string | null): ScreenAction[] {
  if (!userActionStr || !userActionStr.trim()) {
    return [];
  }

  const trimmed = userActionStr.trim();

  // 1. JSON Array check
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        return parsed.map((item, idx) => ({
          id: item.id || `act_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`,
          order: typeof item.order === 'number' ? item.order : idx + 1,
          role: (item.role as ScreenActionRole) || 'sequential',
          type: item.type || 'tap',
          section: item.section || undefined,
          description: item.description || String(item)
        }));
      }
    } catch {
      // Fall through to regex string parser
    }
  }

  // 2. Split on newline or bullet separator ' • '
  const rawParts = trimmed.includes('\n')
    ? trimmed.split('\n')
    : trimmed.split(/\s*•\s*/);

  const cleanedParts = rawParts.map(p => p.trim()).filter(Boolean);
  if (cleanedParts.length === 0) return [];

  const actions: ScreenAction[] = [];
  let currentOrder = 1;

  for (const part of cleanedParts) {
    let text = part.trim();
    // Remove leading bullet or dot if left behind
    text = text.replace(/^[•\-\*]\s*/, '');

    let role: ScreenActionRole = 'sequential';

    // Role detection
    if (/^(?:•\s*)?\[(?:opt|optional)\]/i.test(text) || /^•\s*\[optional\]/i.test(text)) {
      role = 'optional';
      text = text.replace(/^(?:•\s*)?\[(?:opt|optional)\]\s*/i, '');
    } else if (/^(?:⤶\s*)?\[exit\]/i.test(text) || /^⤶\s*\[exit\]/i.test(text)) {
      role = 'exit';
      text = text.replace(/^(?:⤶\s*)?\[exit\]\s*/i, '');
    } else if (/^(?:↗\s*)?\[link\]/i.test(text) || /^↗\s*\[link\]/i.test(text)) {
      role = 'link';
      text = text.replace(/^(?:↗\s*)?\[link\]\s*/i, '');
    } else if (/^\d+\.\s*/.test(text)) {
      role = 'sequential';
      text = text.replace(/^\d+\.\s*/, '');
    }

    let section: string | undefined = undefined;
    let type: ScreenAction['type'] = 'tap';

    // Check for bracket tags [Section] and [Type]
    const bracketMatches = [...text.matchAll(/\[([^\]]+)\]/g)];

    for (const match of bracketMatches) {
      const tagContent = match[1].trim();
      const lower = tagContent.toLowerCase();

      if ((VALID_ACTION_TYPES as readonly string[]).includes(lower)) {
        type = lower as ScreenAction['type'];
        text = text.replace(match[0], '').trim();
      } else if (!section && !ROLE_KEYWORDS.includes(lower)) {
        section = tagContent;
        text = text.replace(match[0], '').trim();
      }
    }

    // Clean remaining punctuation like ":", "-", whitespace
    text = text.replace(/^[:\-\s]+/, '').trim();
    if (!text) continue;

    actions.push({
      id: `act_${currentOrder}_${Math.random().toString(36).substring(2, 6)}`,
      order: currentOrder++,
      role,
      section,
      type,
      description: text
    });
  }

  return actions;
}

/**
 * Serializes an array of ScreenAction objects into a standardized string format.
 * Format:
 * "1. [Carousel] [tap] Item A • • [Optional] [Promo] [tap] Claim Promo • ⤶ [Exit] [tap] Close Modal"
 */
export function serializeActionsToUserActionString(actions: ScreenAction[]): string {
  if (!actions || actions.length === 0) return '';

  return actions.map((a, idx) => {
    const sectionTag = a.section?.trim() ? `[${a.section.trim()}] ` : '';
    const typeTag = `[${a.type || 'tap'}] `;
    
    let prefix = `${idx + 1}.`;
    if (a.role === 'optional') {
      prefix = '• [Optional]';
    } else if (a.role === 'exit') {
      prefix = '⤶ [Exit]';
    } else if (a.role === 'link') {
      prefix = '↗ [Link]';
    }

    return `${prefix} ${sectionTag}${typeTag}${a.description.trim()}`;
  }).join(' • ');
}
