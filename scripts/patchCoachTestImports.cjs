const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'dist-coach-tests');

function isExtensionlessRelative(specifier) {
  if (!specifier.startsWith('.')) return false;
  const lastSegment = specifier.split('/').pop() || '';
  return !lastSegment.includes('.');
}

function patchContent(content) {
  return content
    .replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (match, prefix, specifier, suffix) =>
      isExtensionlessRelative(specifier) ? `${prefix}${specifier}.js${suffix}` : match,
    )
    .replace(/(import\s+['"])(\.[^'"]+)(['"])/g, (match, prefix, specifier, suffix) =>
      isExtensionlessRelative(specifier) ? `${prefix}${specifier}.js${suffix}` : match,
    )
    .replace(/(import\(\s*['"])(\.[^'"]+)(['"]\s*\))/g, (match, prefix, specifier, suffix) =>
      isExtensionlessRelative(specifier) ? `${prefix}${specifier}.js${suffix}` : match,
    );
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const before = fs.readFileSync(fullPath, 'utf8');
    const after = patchContent(before);
    if (after !== before) fs.writeFileSync(fullPath, after);
  }
}

if (fs.existsSync(root)) walk(root);
