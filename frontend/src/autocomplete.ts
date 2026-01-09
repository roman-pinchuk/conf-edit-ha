/**
 * Simple autocomplete for Home Assistant entities
 */

import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { Entity } from './api';

let entities: string[] = [];
let entityMap: Map<string, Entity> = new Map();

/**
 * Load entities from API
 */
export function setEntities(entityList: Entity[]): void {
  entities = entityList.map(e => e.entity_id);
  entityMap = new Map(entityList.map(e => [e.entity_id, e]));
}

/**
 * CodeMirror autocomplete function
 * Provides entity suggestions based on substring matching
 */
export function entityCompletions(context: CompletionContext): CompletionResult | null {
  console.log('[Autocomplete] Function called, entities count:', entities.length);

  // Get the word before cursor
  const word = context.matchBefore(/[\w._]+/);

  console.log('[Autocomplete] Word match:', word ? {from: word.from, to: word.to, text: word.text} : 'null');

  // Don't show completions if no word is being typed
  if (!word || word.from === word.to) {
    console.log('[Autocomplete] No word or empty word, returning null');
    return null;
  }

  const wordText = word.text.toLowerCase();
  console.log('[Autocomplete] Searching for:', wordText);

  // Filter entities by substring match
  const matches = entities.filter(e =>
    e.toLowerCase().includes(wordText)
  ).slice(0, 50); // Limit to 50 results

  console.log('[Autocomplete] Found matches:', matches.length);

  if (matches.length === 0) {
    return null;
  }

  return {
    from: word.from,
    options: matches.map(entityId => {
      const entity = entityMap.get(entityId);
      return {
        label: entityId,
        type: 'variable',
        detail: entity?.friendly_name || entity?.domain || '',
        info: entity ? `Domain: ${entity.domain}\nState: ${entity.state}` : undefined,
      };
    }),
  };
}

/**
 * Get entity count
 */
export function getEntityCount(): number {
  return entities.length;
}
