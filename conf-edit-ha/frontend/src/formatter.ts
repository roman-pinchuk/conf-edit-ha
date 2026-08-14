/** Format supported structured documents with Prettier in the browser. */

import type { EditorFileType } from './editor';

export async function formatDocument(content: string, fileType: EditorFileType): Promise<string> {
  const prettier = await import('prettier/standalone');
  if (fileType === 'yaml') {
    const yaml = await import('prettier/plugins/yaml');
    return prettier.format(content, {
      parser: 'yaml',
      plugins: [yaml],
      tabWidth: 2,
    });
  }

  const [babel, estree] = await Promise.all([
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
  ]);

  return prettier.format(content, {
    parser: 'json-stringify',
    plugins: [babel, estree],
    tabWidth: 2,
  });
}
