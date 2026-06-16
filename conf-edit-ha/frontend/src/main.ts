/**
 * Main application entry point
 */

import { initTheme } from './theme';
import { createEditor, setContent, getContent, registerSaveShortcut, editorUndo, editorRedo, editorIndent, editorDedent, canEditorUndo, canEditorRedo, restoreLastValidContent } from './editor';
import { fetchEntities, fetchFiles, readFile, saveFile, validateConfig, type FileInfo } from './api';
import { setEntities } from './autocomplete';

// Application state
let currentFile: string | null = null;
let isModified = false;
let isLoadingFile = false;
let isDocumentValid = true;
let files: FileInfo[] = [];
let expandedDirs: Set<string> = new Set();
let validationDetails: string | null = null;
let validationDetailsTitle = 'Home Assistant validation';
let isValidationDetailsOpen = false;

// Event listener references for cleanup
let fileListClickHandler: ((e: Event) => void) | null = null;
let editorChangeHandler: ((e: Event) => void) | null = null;
let saveButtonHandler: (() => void) | null = null;
let mobileMenuHandler: (() => void) | null = null;
let sidebarOverlayHandler: (() => void) | null = null;
let undoButtonHandler: (() => void) | null = null;
let redoButtonHandler: (() => void) | null = null;
let indentButtonHandler: (() => void) | null = null;
let dedentButtonHandler: (() => void) | null = null;
let statusBarHandler: (() => void) | null = null;
let validationCloseHandler: (() => void) | null = null;
let sponsorHandler: (() => void) | null = null;

// LocalStorage keys
const STORAGE_KEY_CURRENT_FILE = 'conf-edit-ha:current-file';
const STORAGE_KEY_EXPANDED_DIRS = 'conf-edit-ha:expanded-dirs';

// DOM elements
const fileListEl = document.getElementById('file-list')!;
const currentFilenameEl = document.getElementById('current-filename')!;
const saveBtnEl = document.getElementById('save-btn') as HTMLElement;
const saveBtnMobileEl = document.getElementById('save-btn-mobile') as HTMLElement;
const statusMessageEl = document.getElementById('status-message')!;
const statusInfoEl = document.getElementById('status-info')!;
const statusBarEl = document.getElementById('status-bar')!;
const validationDetailsEl = document.getElementById('validation-details') as HTMLElement;
const validationDetailsTitleEl = document.getElementById('validation-details-title')!;
const validationDetailsContentEl = document.getElementById('validation-details-content')!;
const validationDetailsRestoreEl = document.getElementById('validation-details-restore') as HTMLButtonElement;
const validationDetailsCloseEl = document.getElementById('validation-details-close') as HTMLElement;
const editorEl = document.getElementById('editor')!;
const mobileMenuToggleEl = document.getElementById('mobile-menu-toggle') as HTMLElement;
const sidebarEl = document.getElementById('sidebar')!;
const sidebarOverlayEl = document.getElementById('sidebar-overlay')!;
const mobileFilenameEl = document.getElementById('mobile-filename')!;

// Mobile toolbar elements
const undoBtnEl = document.getElementById('undo-btn') as HTMLElement;
const redoBtnEl = document.getElementById('redo-btn') as HTMLElement;
const indentBtnEl = document.getElementById('indent-btn') as HTMLElement;
const dedentBtnEl = document.getElementById('dedent-btn') as HTMLElement;
const themeToggleBtnMobileEl = document.getElementById('theme-toggle-btn-mobile') as HTMLElement;
const sponsorBtnMobileEl = document.getElementById('sponsor-btn-mobile') as HTMLElement;



/**
 * Update mobile toolbar button states based on undo/redo availability
 */
function updateToolbarButtonStates(): void {
  const canUndo = canEditorUndo();
  const canRedo = canEditorRedo();

  if (undoBtnEl) {
    undoBtnEl.setAttribute('aria-disabled', canUndo ? 'false' : 'true');
  }
  
  if (redoBtnEl) {
    redoBtnEl.setAttribute('aria-disabled', canRedo ? 'false' : 'true');
  }
}

/**
 * Handle undo button click
 */
function handleUndo(): void {
  // Only perform undo if it's available
  if (canEditorUndo()) {
    editorUndo();
    updateToolbarButtonStates();
  }
}

/**
 * Handle redo button click
 */
function handleRedo(): void {
  // Only perform redo if it's available
  if (canEditorRedo()) {
    editorRedo();
    updateToolbarButtonStates();
  }
}

/**
 * Handle indent button click
 */
function handleIndent(): void {
  editorIndent();
}

/**
 * Handle dedent button click
 */
function handleDedent(): void {
  editorDedent();
}

/**
 * Handle sponsor button click - open GitHub Sponsors page
 */
function handleSponsor(): void {
  window.open('https://github.com/sponsors/roman-pinchuk', '_blank', 'noopener');
}

/**
 * Clear expanded validation details when content context changes
 */
function clearValidationDetails(): void {
  validationDetails = null;
  isValidationDetailsOpen = false;
  validationDetailsEl.hidden = true;
  statusBarEl.classList.remove('has-details');
  statusBarEl.removeAttribute('title');
}

/**
 * Store validation details and update collapsed/expanded display
 */
function setValidationDetails(title: string, details: string): void {
  validationDetailsTitle = title;
  validationDetails = details;
  isValidationDetailsOpen = false;
  validationDetailsEl.hidden = true;
  statusBarEl.classList.add('has-details');
  statusBarEl.setAttribute('title', details);
  validationDetailsTitleEl.textContent = title;
  validationDetailsContentEl.textContent = details;
}

/**
 * Toggle Home Assistant validation details panel
 */
function toggleValidationDetails(): void {
  if (!validationDetails) {
    return;
  }

  isValidationDetailsOpen = !isValidationDetailsOpen;
  validationDetailsTitleEl.textContent = validationDetailsTitle;
  validationDetailsContentEl.textContent = validationDetails;
  validationDetailsEl.hidden = !isValidationDetailsOpen;
}

function closeValidationDetails(): void {
  isValidationDetailsOpen = false;
  validationDetailsEl.hidden = true;
}

/**
 * Save state to localStorage
 */
function saveState(): void {
  if (currentFile) {
    localStorage.setItem(STORAGE_KEY_CURRENT_FILE, currentFile);
  }
  localStorage.setItem(STORAGE_KEY_EXPANDED_DIRS, JSON.stringify(Array.from(expandedDirs)));
}

/**
 * Restore state from localStorage
 */
function restoreState(): void {
  // Restore expanded directories
  const savedExpandedDirs = localStorage.getItem(STORAGE_KEY_EXPANDED_DIRS);
  if (savedExpandedDirs) {
    try {
      const dirs = JSON.parse(savedExpandedDirs);
      expandedDirs = new Set(dirs);
    } catch (e) {
      console.error('Failed to restore expanded directories:', e);
    }
  }
}

/**
 * Set up logic to keep the toolbar pinned above the keyboard on mobile
 */
function setupKeyboardAwareToolbar(): void {
  const toolbar = document.querySelector('.editor-toolbar') as HTMLElement;
  if (!window.visualViewport || !toolbar) return;

  const updateToolbarPosition = () => {
    const viewport = window.visualViewport!;
    const height = window.innerHeight;
    const offset = height - viewport.height - viewport.offsetTop;
    
    if (offset > 20) {
      // Keyboard is open - Dock it to the top of the keyboard/accessory bar
      toolbar.style.bottom = `${offset}px`;
      toolbar.style.transform = 'translateY(0)';
      toolbar.style.margin = '0';
      toolbar.style.width = '100%';
      toolbar.style.maxWidth = '100%';
      toolbar.style.borderRadius = '0'; // Square bottom to dock perfectly
      toolbar.style.boxShadow = 'none';
      toolbar.style.borderLeft = 'none';
      toolbar.style.borderRight = 'none';
    } else {
      // Keyboard is closed - Return to floating "Energy card" style
      toolbar.style.bottom = 'env(safe-area-inset-bottom)';
      toolbar.style.transform = 'translateY(-8px)';
      toolbar.style.margin = '0 auto';
      toolbar.style.width = ''; // Restore from CSS
      toolbar.style.maxWidth = 'calc(100% - 16px)';
      toolbar.style.borderRadius = '20px';
      toolbar.style.boxShadow = ''; // Restore from CSS
      toolbar.style.borderLeft = '';
      toolbar.style.borderRight = '';
    }
  };

  window.visualViewport.addEventListener('resize', updateToolbarPosition);
  window.visualViewport.addEventListener('scroll', updateToolbarPosition);
  
  // Initial position
  updateToolbarPosition();
}

/**
 * Initialize the application
 */
async function init(): Promise<void> {
   try {
     // Initialize theme
     initTheme();

     // Create editor
     createEditor(editorEl);

     // Register save shortcut
     registerSaveShortcut(handleSave);

      // Listen for editor changes (store handler for potential cleanup)
      editorChangeHandler = () => {
        // Ignore changes while loading a file
        if (isLoadingFile) {
          return;
        }

         isModified = true;
         // We don't clear validation details here anymore to prevent flickering.
         // editor-validation event will handle clearing if the document becomes valid.
         if (isDocumentValid) {
           if (saveBtnEl) saveBtnEl.setAttribute('aria-disabled', 'false');
           if (saveBtnMobileEl) saveBtnMobileEl.setAttribute('aria-disabled', 'false');
           updateStatus('Modified', '');
         }
        
        // Update toolbar button states after content changes
        updateToolbarButtonStates();
      };
      window.addEventListener('editor-changed', editorChangeHandler);

      window.addEventListener('editor-validation', (e: Event) => {
        if (isLoadingFile) return;
        
        const customEvent = e as CustomEvent<any>;
        const validation = customEvent.detail;
        isDocumentValid = validation.isValid;
        
        if (!isDocumentValid) {
          if (saveBtnEl) saveBtnEl.setAttribute('aria-disabled', 'true');
          if (saveBtnMobileEl) saveBtnMobileEl.setAttribute('aria-disabled', 'true');
          
          setValidationDetails('Invalid Configuration', validation.errors.join('\n'));
          updateStatus('Invalid config', 'Cannot save', true);
          
          // Open details automatically if not open
          if (!isValidationDetailsOpen) {
            toggleValidationDetails();
          }
        } else {
          // If valid now, check for warnings
          if (validation.warnings && validation.warnings.length > 0) {
            setValidationDetails('Configuration Warnings', validation.warnings.join('\n'));
            if (isModified) {
              if (saveBtnEl) saveBtnEl.setAttribute('aria-disabled', 'false');
              if (saveBtnMobileEl) saveBtnMobileEl.setAttribute('aria-disabled', 'false');
              updateStatus('Modified (Warnings)', 'Click for details', false, false, true);
            }
          } else {
            // No errors and no warnings
            if (validationDetails) {
              clearValidationDetails();
            }
            if (isModified) {
              if (saveBtnEl) saveBtnEl.setAttribute('aria-disabled', 'false');
              if (saveBtnMobileEl) saveBtnMobileEl.setAttribute('aria-disabled', 'false');
              updateStatus('Modified', '');
            }
          }
        }
      });

      // Set up button listeners (store handlers for cleanup)
      saveButtonHandler = handleSave;
      mobileMenuHandler = toggleMobileSidebar;
      sidebarOverlayHandler = closeMobileSidebar;
      undoButtonHandler = handleUndo;
      redoButtonHandler = handleRedo;
      indentButtonHandler = handleIndent;
       dedentButtonHandler = handleDedent;
        statusBarHandler = toggleValidationDetails;
        validationCloseHandler = closeValidationDetails;
        sponsorHandler = handleSponsor;

      if (validationDetailsRestoreEl) {
        validationDetailsRestoreEl.addEventListener('click', () => {
          if (restoreLastValidContent()) {
             closeValidationDetails();
             updateStatus('Restored to valid state', '');
          }
        });
      }

      if (saveBtnEl) saveBtnEl.addEventListener('click', saveButtonHandler);
      if (saveBtnMobileEl) saveBtnMobileEl.addEventListener('click', saveButtonHandler);

      // Mobile menu toggle
      mobileMenuToggleEl.addEventListener('click', mobileMenuHandler);
      sidebarOverlayEl.addEventListener('click', sidebarOverlayHandler);

// Mobile toolbar buttons
        if (undoBtnEl) {
          undoBtnEl.addEventListener('click', undoButtonHandler);
        }
        if (redoBtnEl) {
          redoBtnEl.addEventListener('click', redoButtonHandler);
        }
        if (indentBtnEl) {
          indentBtnEl.addEventListener('click', indentButtonHandler);
        }
        if (dedentBtnEl) {
          dedentBtnEl.addEventListener('click', dedentButtonHandler);
        }
        statusBarEl.addEventListener('click', statusBarHandler);
        validationDetailsCloseEl.addEventListener('click', validationCloseHandler);
        if (themeToggleBtnMobileEl) {
          // Both header and mobile theme buttons are handled by theme.ts
          // but we need to ensure the mobile one also triggers it
        }
        if (sponsorBtnMobileEl) {
          sponsorBtnMobileEl.addEventListener('click', sponsorHandler);
        }
      
      // Initialize toolbar button states
      updateToolbarButtonStates();

      // Set up keyboard-aware toolbar positioning
      setupKeyboardAwareToolbar();

    // Restore state
    restoreState();

    // Load initial data
    await Promise.all([
      loadFiles(),
      loadEntities(),
    ]);

    // Restore last opened file
    const savedFile = localStorage.getItem(STORAGE_KEY_CURRENT_FILE);
    if (savedFile) {
      // Check if the file still exists in the tree
      if (fileExists(savedFile)) {
        // Expand parent directories to show the file
        expandParentDirectories(savedFile);
        await loadFile(savedFile);
      } else {
        // File no longer exists, clear saved state
        localStorage.removeItem(STORAGE_KEY_CURRENT_FILE);
      }
    }

    updateStatus('Ready', '');
  } catch (error) {
    console.error('Initialization error:', error);
    updateStatus('Initialization failed', '', true);
  }
}

/**
 * Check if a file path exists in the file tree
 */
function fileExists(path: string): boolean {
  function search(nodes: FileInfo[]): boolean {
    for (const node of nodes) {
      if (node.path === path && node.type === 'file') {
        return true;
      }
      if (node.children && search(node.children)) {
        return true;
      }
    }
    return false;
  }
  return search(files);
}

/**
 * Expand all parent directories for a given file path
 */
function expandParentDirectories(filePath: string): void {
  // Split path into parts and expand each parent directory
  const parts = filePath.split('/');
  for (let i = 0; i < parts.length - 1; i++) {
    const dirPath = parts.slice(0, i + 1).join('/');
    expandedDirs.add(dirPath);
  }
  saveState();
}

/**
 * Load file list
 */
async function loadFiles(): Promise<void> {
  try {
    files = await fetchFiles();
    renderFileList();
  } catch (error) {
    console.error('Error loading files:', error);
    fileListEl.innerHTML = '<div class="error">Failed to load files</div>';
  }
}

/**
 * Load entities
 */
async function loadEntities(): Promise<void> {
   try {
     const entities = await fetchEntities();
     setEntities(entities);
   } catch (error) {
     console.error('Error loading entities:', error);
     // Continue with empty entity list
   }
}

/**
 * Render a file tree node as HTML (recursively for directories)
 * @param node The FileInfo node to render
 * @param level The nesting level for indentation (0 = root)
 * @returns HTML string for the node and its children
 */
function renderTreeNode(node: FileInfo, level: number = 0): string {
  const indent = 8 + (level * 16); // VS Code style: 8px base + 16px per level

  if (node.type === 'directory') {
    const isExpanded = expandedDirs.has(node.path);
    const chevronIcon = '<svg class="chevron-icon' + (isExpanded ? ' expanded' : '') + '" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></svg>';

    const folderIcon = isExpanded
      ? '<svg class="folder-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M.54 3.87.5 3h2.672a.5.5 0 0 1 .4.2l.77 1.026h9.159a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H1.5a1 1 0 0 1-1-1V4.887a1 1 0 0 1 .04-.277z"/></svg>'
      : '<svg class="folder-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M.54 3.87.5 3h2.672a.5.5 0 0 1 .4.2l.77 1.026H14.5a.5.5 0 0 1 .5.5v9.5a.5.5 0 0 1-.5.5H1.5a.5.5 0 0 1-.5-.5V4.22a.5.5 0 0 1 .04-.277z"/></svg>';

     let html = `
       <div class="tree-item directory" data-path="${node.path}" data-level="${level}" style="padding-left: ${indent}px" role="treeitem" aria-expanded="${isExpanded}">
         ${chevronIcon}
         ${folderIcon}
         <span class="item-name">${node.name}</span>
       </div>
     `;

     if (isExpanded && node.children && node.children.length > 0) {
       for (const child of node.children) {
         html += renderTreeNode(child, level + 1);
       }
     }

     return html;
   } else {
     // File node - no chevron, so add spacing
     const fileIndent = indent + 20; // Extra space where chevron would be
     return `
       <div class="tree-item file" data-path="${node.path}" data-level="${level}" style="padding-left: ${fileIndent}px" role="treeitem">
         <svg class="file-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
           <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.707A1 1 0 0 0 13.707 4L10 .293A1 1 0 0 0 9.293 0H4z"/>
           <path d="M9 1v3a1 1 0 0 0 1 1h3L9 1z"/>
         </svg>
         <span class="item-name">${node.name}</span>
       </div>
     `;
   }
}

/**
 * Render file list
 */
function renderFileList(): void {
   if (files.length === 0) {
     fileListEl.innerHTML = '<div class="loading">No YAML files found</div>';
     return;
   }

   let html = '';
   for (const node of files) {
     html += renderTreeNode(node, 0);
   }
   fileListEl.innerHTML = html;

   // Add click handlers for directories using event delegation
   attachFileListListeners();
}

/**
 * Attach event listeners to file list using event delegation
 * This prevents memory leaks from re-attaching listeners on every render
 */
function attachFileListListeners(): void {
   // Remove old handler if it exists
   if (fileListClickHandler) {
     fileListEl.removeEventListener('click', fileListClickHandler);
   }

   // Use event delegation on the parent container
   fileListClickHandler = handleFileListClick;
   fileListEl.addEventListener('click', fileListClickHandler);
}

/**
 * Handle clicks on file list items using event delegation
 * Routes clicks to appropriate handlers (directory toggle or file load)
 * @param e Click event
 */
function handleFileListClick(e: Event): void {
   const target = e.target as HTMLElement;
   const treeItem = target.closest('.tree-item') as HTMLElement;

   if (!treeItem) {
     return;
   }

   const path = treeItem.getAttribute('data-path');
   if (!path) {
     return;
   }

   if (treeItem.classList.contains('directory')) {
     e.stopPropagation();
     toggleDirectory(path);
   } else if (treeItem.classList.contains('file')) {
     loadFile(path);
     // Close mobile sidebar when file is selected
     closeMobileSidebar();
   }
}

/**
 * Toggle directory expanded/collapsed state
 */
function toggleDirectory(path: string): void {
   const wasExpanded = expandedDirs.has(path);
   
   if (wasExpanded) {
     expandedDirs.delete(path);
   } else {
     expandedDirs.add(path);
   }
   saveState();
   
   // Update incrementally instead of full re-render
   updateDirectoryToggle(path, !wasExpanded);
}

/**
 * Update a single directory's expand/collapse state without full re-render
 */
function updateDirectoryToggle(path: string, isExpanded: boolean): void {
   const treeItem = fileListEl.querySelector(`[data-path="${path}"]`);
   if (!treeItem) return;
   
   // Update aria-expanded for accessibility
   treeItem.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
   
   const chevronIcon = treeItem.querySelector('.chevron-icon') as SVGElement;
   if (chevronIcon) {
     if (isExpanded) {
       chevronIcon.classList.add('expanded');
     } else {
       chevronIcon.classList.remove('expanded');
     }
   }
   
   const folderIcon = treeItem.querySelector('.folder-icon') as SVGElement;
   if (folderIcon) {
      // Find the directory node in the tree
      const dirNode = findNodeByPath(files, path);
      if (dirNode && dirNode.type === 'directory') {
        // Always remove existing children first
        let nextSibling = treeItem.nextElementSibling;
        while (nextSibling && isChildOf(nextSibling as HTMLElement, path)) {
          const toRemove = nextSibling;
          nextSibling = nextSibling.nextElementSibling;
          toRemove.remove();
        }
        
        // If expanding, add children back
        if (isExpanded && dirNode.children && dirNode.children.length > 0) {
          const childrenHtml = dirNode.children.map((child) => 
            renderTreeNode(child, getNodeLevel(path) + 1)
          ).join('');
          
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = childrenHtml;
          
          nextSibling = treeItem.nextElementSibling;
          // Insert all children from tempDiv into the DOM
          while (tempDiv.firstElementChild) {
            const childElement = tempDiv.firstElementChild;
            if (nextSibling) {
              nextSibling.parentNode?.insertBefore(childElement, nextSibling);
            } else {
              fileListEl.appendChild(childElement);
            }
          }
        }
      }
   }
}

/**
 * Find a node by path in the file tree
 */
function findNodeByPath(nodes: FileInfo[], targetPath: string): FileInfo | null {
   for (const node of nodes) {
     if (node.path === targetPath) {
       return node;
     }
     if (node.children) {
       const found = findNodeByPath(node.children, targetPath);
       if (found) return found;
     }
   }
   return null;
}

/**
 * Get nesting level of a path
 */
function getNodeLevel(path: string): number {
   return path.split('/').length - 1;
}

/**
 * Check if an element is a child of a directory path
 */
function isChildOf(element: HTMLElement, dirPath: string): boolean {
   const level = getNodeLevel(dirPath);
   const elementLevel = parseInt(element.getAttribute('data-level') || '0');
   
   if (elementLevel <= level) {
     return false;
   }
   
   // Check if this element is a descendant by checking its path
   const elementPath = element.getAttribute('data-path') || '';
   return elementPath.startsWith(dirPath + '/');
}

/**
 * Load a file into the editor
 * Fetches file content, updates UI, and marks as active
 * @param filename Path to the file to load
 */
async function loadFile(filename: string): Promise<void> {
  try {
     updateStatus('Loading...', '');
     clearValidationDetails();

    const fileContent = await readFile(filename);

    currentFile = filename;
    isModified = false;
    isLoadingFile = true;
    if (saveBtnEl) saveBtnEl.setAttribute('aria-disabled', 'true');
    if (saveBtnMobileEl) saveBtnMobileEl.setAttribute('aria-disabled', 'true');

    setContent(fileContent.content, true); // Skip adding to history

    isLoadingFile = false;
    currentFilenameEl.textContent = filename;
    if (mobileFilenameEl) {
      // Show only the filename (not the full path) in the small toolbar label
      mobileFilenameEl.textContent = filename.split('/').pop() || filename;
    }

    // Update active file in list
    fileListEl.querySelectorAll('.tree-item').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-path') === filename);
    });

    // Save state
    saveState();

    const sizeKB = (fileContent.size / 1024).toFixed(1);
    updateStatus('Ready', `${sizeKB} KB`);
  } catch (error) {
    console.error('Error loading file:', error);
    updateStatus(`Failed to load ${filename}`, '', true);
  }
}

/**
 * Save the current file
 * Sends file content to backend, creates backup, and updates UI
 */
async function handleSave(): Promise<void> {
  if (!currentFile) {
    updateStatus('No file selected', '', true);
    return;
  }

  if (!isModified) {
    return;
  }

  if (!isDocumentValid) {
    updateStatus('Cannot save invalid configuration', '', true);
    // Expand the validation details to show the user what's wrong
    if (validationDetails) {
      isValidationDetailsOpen = false;
      toggleValidationDetails();
    }
    return;
  }

    try {
      if (saveBtnEl) saveBtnEl.setAttribute('aria-disabled', 'true');
      if (saveBtnMobileEl) saveBtnMobileEl.setAttribute('aria-disabled', 'true');
      clearValidationDetails();
      updateStatus('Saving...', '');

      const content = getContent();
      await saveFile(currentFile, content);

      isModified = false;
      updateStatus('Saved, checking config...', 'Running Home Assistant validation');

      const validation = await validateConfig();

      if (validation.result === 'valid') {
        updateStatus('Saved, config valid', 'HA validation passed', false, true);
      } else if (validation.result === 'invalid') {
        const details = validation.errors || 'Home Assistant reported the configuration as invalid.';
        setValidationDetails('Home Assistant validation failed', details);
        updateStatus('Saved, config invalid', 'Click for details', true);
      } else {
        const details = validation.errors || 'Could not check Home Assistant config.';
        setValidationDetails('Home Assistant validation unavailable', details);
        updateStatus('Saved, validation unavailable', 'Click for details', false, false, true);
      }

      setTimeout(() => {
        if (!isModified && !validationDetails) {
          updateStatus('Ready', '');
        }
      }, 2000);
  } catch (error) {
    console.error('Error saving file:', error);
    updateStatus('Failed to save', '', true);
    if (saveBtnEl) saveBtnEl.setAttribute('aria-disabled', 'false');
    if (saveBtnMobileEl) saveBtnMobileEl.setAttribute('aria-disabled', 'false');
  }
}

/**
 * Update status bar
 */
function updateStatus(message: string, info: string, isError = false, isSuccess = false, isWarning = false): void {
  statusMessageEl.textContent = message;
  statusInfoEl.textContent = info;

  statusMessageEl.classList.remove('error', 'success', 'warning');

  if (isError) {
    statusMessageEl.classList.add('error');
  } else if (isSuccess) {
    statusMessageEl.classList.add('success');
  } else if (isWarning) {
    statusMessageEl.classList.add('warning');
  }
}

/**
 * Toggle mobile sidebar visibility
 */
function toggleMobileSidebar(): void {
  const isActive = sidebarEl.classList.contains('active');
  if (isActive) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
}

/**
 * Open mobile sidebar
 */
function openMobileSidebar(): void {
   sidebarEl.classList.add('active');
   sidebarOverlayEl.classList.add('active');
   mobileMenuToggleEl.setAttribute('aria-expanded', 'true');
}

/**
 * Close mobile sidebar
 */
function closeMobileSidebar(): void {
   sidebarEl.classList.remove('active');
   sidebarOverlayEl.classList.remove('active');
   mobileMenuToggleEl.setAttribute('aria-expanded', 'false');
}

// Start the application
init();
