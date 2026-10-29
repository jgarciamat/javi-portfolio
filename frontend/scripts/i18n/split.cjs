// Splits the texts of each language in two (A04 of docs/auditoria-regresion-2026-10-27):
//
// - «core»: the keys the code that runs before any page that needs the rest can use: what
//   src/main.tsx reaches through its imports, static or dynamic, except the dynamic imports
//   written inside `withAllTexts(…)` (those pages wait for the rest before they render).
//   Spanish core travels in the main chunk; the English one is a chunk of its own.
// - «rest»: every other key, a chunk per language, downloaded before a page that needs it renders.
//
// Which keys a file can use is read from its string literals (conservatively: a literal that is
// a key, or the beginning of keys, as in t(`app.health.detail.${id}`), brings all of them), so the
// split follows the code by itself and a raw key never paints. vite.config.ts builds the two
// parts with it; src/__tests__/core/i18nSplit.test.ts checks it.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

/** The import aliases of vite.config.ts / tsconfig.json. */
const ALIASES = {
  '@modules/': 'src/modules/',
  '@shared/': 'src/shared/',
  '@core/': 'src/core/',
  '@locales/': 'src/locales/',
};

/** The call whose dynamic imports wait for the rest of the texts (src/core/i18n/I18nContext.tsx). */
const GATE = 'withAllTexts';

/** A literal that may name keys: «namespace.something», no spaces. */
const KEY_LIKE = /^[a-zA-Z][\w-]*\.[\w.-]*$/;

function resolveImport(root, from, spec) {
  let base = null;
  for (const [alias, dir] of Object.entries(ALIASES)) {
    if (spec.startsWith(alias)) base = path.join(root, dir, spec.slice(alias.length));
  }
  if (!base && spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  if (!base) return null; // a package: it has no texts of the app
  for (const file of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

/** True when `node` sits inside a call to `withAllTexts(…)`. */
function insideGate(node) {
  for (let up = node.parent; up; up = up.parent) {
    if (ts.isCallExpression(up) && ts.isIdentifier(up.expression) && up.expression.text === GATE) {
      return true;
    }
  }
  return false;
}

/**
 * What one source file uses: the files it imports (`next`; dynamic imports inside the gate apart,
 * in `gated`) and the string literals that may be keys or the beginning of keys.
 */
function readSource(root, file) {
  const text = fs.readFileSync(file, 'utf8');
  const next = [];
  const gated = [];
  const literals = [];
  if (file.endsWith('.json')) {
    JSON.stringify(JSON.parse(text), (_k, value) => {
      if (typeof value === 'string' && KEY_LIKE.test(value)) literals.push(value);
      return value;
    });
    return { next, gated, literals };
  }
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const follow = (spec, list) => {
    const target = resolveImport(root, file, spec);
    if (target && /\.(tsx?|json)$/.test(target)) list.push(target);
  };
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const typeOnly = ts.isImportDeclaration(node)
        ? node.importClause?.isTypeOnly
        : node.isTypeOnly;
      if (!typeOnly) follow(node.moduleSpecifier.text, next);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [spec] = node.arguments;
      if (spec && ts.isStringLiteralLike(spec)) follow(spec.text, insideGate(node) ? gated : next);
    } else if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node)
    ) {
      if (KEY_LIKE.test(node.text)) literals.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { next, gated, literals };
}

/**
 * The files reachable from `entries` without crossing the gate, and the pages behind it.
 * @returns {{ files: Set<string>, gated: Set<string>, literals: Set<string> }}
 */
function reach(root, entries) {
  const files = new Set();
  const gated = new Set();
  const literals = new Set();
  const queue = entries.map((entry) => path.resolve(root, entry));
  while (queue.length) {
    const file = queue.pop();
    if (files.has(file)) continue;
    files.add(file);
    const read = readSource(root, file);
    read.literals.forEach((literal) => literals.add(literal));
    read.gated.forEach((page) => gated.add(page));
    queue.push(...read.next);
  }
  return { files, gated, literals };
}

/** The keys of `messages` that the `literals` can name (a literal that starts keys brings them all). */
function keysNamed(messages, literals) {
  const keys = Object.keys(messages);
  const named = new Set();
  for (const literal of literals) {
    if (literal in messages) named.add(literal);
    for (const key of keys) if (key.startsWith(literal)) named.add(key);
  }
  return named;
}

/** The core keys: those the code before the gate can use (see the top of this file). */
function coreKeys(root, messages, entries = ['src/main.tsx']) {
  return keysNamed(messages, reach(root, entries).literals);
}

/** `messages` split in the core keys and the rest. */
function splitMessages(messages, core) {
  const parts = { core: {}, rest: {} };
  for (const [key, value] of Object.entries(messages)) {
    parts[core.has(key) ? 'core' : 'rest'][key] = value;
  }
  return parts;
}

module.exports = { coreKeys, keysNamed, reach, readSource, splitMessages, GATE };
