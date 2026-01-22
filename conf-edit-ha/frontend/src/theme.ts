/**
 * Theme management with system preference detection
 */

type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'ha-editor-theme';

let currentTheme: Theme = 'auto';
let mediaQuery: MediaQueryList;
let systemThemeDark = false;

/**
 * Initialize theme system
 */
export function initTheme(): void {
  // Load saved preference
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved && ['light', 'dark', 'auto'].includes(saved)) {
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
  
  // Periodic check for iOS compatibility (every 5 seconds while in auto mode)
  // This helps detect theme changes that media query listener might miss
  setInterval(() => {
    if (currentTheme === 'auto') {
      checkAndApplyTheme();
    }
  }, 5000);

  // Set up toggle button
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }

  // Apply initial theme
  applyTheme();
}

/**
 * Check if system theme changed and apply if needed
 * Used for iOS compatibility
 */
function checkAndApplyTheme(): void {
  const newSystemThemeDark = mediaQuery.matches;
  
  // Only apply if system theme actually changed
  if (newSystemThemeDark !== systemThemeDark) {
    console.log('[Theme] System theme changed detected:', newSystemThemeDark ? 'dark' : 'light');
    systemThemeDark = newSystemThemeDark;
    applyTheme();
  }
}

/**
 * Apply the current theme
 */
function applyTheme(e?: MediaQueryListEvent | Event): void {
  // Update system theme state if event provides it
  if (e && 'matches' in e) {
    systemThemeDark = (e as MediaQueryListEvent).matches;
  } else if (mediaQuery) {
    systemThemeDark = mediaQuery.matches;
  }

  const root = document.documentElement;
  const lightIcon = document.getElementById('theme-icon-light');
  const darkIcon = document.getElementById('theme-icon-dark');

  let isDark = false;

  if (currentTheme === 'auto') {
    isDark = systemThemeDark;
  } else {
    isDark = currentTheme === 'dark';
  }

   // Only modify DOM if theme actually changed
   const currentlyDark = root.classList.contains('dark');
   if (isDark !== currentlyDark) {
     console.log('[Theme] Applying theme:', isDark ? 'dark' : 'light', '(mode:', currentTheme, ')');
     if (isDark) {
       root.classList.add('dark');
     } else {
       root.classList.remove('dark');
     }
   }

  // Update icons
  if (lightIcon && darkIcon) {
    if (isDark) {
      lightIcon.style.display = 'none';
      darkIcon.style.display = 'block';
    } else {
      lightIcon.style.display = 'block';
      darkIcon.style.display = 'none';
    }
  }

  // Notify editor to update theme
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { dark: isDark } }));
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme(): void {
  if (currentTheme === 'auto') {
    // If auto, switch to opposite of current system theme
    currentTheme = systemThemeDark ? 'light' : 'dark';
  } else if (currentTheme === 'light') {
    currentTheme = 'dark';
  } else {
    currentTheme = 'light';
  }

  localStorage.setItem(STORAGE_KEY, currentTheme);
  applyTheme();
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
