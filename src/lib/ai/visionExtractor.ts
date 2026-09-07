import { ScreenItem, VisualObservation } from '@/lib/types';
import { isRawDeviceFilename } from './service';

export interface ScreenVisualEvidence {
  screen_id: string;
  screen_number: number;
  screen_name: string;
  state: string;
  components: Array<{
    type: string;
    label: string;
    state?: string;
    value?: string;
  }>;
  visual_observations: VisualObservation[];
}

/**
 * Extracts factual visual observations from screen items.
 * Enforces the rule: "Screenshots are evidence, not instructions or assumptions."
 * Confirmed: directly visible on screen.
 * Unknown: behavior, state transitions, or unverified outcomes that require investigation.
 */
export function extractVisualEvidence(
  screens: ScreenItem[],
  featureEntryPoint?: string,
  featureExpectedOutcome?: string
): ScreenVisualEvidence[] {
  return screens.map((s) => {
    const isFirst = s.screen_number === 1;
    const isLast = s.screen_number === screens.length;
    
    let semanticName = s.name;
    if (isRawDeviceFilename(s.name)) {
      semanticName = isFirst ? (featureEntryPoint || 'Entry Screen')
        : isLast ? (featureExpectedOutcome || 'Transaction Receipt')
        : `Step ${s.screen_number} View`;
    }

    const elements = s.ai_analysis?.elements || [];
    const visibleTexts = s.ai_analysis?.visible_text || [];
    const observations: VisualObservation[] = [];

    // 1. Component presence (Confirmed Factual Observations)
    elements.forEach(el => {
      const stateDesc = el.state && el.state !== 'default' ? ` in ${el.state} state` : '';
      const valDesc = el.value ? ` (value: "${el.value}")` : '';
      observations.push({
        fact: `Visual ${el.type} "${el.label}" is displayed${stateDesc}${valDesc}.`,
        source: 'screenshot',
        confidence: 'confirmed'
      });
    });

    // 2. Visible text & disclosures (Confirmed)
    if (visibleTexts.length > 0) {
      visibleTexts.slice(0, 5).forEach(txt => {
        if (txt.trim().length > 3) {
          observations.push({
            fact: `Text content displayed: "${txt.trim()}".`,
            source: 'screenshot',
            confidence: 'confirmed'
          });
        }
      });
    }

    // 3. Screen state observation (Confirmed)
    observations.push({
      fact: `Screen is rendered in "${s.state || 'normal'}" lifecycle state.`,
      source: 'screenshot',
      confidence: 'confirmed'
    });

    // 4. Unknown behavior & investigative boundaries (Unknown / To Probe)
    const interactiveButtons = elements.filter(e => e.type === 'button' || e.is_interactive);
    if (interactiveButtons.length > 0) {
      interactiveButtons.forEach(btn => {
        observations.push({
          fact: `Exact system response, network timeout, and debounce behavior when tapping "${btn.label}" is unverified.`,
          source: 'inference',
          confidence: 'unknown'
        });
      });
    }

    // If there's an input field, boundary limits are unknown
    const textInputs = elements.filter(e => e.type === 'text_field');
    if (textInputs.length > 0) {
      textInputs.forEach(inp => {
        observations.push({
          fact: `System handling of extreme boundaries, symbols, empty values, or emojis in "${inp.label}" is unverified.`,
          source: 'inference',
          confidence: 'unknown'
        });
      });
    }

    return {
      screen_id: s.id || `SCREEN-${String(s.screen_number).padStart(2, '0')}`,
      screen_number: s.screen_number,
      screen_name: semanticName,
      state: s.state || 'normal',
      components: elements.map(e => ({
        type: e.type,
        label: e.label,
        state: e.state,
        value: e.value
      })),
      visual_observations: observations
    };
  });
}
