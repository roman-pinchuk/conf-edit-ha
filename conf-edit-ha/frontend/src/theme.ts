/**
 * Theme management with system preference detection
 */

type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'ha-editor-theme';

let currentTheme: Theme = 'auto';
let mediaQuery: MediaQueryList;
let systemThemeDark = false;
let lastObservedDarkState: boolean | null = null;
let domMutationObserver: MutationObserver | null = null;

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

  // Set up toggle button
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }

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
        // Update mutation observer state after DOM change
        lastObservedDarkState = isDark;
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
