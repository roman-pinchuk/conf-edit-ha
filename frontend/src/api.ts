/**
 * API Client for backend endpoints
 */

export interface Entity {
  entity_id: string;
  friendly_name: string;
  domain: string;
  state: string;
}

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  children?: FileInfo[];
}

export interface FileContent {
  filename: string;
  content: string;
  size: number;
  modified: string;
}

const API_BASE = '/api';

/**
 * Fetch all entities from Home Assistant
 */
export async function fetchEntities(): Promise<Entity[]> {
  const response = await fetch(`${API_BASE}/entities`);
  if (!response.ok) {
    throw new Error(`Failed to fetch entities: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch list of configuration files
 */
export async function fetchFiles(): Promise<FileInfo[]> {
  const response = await fetch(`${API_BASE}/files`);
  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Read a specific file
 */
export async function readFile(filename: string): Promise<FileContent> {
  const response = await fetch(`${API_BASE}/files/${encodeURIComponent(filename)}`);
  if (!response.ok) {
    throw new Error(`Failed to read file: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Save a file
 */
export async function saveFile(filename: string, content: string): Promise<void> {
  const response = await fetch(`${API_BASE}/files/${encodeURIComponent(filename)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to save file: ${response.statusText}`);
  }
}
