// Cloudflare Workers の静的アセットへのデプロイ（ADR-0016）。
// dist/ をそのまま配る。Worker のスクリプトと Astro のアダプターは使わない
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

const read = (f: string) => readFileSync(join(import.meta.dirname, '..', f), 'utf8');

describe('Cloudflare Workers へのデプロイ', () => {
  it('wrangler.json は dist/ を静的アセットとして配り、Worker のスクリプトを持たない', () => {
    const config = read('wrangler.json');
    expect(config).toMatch(/"name":\s*"koyomi"/);
    expect(config).toMatch(/"compatibility_date":\s*"\d{4}-\d{2}-\d{2}"/);
    expect(config).toMatch(/"directory":\s*"\.\/dist"/);
    expect(config).not.toMatch(/"main":/);
  });

  it('_headers で Service Worker を毎回確かめさせ、ICS を text/calendar で返す', () => {
    const headers = read('public/_headers');
    expect(headers).toMatch(/^\/sw\.js\n\s+Cache-Control: no-cache$/m);
    expect(headers).toMatch(/^\/calendar\.ics\n\s+Content-Type: text\/calendar; charset=utf-8$/m);
  });

  it('公開先は koyomi.tkc310.com（site と独自ドメイン）', () => {
    const site = /site: process\.env\.SITE_URL \|\| 'https:\/\/koyomi\.tkc310\.com'/;
    expect(read('astro.config.mjs')).toMatch(site);
    const domain = /"pattern": "koyomi\.tkc310\.com",\s*"custom_domain": true/;
    expect(read('wrangler.json')).toMatch(domain);
  });

  // www は 2 階層目のサブドメインで、Universal SSL の証明書が効かない。独自ドメインにして証明書を作らせ、
  // ダッシュボードの Redirect Rule で koyomi.tkc310.com へ 301 で送る（ADR-0018）
  it('www.koyomi.tkc310.com も独自ドメインにする（証明書のため。転送は Redirect Rule）', () => {
    const www = /"pattern": "www\.koyomi\.tkc310\.com",\s*"custom_domain": true/;
    expect(read('wrangler.json')).toMatch(www);
  });

  it('デプロイは main の CI が通った後にだけ動き、手元と同じ make deploy を走らせる', () => {
    const workflow = read('.github/workflows/deploy.yml');
    expect(workflow).toMatch(/workflow_run:\s*\n\s+workflows: \[CI\]\s*\n\s+types: \[completed\]/);
    expect(workflow).toMatch(/branches: \[main\]/);
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    const runs = [...workflow.matchAll(/^\s*run:\s*(.*)$/gm)].map((m) => m[1]!.trim());
    expect(runs).toEqual(['make tools', 'make install', 'make deploy']);
    expect(workflow).toContain('CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}');
    expect(workflow).toContain('CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}');
  });

  // 表示する範囲（今年と来年）はビルドした日で決まるので、年が変わったら作り直す（ADR-0022）。
  // cron は UTC。日本時間の 1 月 1 日 0 時 5 分は 12 月 31 日 15 時 5 分（UTC）で、TZ を日本にして年を数える
  it('毎年 1 月 1 日（日本時間）に、main をビルドし直してデプロイする', () => {
    const workflow = read('.github/workflows/deploy.yml');
    expect(workflow).toMatch(/schedule:\s*\n\s+- cron: '5 15 31 12 \*'/);
    expect(workflow).toContain("github.event_name == 'schedule'");
    expect(workflow).toMatch(/TZ: Asia\/Tokyo/);
  });

  // 公開リポジトリでは、60 日動きが無いと定期実行が止まる。毎月 API で有効にし直す
  it('毎月、定期実行のワークフローを有効にし直す', () => {
    const workflow = read('.github/workflows/keepalive.yml');
    expect(workflow).toMatch(/schedule:\s*\n\s+- cron: '\S+ \S+ 1 \* \*'/);
    expect(workflow).toMatch(/actions: write/);
    expect(workflow).toContain('gh workflow enable deploy.yml');
    expect(workflow).toContain('gh workflow enable keepalive.yml');
  });

  it('make deploy は build と verify の後に wrangler で送る', () => {
    const makefile = read('Makefile');
    expect(makefile).toMatch(/^deploy: build verify .*\n\t\$\(WRANGLER\) deploy$/m);
    expect(makefile).toMatch(/^WRANGLER := .*pnpm dlx .*wrangler@\$\(WRANGLER_VERSION\)$/m);
  });

  // 実行時に外へ出る通信を減らす（ADR-0024）
  it('wrangler は版を固定し、取得物を CI で保存して使い回す', () => {
    const makefile = read('Makefile');
    expect(makefile).toMatch(/^WRANGLER_VERSION := 4\.\d+\.\d+$/m);
    expect(makefile).toMatch(/^WRANGLER := pnpm_config_dlx_cache_max_age=\d+ pnpm dlx /m);
    const workflow = read('.github/workflows/deploy.yml');
    expect(workflow).toMatch(/path: ~\/\.cache\/pnpm\/dlx\n\s+key: .*hashFiles\([^)]*'Makefile'/);
    // キャッシュはデプロイより前に戻す
    expect(workflow.indexOf('~/.cache/pnpm/dlx')).toBeLessThan(
      workflow.indexOf('run: make deploy'),
    );
  });

  it('Astro と wrangler の利用状況の送信と更新の確認を止める', () => {
    const makefile = read('Makefile');
    expect(makefile).toMatch(/^export ASTRO_TELEMETRY_DISABLED := 1$/m);
    expect(makefile).toMatch(/^export WRANGLER_SEND_METRICS := false$/m);
    expect(makefile).toMatch(/^export WRANGLER_HIDE_BANNER := true$/m);
  });

  it('wrangler を入れるときに esbuild と workerd のビルドを許す（pnpm の allowBuilds）', () => {
    const workspace = read('pnpm-workspace.yaml');
    expect(workspace).toMatch(/^allowBuilds:\n(?:\s+.*\n)*?\s+esbuild: true/m);
    expect(workspace).toMatch(/^allowBuilds:\n(?:\s+.*\n)*?\s+workerd: true/m);
  });
});
