/**
 * Theme management with system preference detection
 */

export type Theme = 'light' | 'dark' | 'auto';

let currentTheme: Theme = 'auto';
let mediaQuery: MediaQueryList;
let systemThemeDark = false;
let parentThemeDark: boolean | null = null;
let lastObservedDarkState: boolean | null = null;
let domMutationObserver: MutationObserver | null = null;
let parentThemeObserver: MutationObserver | null = null;
const copiedThemeTargets = new Set<string>();

const HA_THEME_VARIABLES: Record<string, string> = {
  '--primary-background-color': '--bg-primary',
  '--secondary-background-color': '--bg-secondary',
  '--card-background-color': '--bg-tertiary',
  '--primary-text-color': '--text-primary',
  '--secondary-text-color': '--text-secondary',
  '--disabled-text-color': '--text-tertiary',
  '--divider-color': '--border-color',
  '--primary-color': '--accent-color',
  '--dark-primary-color': '--accent-hover',
  '--error-color': '--error-color',
  '--warning-color': '--warning-color',
};

/**
 * Initialize theme system
 */
export function initTheme(): void {
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  systemThemeDark = mediaQuery.matches;

  mediaQuery.addEventListener('change', applyTheme);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkAndApplyTheme();
    }
  });

  // Home Assistant sends this when its active theme changes in an ingress iframe.
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'theme-update') {
      checkAndApplyTheme();
    }
  });

  setInterval(() => {
    if (currentTheme === 'auto') {
      checkAndApplyTheme();
    }
  }, 5000);

  setupDOMMutationObserver();
  setupParentThemeObserver();
  applyTheme();
}

/**
 * Set up DOM mutation observer to detect theme changes
 * iOS WebView may apply theme without firing proper events
 */
function setupDOMMutationObserver(): void {
  const root = document.documentElement;
  
  domMutationObserver = new MutationObserver(() => {
    // Check if the .dark class changed
    const isDarkNow = root.classList.contains('dark');
    
    // Only trigger update if we actually detected a change
    if (isDarkNow !== lastObservedDarkState) {
      lastObservedDarkState = isDarkNow;
      // Notify editor of the actual DOM state
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { dark: isDarkNow } }));
    }
  });
  
  // Observe class attribute changes
  domMutationObserver.observe(root, {
    attributes: true,
    attributeFilter: ['class'],
  });
}

/**
 * Copy the small set of HA theme variables needed by this standalone app.
 * Ingress currently uses a same-origin iframe, but direct access may not.
 */
function syncParentTheme(): void {
  const root = document.documentElement;

  if (currentTheme !== 'auto' || window.parent === window) {
    parentThemeDark = null;
    for (const target of copiedThemeTargets) {
      root.style.removeProperty(target);
    }
    copiedThemeTargets.clear();
    return;
  }

  try {
    for (const target of copiedThemeTargets) {
      root.style.removeProperty(target);
    }
    copiedThemeTargets.clear();

    const parentRoot = window.parent.document.documentElement;
    const styles = window.parent.getComputedStyle(parentRoot);
    let copiedAny = false;

    for (const [source, target] of Object.entries(HA_THEME_VARIABLES)) {
      const value = styles.getPropertyValue(source).trim();
      if (value) {
        root.style.setProperty(target, value);
        copiedThemeTargets.add(target);
        copiedAny = true;
      }
    }

    const background = styles.getPropertyValue('--primary-background-color').trim();
    const rgb = parseColor(background);
    if (rgb) {
      const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
      parentThemeDark = luminance < 0.5;
    } else {
      parentThemeDark = null;
    }

    if (!copiedAny) {
      parentThemeDark = null;
    }
  } catch (error) {
    parentThemeDark = null;
  }
}

function parseColor(value: string): [number, number, number] | null {
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits = hex[1].length === 3
      ? hex[1].split('').map((digit) => digit + digit).join('')
      : hex[1];
    return [parseInt(digits.slice(0, 2), 16), parseInt(digits.slice(2, 4), 16), parseInt(digits.slice(4, 6), 16)];
  }

  const rgb = value.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

/**
 * Watch Home Assistant's root style changes, which occur when its theme changes.
 */
function setupParentThemeObserver(): void {
  if (window.parent === window) return;

  try {
    parentThemeObserver = new MutationObserver(() => {
      if (currentTheme === 'auto') applyTheme();
    });
    parentThemeObserver.observe(window.parent.document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
  } catch (error) {
    // Parent access is optional outside the Home Assistant ingress iframe.
  }
}

/**
 * Check if system theme changed and apply if needed
 * Used for iOS compatibility
 */
function checkAndApplyTheme(): void {
  const newSystemThemeDark = mediaQuery.matches;
  const previousParentThemeDark = parentThemeDark;
  syncParentTheme();

  if (newSystemThemeDark !== systemThemeDark || previousParentThemeDark !== parentThemeDark) {
    systemThemeDark = newSystemThemeDark;
    applyTheme();
  }
}

/**
 * Apply the current theme
 */
function applyTheme(e?: MediaQueryListEvent | Event): void {
  syncParentTheme();
  if (e && 'matches' in e) {
    systemThemeDark = (e as MediaQueryListEvent).matches;
  } else if (mediaQuery) {
    systemThemeDark = mediaQuery.matches;
  }

  const root = document.documentElement;

  let isDark = false;

  if (currentTheme === 'auto') {
    isDark = parentThemeDark ?? systemThemeDark;
  } else {
    isDark = currentTheme === 'dark';
  }

  const currentlyDark = root.classList.contains('dark');
  if (isDark !== currentlyDark) {
    root.classList.toggle('dark', isDark);
    lastObservedDarkState = isDark;
  }

  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { dark: isDark } }));
}

/**
 * Set the selected theme mode and apply it immediately.
 */
export function setThemeMode(theme: Theme): void {
  currentTheme = theme;
  applyTheme();
}

/**
 * Get current theme (resolved to light/dark)
 */
export function getCurrentTheme(): 'light' | 'dark' {
  if (currentTheme === 'auto') {
    return (parentThemeDark ?? systemThemeDark) ? 'dark' : 'light';
  }
  return currentTheme;
}

/**
 * Check if current theme is dark
 */
export function isDark(): boolean {
  return getCurrentTheme() === 'dark';
}
