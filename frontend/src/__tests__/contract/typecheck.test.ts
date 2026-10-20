/**
 * ts-jest only transpiles here (`isolatedModules`), so the type-level contract in
 * `answers.test.ts` would only be checked by `tsc`. This runs the compiler on it from Jest too,
 * so `npm test` fails when the API and the app types stop agreeing.
 */
import { resolve } from 'path';
import ts from 'typescript';

const root = resolve(__dirname, '../../..');

it('the API answers still fit the types of the app (and the other way round)', () => {
  const config = ts.getParsedCommandLineOfConfigFile(
    resolve(root, 'tsconfig.json'),
    { noEmit: true },
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (d) => {
        throw new Error(String(d.messageText));
      },
    }
  )!;
  const program = ts.createProgram({
    rootNames: [resolve(__dirname, 'answers.test.ts')],
    options: config.options,
  });
  const errors = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName.includes('/__tests__/contract/'))
    .map((d) => {
      const { line } = d.file!.getLineAndCharacterOfPosition(d.start ?? 0);
      return `${d.file!.fileName.split('/contract/')[1]}:${line + 1} ${ts
        .flattenDiagnosticMessageText(d.messageText, '\n')
        .slice(0, 600)}`;
    });
  expect(errors).toEqual([]);
}, 120_000);
