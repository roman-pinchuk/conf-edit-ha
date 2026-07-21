/**
 * Theme management with system preference detection
 */

export type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'ha-editor-theme';

let currentTheme: Theme = 'auto';
let mediaQuery: MediaQueryList;
let systemThemeDark = false;
let parentThemeDark: boolean | null = null;
let lastObservedDarkState: boolean | null = null;
let domMutationObserver: MutationObserver | null = null;
let parentThemeObserver: MutationObserver | null = null;

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
   // Load saved preference with fallback
   let saved: Theme | null = null;
   try {
     const storedValue = localStorage.getItem(STORAGE_KEY);
     if (storedValue && ['light', 'dark', 'auto'].includes(storedValue)) {
       saved = storedValue as Theme;
     }
    } catch (e) {
      // Silently fail - fall back to default theme
    }

   if (saved) {
     currentTheme = saved;
   }

   // Set up media query for system theme
   mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
   systemThemeDark = mediaQuery.matches;
  
  // Add listener for media query changes (standard browsers)
  mediaQuery.addEventListener('change', applyTheme);
  
  // iOS Safari/WebView may not reliably trigger media query change events
  // Check for visibility changes to detect theme switches when app returns to foreground
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // App became visible - check if system theme changed
      checkAndApplyTheme();
    }
  });
  
  // Listen for Home Assistant Ingress theme-update messages (iOS WebView)
  // Home Assistant sends this when theme changes via Ingress protocol
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'theme-update') {
      checkAndApplyTheme();
    }
  });
  
  // Periodic check for iOS compatibility (every 5 seconds while in auto mode)
  // This helps detect theme changes that media query listener might miss
  setInterval(() => {
    if (currentTheme === 'auto') {
      checkAndApplyTheme();
    }
  }, 5000);

  // MutationObserver to detect .dark class changes on html element
  // This is a fallback for iOS WebView where events might not fire
  // Watch the html element for any attribute changes
   setupDOMMutationObserver();
   setupParentThemeObserver();

   // Apply initial theme
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
    for (const target of Object.values(HA_THEME_VARIABLES)) {
      root.style.removeProperty(target);
    }
    return;
  }

  try {
    const parentRoot = window.parent.document.documentElement;
    const styles = window.parent.getComputedStyle(parentRoot);
    let copiedAny = false;

    for (const [source, target] of Object.entries(HA_THEME_VARIABLES)) {
      const value = styles.getPropertyValue(source).trim();
      if (value) {
        root.style.setProperty(target, value);
        copiedAny = true;
      }
    }

    const background = styles.getPropertyValue('--primary-background-color').trim();
    const rgb = background.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);
    if (rgb) {
      const luminance = (0.299 * Number(rgb[1]) + 0.587 * Number(rgb[2]) + 0.114 * Number(rgb[3])) / 255;
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

/**
 * Watch Home Assistant's root style changes, which occur when its theme changes.
 */
function setupParentThemeObserver(): void {
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

   // Only apply if system theme actually changed
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
   // Update system theme state if event provides it
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

      // Only modify DOM if theme actually changed
      const currentlyDark = root.classList.contains('dark');
      if (isDark !== currentlyDark) {
        if (isDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        // Update mutation observer state after DOM change
        lastObservedDarkState = isDark;
      }

   // Notify editor to update theme
   window.dispatchEvent(new CustomEvent('theme-changed', { detail: { dark: isDark } }));

 }

/**
 * Toggle between theme modes: auto -> light -> dark -> auto
 */
/**
 * Set the selected theme mode and apply it immediately.
 */
export function setThemeMode(theme: Theme): void {
  currentTheme = theme;
  applyTheme();
}

/**
 * Get the selected theme mode, before resolving system preference.
 */
export function getThemeMode(): Theme {
  return currentTheme;
}

/**
 * Get current theme (resolved to light/dark)
 */
export function getCurrentTheme(): 'light' | 'dark' {
  if (currentTheme === 'auto') {
    return systemThemeDark ? 'dark' : 'light';
  }
  return currentTheme;
}

/**
 * Check if current theme is dark
 */
export function isDark(): boolean {
  return getCurrentTheme() === 'dark';
}
