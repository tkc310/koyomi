# 開発とリリースの手順

タイ仏教行事カレンダー（koyomi）に手を入れるときの手順です。使い方と概要は [README](./README.md) を見てください。

## 必要なもの

- [mise](https://mise.jdx.dev/) か [asdf](https://asdf-vm.com/)。Node.js と pnpm の版は `.tool-versions` だけで決めます（ADR-0002）
- Git と、PR を作るなら [GitHub CLI](https://cli.github.com/)（`gh`）

```sh
make setup   # .tool-versions の Node.js・pnpm を入れて、依存をインストールする
make dev     # http://localhost:4321
```

## コマンド

`make` で一覧を表示します。どのコマンドも [Vite+](https://viteplus.dev/)（`vp`）を通して動きます。
`vp` をグローバルに入れていなくても、プロジェクト内の `vite-plus` を使います（`make VP=vp ...` で差し替え可）。

| make                           | 実体                                           | 内容                                                              |
| :----------------------------- | :--------------------------------------------- | :---------------------------------------------------------------- |
| `make setup`                   | `mise install` / `asdf install` + `vp install` | 初回の準備                                                        |
| `make install`                 | `vp install`                                   | 依存を入れる                                                      |
| `make dev`                     | `vp run dev` → `astro dev`                     | 開発サーバー                                                      |
| `make build`                   | `vp run build` → `astro build`                 | `dist/` に静的ビルド                                              |
| `make preview`                 | `vp run preview` → `astro preview`             | ビルドの確認                                                      |
| `make check`                   | `vp check` + `vp run typecheck`                | fmt・lint・型                                                     |
| `make fix`                     | `vp check --fix`                               | fmt・lint の自動修正                                              |
| `make test`                    | `vp test`                                      | テスト                                                            |
| `make test-watch`              | `vp test watch`                                | テストの監視実行                                                  |
| `make verify`                  | `make build` + `dist/calendar.ics` の確認      | ビルドした ICS が VCALENDAR で VEVENT を含むか                    |
| `make ui-add C="heading card"` | `vp dlx shadcn@latest add @8341/...`           | 8341-ui の部品を足す                                              |
| `make icons`                   | `node scripts/icons.ts`                        | 法輪の favicon・PWA のアイコンを作り直す（macOS の sips）         |
| `make brand`                   | `python3 scripts/brand/*.py`                   | ロゴ（`logo.svg`・`logo.png`）と OGP バナー（`og.png`）を作り直す |
| `make deploy`                  | `make verify` + `pnpm dlx wrangler@4.x deploy` | Cloudflare Workers にデプロイ（ADR-0016）                         |
| `make clean`                   | `rm -rf dist .astro`                           | 成果物を消す                                                      |

`vp dev` / `vp build` は素の Vite を動かすので使いません。Astro のコマンドは `package.json` の scripts に集約し、`vp run <script>` で呼びます。

## 変更の進め方

### ブランチと PR

1. `main` から作業ブランチを切る（`feat/...`・`fix/...`・`chore/...`・`docs/...`）
2. **着手したらまず空コミットで draft PR を作り、タイトルに課題名を入れる**。他の人やエージェントへの「この課題は取った」という印です。着手前に [`docs/improvement/backlog.md`](./docs/improvement/backlog.md) と open な PR を見て、同じ課題に手を付けないでください

   ```sh
   git switch -c fix/xxx
   git commit --allow-empty -m "chore: ○○に着手（ロック）"
   git push -u origin HEAD && gh pr create --draft --fill
   ```

3. 1 PR は 1 タスクにする。PR の向き先は `main`
4. CI が通ったら draft を外してレビューを受け、マージする

`main` はブランチ保護で、CI（`ci` のチェック）が通らないとマージできません。CI は手元と同じ `make` のコマンドだけを走らせます（`make tools` → `make install` → `make check` → `make test` → `make build` → `make verify`。`tests/ci.test.ts` が確かめています）。手元で同じ順に通せば、CI も通ります。

### コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/ja/)（`type(scope): 説明`）で書きます。説明は日本語でも英語でも構いません。

```text
feat(pages): タンブンの説明ページ /tambun
fix(sw): do not precache Cloudflare _headers and _redirects
docs(seo): ADR-0017 and keep sitemap.xml out of the service worker cache
chore(deploy): use wrangler.json without comments
```

よく使う type は `feat`・`fix`・`docs`・`test`・`chore`・`style`・`refactor`・`ci` です。

PR は squash でマージするので、**PR のタイトルがそのまま `main` のコミットメッセージになり、リリースノートの元になります**。PR のタイトルも Conventional Commits で書いてください。リリースノートに載るのは `feat`（新機能）・`fix`（不具合の修正）・`perf`（性能の改善）・`docs`（ドキュメント）で、ほかの type は載りません。互換性の無い変更は `feat!:` のように `!` を付けるか、本文に `BREAKING CHANGE:` を書きます。

### テストを先に書く

実装より先にテストを書き、落ちることを確かめてから実装します。

- 暦の計算: `tests/core/`
- ビルドしたページ・`calendar.ics`・`sitemap.xml`: `tests/pages.test.ts`（一時ディレクトリでビルドして確かめる）
- 日付の正解データ: `tests/fixtures/official-dates.json`。**出典 URL を必ず付けます**（[`tests/fixtures/README.md`](./tests/fixtures/README.md)）

### ドメインのルール

詳しくは [`CLAUDE.md`](./CLAUDE.md) にあります。特に次の点に気をつけてください。

- 行事名は「カタカナ（日本語訳）/ ローマ字」で書く。例: ワンプラ（布薩日）/ Wan Phra
- **サイト・ICS・告知文にタイ文字を出さない**（ADR-0012）。タイ語は調査メモ（`docs/events/`）にだけ書く。テストが確かめます
- 太陰暦の行事はタイ太陰暦から計算する。ソンクラーンだけは太陽暦の 4/13〜15 に固定
- 対象は原始仏教にとって重要な行事に限る。例外としてロイクラトンとソンクラーンを「民間行事」として扱う（ADR-0007）
- **対象の行事を足す・外す変更は、PR を作ったうえでマージ前に必ずメンテナーに確認する**。判断は [`docs/events/candidates.md`](./docs/events/candidates.md) に残す

### 設計判断（ADR）

値や方針を決めた・変えたときは、[`docs/decisions/`](./docs/decisions/README.md) に 1 判断 1 ファイルで ADR を足します。

- ファイル名は `NNNN-短い説明.md`（連番）。テンプレートは `docs/decisions/README.md` にあります
- 古い ADR は消さず、状態を「廃止（→ NNNN）」や「一部廃止（→ NNNN）」にして新しい ADR を足す
- `docs/decisions/README.md` の一覧表にも 1 行足す

### 改善ログ

変更したら [`docs/improvement/log.md`](./docs/improvement/log.md) の表の**先頭**に 1 行記録します（1 改善 1 行）。「再発防止」の列には、足したテスト・検査・ルール・手順を書きます。進め方は [`docs/improvement-loop.md`](./docs/improvement-loop.md) にあります。

### 整形ツールの注意

- `make check` の `vp check` は、TypeScript・`.astro`・JSON・YAML・Markdown の書式も確かめます。落ちたら `make fix` で直してからコミットしてください
- **Markdown の表は列の幅を揃えます**（全角の文字は幅 2）。表に行を足したら、`make fix` で揃え直してください
- 1 行は 100 桁（全角は 2 桁）に収まるように整形されます。長い正規表現などは変数に分けると安定します
- `CLAUDE.md` は整形の対象外です（`vite.config.ts` の `fmt.ignorePatterns`）
- 型エラーは `astro check`（`make check` の後半）だけが報告します（ADR-0010）
- 依存のインストール時のスクリプトは、`pnpm-workspace.yaml` の `allowBuilds` に書いたものだけが動きます。新しく許すときは理由を ADR かコメントに書いてください

## リリース

公開先は https://koyomi.tkc310.com です。Cloudflare Workers の静的アセットで `dist/` を配ります（ADR-0016）。

### 通常の流れ

1. PR を `main` にマージする
2. `main` の CI（`.github/workflows/ci.yml`）が走る
3. CI が通ると、Deploy ワークフロー（`.github/workflows/deploy.yml`）が CI の確かめたコミットで `make deploy` を走らせる
4. Actions の画面で Deploy が成功したことを確かめ、サイトを開いて確認する

Deploy ワークフローは、Actions の画面から手動で（`workflow_dispatch`、`main` のときだけ）走らせることもできます。

### バージョンとリリースノート

バージョンとリリースノートは [release-please](https://github.com/googleapis/release-please) が自動で作ります（`.github/workflows/release.yml`、ADR-0021）。

1. `main` に `feat`・`fix` などの PR が入るたびに、Release ワークフローが「リリースの PR」（`chore(main): release 1.2.0` のような題）を作り直す。中身は `CHANGELOG.md` と `package.json`・`.release-please-manifest.json` の版の更新
2. リリースしたいときに、その PR をマージする
3. タグ（`v1.2.0`）と GitHub のリリース（リリースノート）ができる

版の上げ方は [Semantic Versioning](https://semver.org/lang/ja/) です。`fix` は 1.0.**1**、`feat` は 1.**1**.0、互換性の無い変更（`!`・`BREAKING CHANGE:`）は **2**.0.0 になります。サイトのデプロイはリリースと関係なく、`main` へのマージのたびに行われます。

リリースの PR は、そのままだと GITHUB_TOKEN で作られるため CI が動かず、必須のチェックが通りません。次のどちらかにしてください。

- secrets に `RELEASE_PLEASE_TOKEN`（このリポジトリの Contents と Pull requests に書き込みを許した fine-grained personal access token）を登録する（おすすめ）。その PR では CI が動きます
- 管理者としてチェックを飛ばしてマージする（ブランチ保護は管理者に適用していません）

GitHub Actions が PR を作れるよう、リポジトリの設定で「Allow GitHub Actions to create and approve pull requests」を有効にしておきます。

```sh
gh api -X PUT repos/tkc310/koyomi/actions/permissions/workflow \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true
gh secret set RELEASE_PLEASE_TOKEN   # 任意。fine-grained token を貼り付ける
```

### 必要な設定

GitHub のリポジトリの secrets に次の 2 つが要ります。

| secret                  | 中身                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare の API トークン（「Edit Cloudflare Workers」のテンプレート）                                     |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare のアカウント ID                                                                                  |
| `BOT_API_TOKEN`         | タイ中央銀行の API キー（https://portal.api.bot.or.th/ の「Others」製品。毎月の告示の照合に使う。ADR-0023） |
| `RELEASE_PLEASE_TOKEN`  | リリースの PR を作る fine-grained token（任意。ADR-0021）                                                   |

公開先の URL は `astro.config.mjs` の `site`、独自ドメインは `wrangler.json` の `routes` にあります。`www.koyomi.tkc310.com` も独自ドメインにしてあり（証明書のため）、Cloudflare のダッシュボードの Redirect Rule で `koyomi.tkc310.com` へ 301 で転送します（ADR-0018）。別の URL でビルドするとき（プレビューなど）は、環境変数 `SITE_URL` で `site` を上書きできます。

### 手元からデプロイする

```sh
pnpm dlx --allow-build=esbuild --allow-build=workerd wrangler@4 login   # 初回だけ。ブラウザで Cloudflare にサインインする
make deploy                                                             # build → verify → wrangler deploy
```

`pnpm dlx` は、wrangler が使う esbuild と workerd のインストール時のスクリプトを `--allow-build` で許さないと止まります（`ERR_PNPM_IGNORED_BUILDS`）。`make deploy` は付けてあります。

`make deploy` の wrangler の版は `Makefile` の `WRANGLER_VERSION` で固定し、一度取ってきたものを使い回します（ADR-0024）。版を上げるときはこの値を書き換えます。

### ロールバック

公開した版に問題があったら、Cloudflare の前の版に戻せます。

```sh
WRANGLER="pnpm dlx --allow-build=esbuild --allow-build=workerd wrangler@4"
$WRANGLER deployments list   # これまでのデプロイを見る
$WRANGLER rollback           # 1 つ前の版に戻す（版の ID を渡すとその版に戻す）
```

ロールバックは一時しのぎです。原因を直した PR を `main` にマージすると、次のデプロイで直った版になります。

## 定期作業とスキル

定期作業は年 1 回、毎年 12 月に翌年分の公式告示を照合してデプロイするだけです（ADR-0015）。手順は [`docs/operations.md`](./docs/operations.md) にあります。

繰り返す作業は、リポジトリのスキル（`.claude/skills/`）にしてあります。

| スキル                | 使うとき                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| `check-announcements` | 公式告示（祝日・仏教行事日）で、正解データにまだ無い日付が出たか確かめる |
| `event-notice`        | 今日から N 日以内の行事の SNS 告知文を下書きする                         |
| `improve`             | バックログや指摘を 1 件直し、再発防止を足して改善ログに記録する          |

## AI エージェントと進めるとき

エージェントが読むファイルと任せ方は [`AGENTS.md`](./AGENTS.md) と [`docs/ai-agents.md`](./docs/ai-agents.md) にまとめています。
