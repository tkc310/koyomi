// CI はローカルと同じ make のコマンドだけを走らせる。act が無くても、手元の make で CI の手順を再現できる
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vite-plus/test';

const workflow = readFileSync(join(import.meta.dirname, '../.github/workflows/ci.yml'), 'utf8');
const runs = [...workflow.matchAll(/^\s*(?:-\s+)?run:\s*(.*)$/gm)].map((m) => m[1].trim());

it('ワークフローの run は make のコマンドだけ', () => {
  expect(runs.length).toBeGreaterThan(0);
  // 複数行（| や >）にすると 1 行目しか見えないので、1 行で書く
  for (const run of runs) expect(run).toMatch(/^make [a-z-]+$/);
});

it('依存を入れ、check・test・build・verify を別々の step で走らせる', () => {
  expect(runs).toEqual([
    'make tools',
    'make install',
    'make check',
    'make test',
    'make build',
    'make verify',
  ]);
});

it('.tool-versions の版を使う', () => {
  expect(workflow).toContain('jdx/mise-action');
  expect(workflow).not.toMatch(/node-version:|version:\s*\d/);
});

it('Node.js 26.13.0 と @types/node のメジャーを揃える', () => {
  const root = join(import.meta.dirname, '..');
  const tools = readFileSync(join(root, '.tool-versions'), 'utf8');
  expect(tools).toMatch(/^nodejs 26\.13\.0$/m);
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    devDependencies: { '@types/node': string };
  };
  expect(pkg.devDependencies['@types/node']).toMatch(/^\^26\./);
});

// GitHub は Node 20 で動くアクションを廃止する。Node 24 で動く版より古いものに戻さない
it('どのワークフローも Node 24 で動く版のアクションを使う', () => {
  const minimum: Record<string, number> = {
    'actions/checkout': 5,
    'actions/cache': 5,
    'jdx/mise-action': 3,
    'googleapis/release-please-action': 5,
  };
  const dir = join(import.meta.dirname, '../.github/workflows');
  for (const file of readdirSync(dir)) {
    const text = readFileSync(join(dir, file), 'utf8');
    for (const [, name, major] of text.matchAll(/uses:\s*([\w.-]+\/[\w.-]+)@v(\d+)/g)) {
      expect(minimum[name!], `${file}: ${name} の最低版が未登録`).toBeDefined();
      expect(Number(major), `${file}: ${name}@v${major}`).toBeGreaterThanOrEqual(minimum[name!]!);
    }
  }
});
