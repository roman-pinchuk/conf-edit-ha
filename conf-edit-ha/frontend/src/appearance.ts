/**
 * Browser-persisted editor appearance settings and controls.
 */

import { setThemeMode, type Theme } from './theme';
import type { EditorSettings } from './api';

export interface AppearanceSettings extends EditorSettings {
  theme: Theme;
  fontSize: number;
  lineWrapping: boolean;
  rainbowBrackets: boolean;
}

const STORAGE_KEY = 'ha-editor-appearance';
const LEGACY_THEME_KEY = 'ha-editor-theme';

const DEFAULT_SETTINGS: AppearanceSettings = {
  theme: 'auto',
  indent_style: 'spaces',
  indent_opacity: 100,
  fontSize: 14,
  lineWrapping: true,
  rainbowBrackets: true,
};

let currentSettings = { ...DEFAULT_SETTINGS };
let dialog: HTMLDialogElement | null = null;

function isTheme(value: unknown): value is Theme {
  return value === 'auto' || value === 'light' || value === 'dark';
}

function readSavedSettings(serverSettings: EditorSettings): AppearanceSettings {
  const settings = { ...DEFAULT_SETTINGS, ...serverSettings };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AppearanceSettings>;
      if (isTheme(parsed.theme)) settings.theme = parsed.theme;
      if (parsed.indent_style === 'spaces' || parsed.indent_style === 'lines') {
        settings.indent_style = parsed.indent_style;
      }
      if (typeof parsed.indent_opacity === 'number' && Number.isFinite(parsed.indent_opacity)) {
        settings.indent_opacity = Math.max(0, Math.min(100, parsed.indent_opacity));
      }
      if (typeof parsed.fontSize === 'number' && Number.isFinite(parsed.fontSize)) {
        settings.fontSize = Math.max(12, Math.min(20, parsed.fontSize));
      }
      if (typeof parsed.lineWrapping === 'boolean') settings.lineWrapping = parsed.lineWrapping;
      if (typeof parsed.rainbowBrackets === 'boolean') settings.rainbowBrackets = parsed.rainbowBrackets;
      return settings;
    }

    const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
    if (isTheme(legacyTheme)) settings.theme = legacyTheme;
  } catch (error) {
    console.warn('Could not restore appearance settings:', error);
  }

  return settings;
}

function saveSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
  } catch (error) {
    console.warn('Could not save appearance settings:', error);
  }
}

function updateControls(): void {
  const theme = document.getElementById('appearance-theme') as HTMLSelectElement | null;
  const indentStyle = document.getElementById('appearance-indent-style') as HTMLSelectElement | null;
  const opacity = document.getElementById('appearance-indent-opacity') as HTMLInputElement | null;
  const opacityValue = document.getElementById('appearance-indent-opacity-value');
  const fontSize = document.getElementById('appearance-font-size') as HTMLInputElement | null;
  const fontSizeValue = document.getElementById('appearance-font-size-value');
  const wrapping = document.getElementById('appearance-line-wrapping') as HTMLInputElement | null;
  const brackets = document.getElementById('appearance-rainbow-brackets') as HTMLInputElement | null;

  if (theme) theme.value = currentSettings.theme;
  if (indentStyle) indentStyle.value = currentSettings.indent_style;
  if (opacity) opacity.value = String(currentSettings.indent_opacity);
  if (opacityValue) opacityValue.textContent = `${currentSettings.indent_opacity}%`;
  if (fontSize) fontSize.value = String(currentSettings.fontSize);
  if (fontSizeValue) fontSizeValue.textContent = `${currentSettings.fontSize}px`;
  if (wrapping) wrapping.checked = currentSettings.lineWrapping;
  if (brackets) brackets.checked = currentSettings.rainbowBrackets;
}

function emitSettingsChanged(): void {
  window.dispatchEvent(new CustomEvent('appearance-changed', { detail: { ...currentSettings } }));
}

function changeSetting<K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]): void {
  currentSettings = { ...currentSettings, [key]: value };
  if (key === 'theme') setThemeMode(value as Theme);
  saveSettings();
  updateControls();
  emitSettingsChanged();
}

function resetSettings(): void {
  currentSettings = { ...DEFAULT_SETTINGS };
  setThemeMode(currentSettings.theme);
  saveSettings();
  updateControls();
  emitSettingsChanged();
}

function closeOnBackdrop(event: MouseEvent): void {
  if (event.target === dialog) dialog?.close();
}

/**
 * Get the active appearance settings.
 */
export function getAppearanceSettings(): AppearanceSettings {
  return { ...currentSettings };
}

/**
 * Initialize settings and the Appearance dialog.
 */
export function initAppearance(serverSettings: EditorSettings): void {
  currentSettings = readSavedSettings(serverSettings);
  setThemeMode(currentSettings.theme);
  dialog = document.getElementById('appearance-dialog') as HTMLDialogElement | null;
  updateControls();

  const open = () => {
    updateControls();
    dialog?.showModal();
  };
  document.getElementById('appearance-btn')?.addEventListener('click', open);
  document.getElementById('appearance-btn-mobile')?.addEventListener('click', open);
  dialog?.addEventListener('click', closeOnBackdrop);
  document.getElementById('appearance-close')?.addEventListener('click', () => dialog?.close());
  document.getElementById('appearance-reset')?.addEventListener('click', resetSettings);

  document.getElementById('appearance-theme')?.addEventListener('change', (event) => {
    changeSetting('theme', (event.target as HTMLSelectElement).value as Theme);
  });
  document.getElementById('appearance-indent-style')?.addEventListener('change', (event) => {
    changeSetting('indent_style', (event.target as HTMLSelectElement).value as EditorSettings['indent_style']);
  });
  document.getElementById('appearance-indent-opacity')?.addEventListener('input', (event) => {
    changeSetting('indent_opacity', Number((event.target as HTMLInputElement).value));
  });
  document.getElementById('appearance-font-size')?.addEventListener('input', (event) => {
    changeSetting('fontSize', Number((event.target as HTMLInputElement).value));
  });
  document.getElementById('appearance-line-wrapping')?.addEventListener('change', (event) => {
    changeSetting('lineWrapping', (event.target as HTMLInputElement).checked);
  });
  document.getElementById('appearance-rainbow-brackets')?.addEventListener('change', (event) => {
    changeSetting('rainbowBrackets', (event.target as HTMLInputElement).checked);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && dialog?.open) dialog.close();
  });
  emitSettingsChanged();
}
