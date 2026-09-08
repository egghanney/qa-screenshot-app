/**
 * QA Studio Client-Side Settings & Credentials Manager
 * Unifies API key storage across all components and maintains backward compatibility.
 */

const STORAGE_KEY_GEMINI = 'QA_GEMINI_API_KEY';
const STORAGE_KEY_GEMINI_LEGACY = 'AETHER_GEMINI_API_KEY';
const STORAGE_KEY_SETTINGS = 'qa_settings';
const STORAGE_KEY_SETTINGS_LEGACY = 'aether_qa_settings';

export function getStoredGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';
  
  try {
    // 1. Check direct key
    const directKey = localStorage.getItem(STORAGE_KEY_GEMINI) || localStorage.getItem(STORAGE_KEY_GEMINI_LEGACY);
    if (directKey && directKey.trim()) {
      return directKey.trim();
    }

    // 2. Check settings object fallback
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS) || localStorage.getItem(STORAGE_KEY_SETTINGS_LEGACY);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed.geminiApiKey && typeof parsed.geminiApiKey === 'string' && parsed.geminiApiKey.trim()) {
        return parsed.geminiApiKey.trim();
      }
    }
  } catch (e) {
    console.warn('Failed to read Gemini API key from localStorage:', e);
  }

  return '';
}

export function setStoredGeminiApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return;

  const cleanKey = apiKey.trim();

  try {
    // Save to primary key
    localStorage.setItem(STORAGE_KEY_GEMINI, cleanKey);

    // Save/update in settings object for full backwards-compatibility
    let settingsObj: Record<string, any> = {};
    const existing = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (existing) {
      try {
        settingsObj = JSON.parse(existing);
      } catch {
        settingsObj = {};
      }
    }
    settingsObj.geminiApiKey = cleanKey;
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settingsObj));
  } catch (e) {
    console.warn('Failed to persist Gemini API key to localStorage:', e);
  }
}
