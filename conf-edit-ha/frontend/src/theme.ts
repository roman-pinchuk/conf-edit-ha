/**
 * Theme management with system preference detection
 */

type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'ha-editor-theme';

let currentTheme: Theme = 'auto';
let mediaQuery: MediaQueryList;

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
  mediaQuery.addEventListener('change', applyTheme);

  // Set up toggle button
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }

  // Apply initial theme
  applyTheme();
}

/**
 * Apply the current theme
 */
function applyTheme(): void {
  const root = document.documentElement;
  const lightIcon = document.getElementById('theme-icon-light');
  const darkIcon = document.getElementById('theme-icon-dark');

  let isDark = false;

  if (currentTheme === 'auto') {
    isDark = mediaQuery.matches;
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
    currentTheme = mediaQuery.matches ? 'light' : 'dark';
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
    return mediaQuery.matches ? 'dark' : 'light';
  }
  return currentTheme;
}

/**
 * Check if current theme is dark
 */
export function isDark(): boolean {
  return getCurrentTheme() === 'dark';
}
