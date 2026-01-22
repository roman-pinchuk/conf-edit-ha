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
       if (isDark) {
         root.classList.add('dark');
       } else {
         root.classList.remove('dark');
       }
     }

   // Update icons - ensure they're always synchronized
   if (lightIcon && darkIcon) {
     const newLightDisplay = isDark ? 'none' : 'block';
     const newDarkDisplay = isDark ? 'block' : 'none';
     
     if (lightIcon.style.display !== newLightDisplay) {
       lightIcon.style.display = newLightDisplay;
     }
     if (darkIcon.style.display !== newDarkDisplay) {
       darkIcon.style.display = newDarkDisplay;
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

    // Save with verification - iOS Safari has issues with localStorage reliability
    try {
      localStorage.setItem(STORAGE_KEY, currentTheme);
      // Verify it was actually saved
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== currentTheme) {
        // Retry with small delay if verification failed
        setTimeout(() => {
          localStorage.setItem(STORAGE_KEY, currentTheme);
        }, 10);
      }
    } catch (e) {
      // Silently fail - theme will be in 'auto' mode on next load
    }
   
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
