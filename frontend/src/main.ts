/**
 * Main application entry point
 */

import { initTheme } from './theme';
import { createEditor, setContent, getContent, registerSaveShortcut } from './editor';
import { fetchEntities, fetchFiles, readFile, saveFile, type FileInfo } from './api';
import { setEntities, getEntityCount } from './autocomplete';

// Application state
let currentFile: string | null = null;
let isModified = false;
let files: FileInfo[] = [];
let expandedDirs: Set<string> = new Set();

// LocalStorage keys
const STORAGE_KEY_CURRENT_FILE = 'conf-edit-ha:current-file';
const STORAGE_KEY_EXPANDED_DIRS = 'conf-edit-ha:expanded-dirs';

// DOM elements
const fileListEl = document.getElementById('file-list')!;
const currentFilenameEl = document.getElementById('current-filename')!;
const saveBtnEl = document.getElementById('save-btn') as HTMLButtonElement;
const refreshBtnEl = document.getElementById('refresh-entities-btn') as HTMLButtonElement;
const statusMessageEl = document.getElementById('status-message')!;
const statusInfoEl = document.getElementById('status-info')!;
const editorEl = document.getElementById('editor')!;

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

    // Listen for editor changes
    window.addEventListener('editor-changed', () => {
      isModified = true;
      saveBtnEl.disabled = false;
      updateStatus('Modified', '');
    });

    // Set up button listeners
    saveBtnEl.addEventListener('click', handleSave);
    refreshBtnEl.addEventListener('click', handleRefreshEntities);

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
    const count = getEntityCount();
    if (count > 0) {
      console.log(`Loaded ${count} entities for autocomplete`);
    } else {
      console.log('No entities available (Home Assistant not connected)');
    }
  } catch (error) {
    console.error('Error loading entities:', error);
    // Continue with empty entity list
  }
}

/**
 * Refresh entities
 */
async function handleRefreshEntities(): Promise<void> {
  refreshBtnEl.disabled = true;
  updateStatus('Refreshing entities...', '');

  try {
    await loadEntities();
    const count = getEntityCount();
    updateStatus(`Refreshed ${count} entities`, '', false, true);
    setTimeout(() => {
      if (!isModified) {
        updateStatus('Ready', '');
      }
    }, 2000);
  } catch (error) {
    updateStatus('Failed to refresh entities', '', true);
  } finally {
    refreshBtnEl.disabled = false;
  }
}

/**
 * Render a file tree node recursively
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
      <div class="tree-item directory" data-path="${node.path}" data-level="${level}" style="padding-left: ${indent}px">
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
      <div class="tree-item file" data-path="${node.path}" data-level="${level}" style="padding-left: ${fileIndent}px">
        <svg class="file-icon" viewBox="0 0 16 16" fill="currentColor">
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

  // Add click handlers for directories
  fileListEl.querySelectorAll('.tree-item.directory').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const path = el.getAttribute('data-path');
      if (path) {
        toggleDirectory(path);
      }
    });
  });

  // Add click handlers for files
  fileListEl.querySelectorAll('.tree-item.file').forEach((el) => {
    el.addEventListener('click', () => {
      const path = el.getAttribute('data-path');
      if (path) {
        loadFile(path);
      }
    });
  });
}

/**
 * Toggle directory expanded/collapsed state
 */
function toggleDirectory(path: string): void {
  if (expandedDirs.has(path)) {
    expandedDirs.delete(path);
  } else {
    expandedDirs.add(path);
  }
  saveState();
  renderFileList();
}

/**
 * Load a file into the editor
 */
async function loadFile(filename: string): Promise<void> {
  try {
    updateStatus('Loading...', '');

    const fileContent = await readFile(filename);

    currentFile = filename;
    isModified = false;
    saveBtnEl.disabled = true;

    setContent(fileContent.content);
    currentFilenameEl.textContent = filename;

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
 */
async function handleSave(): Promise<void> {
  if (!currentFile) {
    updateStatus('No file selected', '', true);
    return;
  }

  if (!isModified) {
    return;
  }

  try {
    saveBtnEl.disabled = true;
    updateStatus('Saving...', '');

    const content = getContent();
    await saveFile(currentFile, content);

    isModified = false;
    updateStatus('Saved successfully', '', false, true);

    setTimeout(() => {
      if (!isModified) {
        updateStatus('Ready', '');
      }
    }, 2000);
  } catch (error) {
    console.error('Error saving file:', error);
    updateStatus('Failed to save', '', true);
    saveBtnEl.disabled = false;
  }
}

/**
 * Update status bar
 */
function updateStatus(message: string, info: string, isError = false, isSuccess = false): void {
  statusMessageEl.textContent = message;
  statusInfoEl.textContent = info;

  statusMessageEl.classList.remove('error', 'success');

  if (isError) {
    statusMessageEl.classList.add('error');
  } else if (isSuccess) {
    statusMessageEl.classList.add('success');
  }
}

// Start the application
init();
