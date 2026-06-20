// Test-Setup für `node --test`.
//
// lkw-shared liefert bewusst rohes TypeScript mit *extensionslosen* Relativ-
// Imports aus (z.B. `import ... from './formatters'`), weil die Consumer (Vite /
// Metro) das so auflösen. Node's nativer ESM-Resolver verlangt jedoch Endungen.
// Dieser Resolve-Hook mappt extensionslose Relativ-Importe auf die `.ts`-Datei,
// damit Nodes eingebauter Test-Runner (mit Type-Stripping) den echten Quellcode
// ausführen kann – ohne zusätzliche Dependencies.
import { register } from 'node:module';

const hook = `
import { dirname, resolve as resolvePath } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\\.(ts|js|json|mjs|cjs)$/.test(specifier)) {
    try {
      const parent = fileURLToPath(context.parentURL);
      const cand = resolvePath(dirname(parent), specifier + '.ts');
      if (existsSync(cand)) return next(pathToFileURL(cand).href, context);
    } catch {}
  }
  return next(specifier, context);
}
`;
register('data:text/javascript,' + encodeURIComponent(hook), import.meta.url);
