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

// API base uses relative path for Home Assistant add-on compatibility
// Works correctly in iOS WebView and all other environments
const API_BASE = './api';

/**
 * Encode file path for URL with proper handling of slashes
 * iOS WebView can be sensitive to how slashes are encoded
 */
const encodeFilePath = (filename: string): string => {
  // Don't encode the forward slashes in paths, but encode everything else
  // This is crucial for iOS WebView compatibility
  return filename.split('/').map(segment => encodeURIComponent(segment)).join('/');
};



/**
 * Fetch all entities from Home Assistant
 */
export async function fetchEntities(): Promise<Entity[]> {
  const url = `${API_BASE}/entities`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'same-origin',
      mode: 'cors'
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to fetch entities: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }
    return response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch list of configuration files
 */
export async function fetchFiles(): Promise<FileInfo[]> {
  const url = `${API_BASE}/files`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'same-origin',
      mode: 'cors'
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to fetch files: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }
    return response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Read a specific file
 */
export async function readFile(filename: string): Promise<FileContent> {
  const encodedFilename = encodeFilePath(filename);
  const url = `${API_BASE}/files/${encodedFilename}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      mode: 'cors'
    });
    
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        // Error reading response body
      }
      
      const errorMessage = `Failed to read file: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`;
      throw new Error(errorMessage);
    }
    
    return response.json();
  } catch (error: any) {
    throw error;
  }
}

/**
 * Save a file
 */
export async function saveFile(filename: string, content: string): Promise<void> {
  const encodedFilename = encodeFilePath(filename);
  const url = `${API_BASE}/files/${encodedFilename}`;
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'same-origin',
      mode: 'cors',
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      let error = {};
      try {
        error = await response.json();
      } catch (e) {
        error = { raw_response: await response.text().catch(() => 'Could not read error response') };
      }
      
      const errorMessage = (error as any).error || `Failed to save file: ${response.statusText}`;
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    throw error;
  }
}
