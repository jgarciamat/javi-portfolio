/* eslint-disable @typescript-eslint/no-require-imports -- the build script is CommonJS */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import es from '@locales/es.json';
import en from '@locales/en.json';

/** The texts split of the build (A04): scripts/i18n/split.cjs, used by vite.config.ts. */
const split = require('../../../scripts/i18n/split.cjs') as {
  coreKeys: (root: string, messages: Record<string, string>) => Set<string>;
  keysNamed: (messages: Record<string, string>, literals: Iterable<string>) => Set<string>;
  reach: (root: string, entries: string[]) => { files: Set<string>; gated: Set<string> };
  readSource: (root: string, file: string) => { next: string[]; literals: string[] };
  splitMessages: (
    messages: Record<string, string>,
    core: Set<string>
  ) => Record<'core' | 'rest', Record<string, string>>;
};

const ROOT = path.resolve(__dirname, '../../..');
const ES: Record<string, string> = es;
const EN: Record<string, string> = en;
const core = split.coreKeys(ROOT, { ...ES, ...EN });

/** Every source file of the app (tests apart). */
function sources(dir = path.join(ROOT, 'src')): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return ['__tests__', '__mocks__', 'test-utils'].includes(entry.name) ? [] : sources(full);
    }
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [full] : [];
  });
}

/** The first argument of every t(…) / tCategory-free translate(locale, …) call: a key or its start. */
function translatedKeys(file: string): { key: string; prefix: boolean; at: string }[] {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
  const found: { key: string; prefix: boolean; at: string }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : '';
      const arg =
        name === 't' ? node.arguments[0] : name === 'translate' ? node.arguments[1] : null;
      const at = `${path.relative(ROOT, file)}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}`;
      if (arg && ts.isStringLiteralLike(arg)) found.push({ key: arg.text, prefix: false, at });
      if (arg && ts.isTemplateExpression(arg) && arg.head.text) {
        found.push({ key: arg.head.text, prefix: true, at });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('texts split in core and rest', () => {
  it('splits both languages into the same two sets of keys, with nothing lost', () => {
    for (const messages of [ES, EN]) {
      const parts = split.splitMessages(messages, core);
      expect({ ...parts.core, ...parts.rest }).toEqual(messages);
      expect(Object.keys(parts.core).filter((key) => key in parts.rest)).toEqual([]);
    }
    const coreOf = (messages: Record<string, string>) =>
      Object.keys(split.splitMessages(messages, core).core).sort();
    expect(coreOf(EN).filter((key) => key in ES)).toEqual(coreOf(ES));
  });

  it('keeps in the core what the landing, the login and the plans show', () => {
    for (const key of [
      'landing.meta.title',
      'app.auth.login.submit',
      'app.apiError.generic',
      'app.error.title',
      'app.offline.banner',
      'app.update.available',
      'app.lock.title',
    ]) {
      expect(key in ES && core.has(key)).toBe(true);
    }
    // The heavy parts wait: tools, self-employed, crypto, the Renta assistant, Hacienda's guides.
    for (const key of Object.keys(ES).filter((k) => /^(app\.(autonomo|crypto)|wizard)\./.test(k))) {
      expect(core.has(key)).toBe(false);
    }
    // A small part: the core is under a tenth of the texts.
    expect(core.size).toBeLessThan(Object.keys(ES).length / 10);
  });

  it('makes every page but the landing, the login and the plans wait for the rest', () => {
    const { files, gated } = split.reach(ROOT, ['src/main.tsx']);
    const names = (set: Set<string>) => Array.from(set, (file) => path.basename(file)).sort();
    expect(names(files)).toEqual(
      expect.arrayContaining([
        'LandingPage.tsx',
        'AuthPage.tsx',
        'PricingPage.tsx',
        'VerifyEmailPage.tsx',
        'ResetPasswordPage.tsx',
      ])
    );
    expect(names(files)).not.toContain('DashboardPage.tsx');
    expect(names(gated)).toEqual(
      expect.arrayContaining([
        'DashboardPage.tsx',
        'CalculatorPages.tsx',
        'GuidePages.tsx',
        'HaciendaPages.tsx',
        'PrivacyPolicyPage.tsx',
        'TermsPage.tsx',
        'VideosPage.tsx',
        'SalaryCalculator.tsx',
        'RetaCalculator.tsx',
      ])
    );
  });

  it('counts a literal that starts keys as all of them, and reads JSON data', () => {
    expect(Array.from(split.keysNamed(ES, ['app.categories.'])).sort()).toEqual(
      Object.keys(ES)
        .filter((key) => key.startsWith('app.categories.'))
        .sort()
    );
    const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'i18n-split-'));
    fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify({ a: 'landing.meta.title' }));
    fs.writeFileSync(
      path.join(dir, 'page.ts'),
      "import type { X } from './types';\nimport data from './data.json';\nexport { data };\n"
    );
    const page = split.readSource(dir, path.join(dir, 'page.ts'));
    expect(page.next).toEqual([path.join(dir, 'data.json')]);
    expect(split.readSource(dir, path.join(dir, 'data.json')).literals).toEqual([
      'landing.meta.title',
    ]);
    fs.rmSync(dir, { recursive: true });
  });
});

describe('the keys the code asks for', () => {
  const calls = sources().flatMap(translatedKeys);

  it('reads hundreds of t() calls', () => {
    expect(calls.length).toBeGreaterThan(1000);
  });

  it('exist in Spanish and in English (a dynamic key: some key starts that way)', () => {
    const missing = calls.filter(({ key, prefix }) =>
      [ES, EN].some((messages) =>
        prefix ? !Object.keys(messages).some((k) => k.startsWith(key)) : !(key in messages)
      )
    );
    expect(missing).toEqual([]);
  });
});
