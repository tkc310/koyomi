# 0016 Cloudflare Workers の静的アセットで配り、main の CI が通ったらデプロイする

- 日付: 2026-10-22
- 状態: 採用（wrangler の版の固定と取得物のキャッシュは ADR-0024 で改めた）

## 背景

サイトは静的出力（`dist/`）で、デプロイ先が決まっていなかった。公開先のドメインは `koyomi.tkc310.com` に決まった。OGP の `og:image` を絶対 URL にするための `site` も未設定だった（ADR-0013 以降のバックログ）。利用者から Cloudflare Workers に載せる手順を求められ、GitHub に Cloudflare のトークンを登録してもらった。

## 決定

- Cloudflare Workers の静的アセットで `dist/` をそのまま配る（`wrangler.json`）。Worker のスクリプト（`main`）と `@astrojs/cloudflare` のアダプターは使わない
- ヘッダーは `public/_headers` で決める。`_headers` は配られない（404）ので、Service Worker の保存の対象から外す（`src/integrations/service-worker.ts`）。`sw.js` は `Cache-Control: no-cache`（古い Service Worker を残さない）、`calendar.ics` は `text/calendar; charset=utf-8`、`manifest.webmanifest` は `application/manifest+json`
- デプロイは `make deploy`（`build` と `verify` の後に `pnpm dlx wrangler@4 deploy`）。wrangler は依存に足さず、その場で取ってくる。wrangler が使う esbuild と workerd のインストール時のスクリプトは `pnpm-workspace.yaml` の `allowBuilds` で許す
- `.github/workflows/deploy.yml` は、main への push で CI が通ったときだけ、CI が確かめたコミットで `make deploy` を走らせる。トークンは secrets の `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID`
- 公開先は `https://koyomi.tkc310.com`。`astro.config.mjs` の `site` に書き（`SITE_URL` で上書きできる）、`wrangler.json` の `routes` に独自ドメイン（`custom_domain: true`）として書く。`tkc310.com` のゾーンが同じアカウントにあれば、DNS と証明書も wrangler が用意する。設定はコメントの無い `wrangler.json` にする（整形の結果が揺れない）

## 理由

- 静的なファイルだけなので、Worker のスクリプトもアダプターも要らない。Cloudflare の静的アセットは無料の範囲で配れる
- wrangler を依存に足すと、`pnpm-lock.yaml` と、手元と CI のインストールが重くなる。使うのはデプロイのときだけなので `pnpm dlx` にした
- CI と手元で同じ `make deploy` を使うと、CI の手順を手元で再現できる（ADR-0002、`tests/ci.test.ts` と同じ考え方）
- `workflow_run` で CI の成功を待つので、検査に落ちたコミットは配られない
- 独自ドメインを `wrangler.json` に書くと、DNS のレコードと証明書を wrangler が用意し、設定がリポジトリに残る

## 影響・トレードオフ

- `pnpm dlx wrangler@4` は、デプロイのたびに wrangler を取ってくる。版は major（4）までしか固定しない
- `routes` の独自ドメインは、`tkc310.com` のゾーンがデプロイに使う Cloudflare アカウントにあることが前提。無いとデプロイが失敗する
- Void（VoidZero）は使わない。バックログの「Cloudflare（Void）へのデプロイ手順」はこれで閉じる
- `tests/deploy.test.ts` で、`wrangler.json`・`_headers`・`site`・ワークフロー・`make deploy`・`allowBuilds` を確かめる
