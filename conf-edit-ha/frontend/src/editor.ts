/**
 * CodeMirror 6 editor setup with YAML support
 */

import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment, RangeSetBuilder, Transaction } from '@codemirror/state';
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate, keymap } from '@codemirror/view';
import { yaml } from '@codemirror/lang-yaml';
import { autocompletion } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { linter, Diagnostic } from '@codemirror/lint';
import { indentLess, insertTab, undo, redo, undoDepth, redoDepth } from '@codemirror/commands';
import { parse as parseYAML } from 'yaml';
import { entityCompletions, isValidEntity } from './autocomplete';
import { isDark } from './theme';
import { syntaxTree } from '@codemirror/language';
import type { EditorSettings } from './api';
import type { AppearanceSettings } from './appearance';

export interface DocumentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

let currentValidationResult: DocumentValidationResult = { isValid: true, errors: [], warnings: [] };
let lastValidContent: string | null = null;

export function getValidationResult(): DocumentValidationResult {
  return currentValidationResult;
}

export function restoreLastValidContent(): boolean {
  if (lastValidContent !== null && editorView) {
    // False means don't skip history, so the user can undo the restore if they change their mind
    setContent(lastValidContent, false);
    return true;
  }
  return false;
}

/**
 * Validate document syntax and entities
 */
function validateDocument(state: EditorState): void {
  const errors: string[] = [];
  const warnings: string[] = [];
  let syntaxErrorCount = 0;
  
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.type.isError) {
        syntaxErrorCount++;
      }
    }
  });

  if (syntaxErrorCount > 0) {
    errors.push(`Found YAML syntax error(s).`);
  }

  const docText = state.doc.toString();
  const lines = docText.split('\n');
  let inEntitiesList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const entityIdMatch = line.match(/(?:entity_id|entity)\s*:\s*['"]?([^'"\s#]+)['"]?/);
    if (entityIdMatch) {
      const entityId = entityIdMatch[1];
      // Only check if it looks like an entity ID (has a dot) to avoid false positives on other YAML keys
      if (entityId.includes('.') && entityId.match(/^[a-z_]+\.[a-z0-9_]+$/)) {
        if (!isValidEntity(entityId)) {
          warnings.push(`Line ${i + 1}: Entity '${entityId}' not found (may be disabled or missing)`);
        }
      } else if (entityId !== '') {
        // It matched entity_id: something, but it's not a valid format
        // We'll add a warning instead of an error to be safe, or we could add an error.
        // The user asked "Can we determine if there is not valid entity and not existing/disabled?"
        warnings.push(`Line ${i + 1}: Invalid entity ID format '${entityId}'`);
      }
    }
    
    // Check for lists under entities:
    if (line.match(/^\s*entities\s*:/)) {
      inEntitiesList = true;
      continue;
    }
    
    if (inEntitiesList) {
      if (line.match(/^\s*-/)) {
        // We only want to match plain strings, not object keys like "- entity: ..."
        // A simple heuristic: no colon in the string
        const listItemMatch = line.match(/^\s*-\s*['"]?([^'"\s#:]+)['"]?/);
        if (listItemMatch) {
          const entityId = listItemMatch[1];
          if (entityId.match(/^[a-z_]+\.[a-z0-9_]+$/)) {
            if (!isValidEntity(entityId)) {
              warnings.push(`Line ${i + 1}: Entity '${entityId}' not found (may be disabled or missing)`);
            }
          } else {
             warnings.push(`Line ${i + 1}: Invalid entity ID format '${entityId}'`);
          }
        }
      } else if (line.trim() !== '' && !line.match(/^\s*#/)) {
        // Exited the list if indentation is 0
        if (!line.match(/^\s+/)) {
          inEntitiesList = false;
        }
      }
    }
  }

  const isValid = errors.length === 0;
  
  if (isValid) {
    lastValidContent = docText;
  }

  currentValidationResult = {
    isValid,
    errors,
    warnings
  };
  
  // Dispatch custom event for the UI
  window.dispatchEvent(new CustomEvent('editor-validation', { 
    detail: currentValidationResult 
  }));
}

let editorView: EditorView | null = null;
const themeCompartment = new Compartment();
const rainbowIndentThemeCompartment = new Compartment();
const indentationGuidesCompartment = new Compartment();
const rainbowBracketsCompartment = new Compartment();
const lineWrappingCompartment = new Compartment();
const defaultEditorSettings: EditorSettings = {
  indent_style: 'spaces',
  indent_opacity: 100,
};
let editorSettings: EditorSettings = defaultEditorSettings;
let themeChangeHandler: ((e: Event) => void) | null = null;
let saveShortcutHandler: ((e: KeyboardEvent) => void) | null = null;

/**
 * Rainbow brackets extension
 * Colors matching brackets with different colors based on nesting level
 */
interface RainbowBracketsValue {
  decorations: DecorationSet;
}

const rainbowBrackets = ViewPlugin.fromClass(
   class {
     decorations: DecorationSet;

     constructor(view: EditorView) {
       this.decorations = this.buildDecorations(view);
     }

     update(update: ViewUpdate) {
       if (update.docChanged || update.viewportChanged) {
         this.decorations = this.buildDecorations(update.view);
       }
     }

     buildDecorations(view: EditorView): DecorationSet {
       const builder = new RangeSetBuilder<Decoration>();
       const brackets = '[]{}()';
       const colors = ['rainbow-bracket-1', 'rainbow-bracket-2', 'rainbow-bracket-3', 'rainbow-bracket-4'];
       const stack: number[] = [];

       for (const { from, to } of view.visibleRanges) {
         const text = view.state.doc.sliceString(from, to);

         for (let i = 0; i < text.length; i++) {
           const char = text[i];
           const pos = from + i;

           if (char === '[' || char === '{' || char === '(') {
             const level = stack.length % colors.length;
             builder.add(pos, pos + 1, Decoration.mark({ class: colors[level] }));
             stack.push(brackets.indexOf(char));
           } else if (char === ']' || char === '}' || char === ')') {
             stack.pop();
             const level = stack.length % colors.length;
             builder.add(pos, pos + 1, Decoration.mark({ class: colors[level] }));
           }
         }
       }

       return builder.finish();
     }
   },
   {
     decorations: (v: RainbowBracketsValue) => v.decorations,
   }
);

interface IndentationGuidesValue {
  decorations: DecorationSet;
}

/**
 * Rainbow indentation using colored spaces or non-layout line overlays.
 */
const indentationGuides = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.transactions.some((transaction) => transaction.reconfigured)
      ) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();

      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to; ) {
          const line = view.state.doc.lineAt(pos);
          const text = line.text;

          // Count leading spaces
          let spaces = 0;
          for (let i = 0; i < text.length; i++) {
            if (text[i] === ' ') {
              spaces++;
            } else {
              break;
            }
          }

          // Render each pair of spaces as one indentation level.
          if (spaces > 0) {
            if (editorSettings.indent_style === 'lines') {
              const guideLayers: string[] = [];
              for (let i = 0; i < spaces; i += 2) {
                const level = Math.floor(i / 2) % 4;
                guideLayers.push(
                  `linear-gradient(var(--indent-color-${level}), var(--indent-color-${level})) ${i + 0.5}ch 0 / 1px 100% no-repeat`
                );
              }
              builder.add(
                line.from,
                line.from,
                Decoration.line({
                  class: 'cm-indent-lines',
                  attributes: {
                    style: `--indent-guides: ${guideLayers.join(',')}`,
                  },
                })
              );
            } else {
              for (let i = 0; i < spaces; i += 2) {
                const level = Math.floor(i / 2) % 4;
                const from = line.from + i;
                const to = line.from + Math.min(i + 2, spaces);

                builder.add(
                  from,
                  to,
                  Decoration.mark({
                    class: `indent-rainbow-${level}`,
                  })
                );
              }
            }
          }

          pos = line.to + 1;
        }
      }

      return builder.finish();
    }
  },
  {
    decorations: (v: IndentationGuidesValue) => v.decorations,
  }
);

/**
 * Base theme for rainbow brackets (applies to both light and dark)
 */
const rainbowBracketsTheme = EditorView.baseTheme({
  '.rainbow-bracket-1': { color: '#ffd700' },
  '.rainbow-bracket-2': { color: '#da70d6' },
  '.rainbow-bracket-3': { color: '#87cefa' },
  '.rainbow-bracket-4': { color: '#98fb98' },
});

/**
 * Build indentation guide styles while preserving the current light/dark
 * color strength at 100% opacity.
 */
function createIndentTheme(dark: boolean): ReturnType<typeof EditorView.theme> {
  const colors = [
    [255, 215, 0, dark ? 0.15 : 0.4],
    [218, 112, 214, dark ? 0.12 : 0.35],
    [135, 206, 250, dark ? 0.18 : 0.45],
    [152, 251, 152, dark ? 0.15 : 0.4],
  ];
  const opacity = editorSettings.indent_opacity / 100;
  const styles: Record<string, Record<string, string>> = { '&': {} };

  colors.forEach(([red, green, blue, baseOpacity], index) => {
    const color = `rgba(${red}, ${green}, ${blue}, ${baseOpacity * opacity})`;
    styles['&'][`--indent-color-${index}`] = color;
    styles[`.indent-rainbow-${index}`] = {
      backgroundColor: color,
      borderRadius: '0',
      display: 'inline-block',
      minHeight: '1.2em',
    };
  });

  styles['.cm-line'] = {
    position: 'relative',
  };
  styles['.cm-indent-lines::before'] = {
    content: '""',
    position: 'absolute',
    inset: '0',
    background: 'var(--indent-guides)',
    pointerEvents: 'none',
  };

  return EditorView.theme(styles, { dark });
}

interface YAMLError {
  linePos?: Array<{ line: number; col: number }>;
  message?: string;
}

/**
 * YAML linter that validates YAML syntax
 */
function yamlLinter(view: EditorView): Diagnostic[] {
   const diagnostics: Diagnostic[] = [];
   const doc = view.state.doc.toString();

   try {
     // Try to parse the YAML
     parseYAML(doc, { strict: true });
   } catch (error) {
     // YAML parsing error found
     const yamlError = error as YAMLError;
     if (yamlError && yamlError.linePos) {
       // Calculate position in the document
       const line = yamlError.linePos[0].line - 1; // linePos is 1-indexed
       const col = yamlError.linePos[0].col - 1;

       const lineInfo = view.state.doc.line(line + 1);
       const from = lineInfo.from + col;
       const to = Math.min(from + 10, lineInfo.to); // Highlight ~10 chars or to end of line

       diagnostics.push({
         from,
         to,
         severity: 'error',
         message: yamlError.message || 'YAML syntax error',
       });
     } else {
       // Generic error without position info
       const errorMessage = error instanceof Error ? error.message : 'YAML syntax error';
       diagnostics.push({
         from: 0,
         to: Math.min(10, doc.length),
         severity: 'error',
         message: errorMessage,
       });
     }
   }

   return diagnostics;
}

/**
 * Create and initialize the editor
 */
export function createEditor(parent: HTMLElement, settings: EditorSettings = defaultEditorSettings): EditorView {
  editorSettings = settings;
  const startState = EditorState.create({
    doc: '',
    extensions: [
      basicSetup,
      yaml(),
      linter(yamlLinter),
      indentationGuidesCompartment.of(indentationGuides),
      rainbowBracketsCompartment.of(rainbowBrackets),
      rainbowBracketsTheme,
      autocompletion({
        override: [entityCompletions],
        activateOnTyping: true,
      }),
      // Tab inserts 2 spaces, Shift+Tab unindents
      keymap.of([
        { key: 'Tab', run: insertTab },
        { key: 'Shift-Tab', run: indentLess }
      ]),
      EditorState.tabSize.of(2),
      EditorView.theme({
        '&': {
          // Ensure tab renders as 2 spaces visually
          tabSize: 2,
        },
      }),
      EditorView.contentAttributes.of({
        autocorrect: "off",
        autocapitalize: "off",
        spellcheck: "false",
        enterkeyhint: "enter",
        inputmode: "text",
        autocomplete: "new-password" // More aggressive way to hide iOS autofill bar
      }),
      themeCompartment.of(isDark() ? oneDark : []),
      rainbowIndentThemeCompartment.of(createIndentTheme(isDark())),
      lineWrappingCompartment.of(EditorView.lineWrapping),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          // Notify that content has changed
          window.dispatchEvent(new Event('editor-changed'));
          validateDocument(update.state);
        }
      }),
    ],
  });

   editorView = new EditorView({
     state: startState,
      parent,
    });

    editorView.dom.style.fontSize = '14px';

    // Listen for theme changes (store handler for cleanup)
    themeChangeHandler = (e: Event) => {
      if (editorView) {
        // Use the theme value from the event to avoid race conditions in WebView
        const customEvent = e as CustomEvent<{ dark: boolean }>;
        const isDarkMode = customEvent.detail?.dark ?? isDark();
        updateTheme(isDarkMode);
      }
    };
    window.addEventListener('theme-changed', themeChangeHandler);

    return editorView;
}

/**
 * Apply browser appearance settings without recreating the editor.
 */
export function applyAppearanceSettings(settings: AppearanceSettings): void {
  editorSettings = settings;
  if (!editorView) return;

  editorView.dom.style.fontSize = `${settings.fontSize}px`;
  editorView.dispatch({
    effects: [
      rainbowIndentThemeCompartment.reconfigure(createIndentTheme(isDark())),
      indentationGuidesCompartment.reconfigure(indentationGuides),
      rainbowBracketsCompartment.reconfigure(settings.rainbowBrackets ? rainbowBrackets : []),
      lineWrappingCompartment.reconfigure(settings.lineWrapping ? EditorView.lineWrapping : []),
    ],
  });
}

/**
 * Get the current editor instance
 */
export function getEditor(): EditorView | null {
  return editorView;
}

/**
 * Set editor content
 */
export function setContent(content: string, skipHistory: boolean = false): void {
   if (!editorView) return;

   const changeSpec = {
     changes: {
       from: 0,
       to: editorView.state.doc.length,
       insert: content,
     },
   };

   // Don't add to undo history when loading files
   if (skipHistory) {
     editorView.dispatch({
       ...changeSpec,
       annotations: Transaction.addToHistory.of(false),
     });
     // Also reset the last valid content to this new content when loading
     lastValidContent = content;
   } else {
     editorView.dispatch(changeSpec);
   }
}

/**
 * Get editor content
 */
export function getContent(): string {
  if (!editorView) return '';
  return editorView.state.doc.toString();
}

/**
 * Update editor theme
 * @param isDarkMode - Optional theme state to use. If not provided, uses isDark() function.
 *                     Accepting parameter avoids race conditions in WebView environments.
 */
function updateTheme(isDarkMode?: boolean): void {
   if (!editorView) {
     return;
   }

   // Use provided value or fall back to isDark() function
   const dark = isDarkMode !== undefined ? isDarkMode : isDark();
   
   editorView.dispatch({
     effects: [
       themeCompartment.reconfigure(dark ? oneDark : []),
        rainbowIndentThemeCompartment.reconfigure(createIndentTheme(dark)),
     ],
   });
}

/**
 * Focus the editor
 */
export function focusEditor(): void {
  if (editorView) {
    editorView.focus();
  }
}

/**
 * Register save shortcut (Ctrl+S / Cmd+S)
 */
export function registerSaveShortcut(callback: () => void): void {
    if (!editorView) return;

    // Remove old handler if it exists
    if (saveShortcutHandler) {
      editorView.dom.removeEventListener('keydown', saveShortcutHandler);
    }

    // Store handler for cleanup and prevent duplicate listeners
    saveShortcutHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        callback();
      }
    };

    editorView.dom.addEventListener('keydown', saveShortcutHandler);
}

/**
 * Execute undo command
 */
export function editorUndo(): boolean {
  if (!editorView) return false;
  return undo(editorView);
}

/**
 * Execute redo command
 */
export function editorRedo(): boolean {
  if (!editorView) return false;
  return redo(editorView);
}

/**
 * Execute indent command
 */
export function editorIndent(): boolean {
  if (!editorView) return false;
  return insertTab(editorView);
}

/**
 * Execute dedent command
 */
export function editorDedent(): boolean {
  if (!editorView) return false;
  return indentLess(editorView);
}

/**
 * Check if undo is available
 */
export function canEditorUndo(): boolean {
   if (!editorView) return false;
   
   // Use CodeMirror's built-in undoDepth function
   // Returns the number of undo events in the history
   return undoDepth(editorView.state) > 0;
}

/**
 * Check if redo is available
 */
export function canEditorRedo(): boolean {
   if (!editorView) return false;
   
   // Use CodeMirror's built-in redoDepth function
   // Returns the number of redo events in the history
   return redoDepth(editorView.state) > 0;
}
