# 0024 コマンドと CI の実行時に外へ出る通信を減らす

- 日付: 2026-11-08
- 状態: 採用（ADR-0016 の「wrangler をデプロイのたびに取ってくる」を改める）

## 背景

利用者から、CI/CD やコマンドの実行時に外部サイトへアクセスしているか、しているなら取得したデータをリポジトリに置くなどしてアクセスを最小にしてほしい、と求められた。`make check`・`make test`・`make build` を strace と Node.js の `fetch`・DNS のフックで調べると、次の通信があった。

| どこで                                      | 行き先                                      | 頻度                                                  |
| ------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| `make check`・`make test`・`make build`     | `telemetry.astro.build`（Astro の利用状況） | astro の sync・check・build のたび（CI でも送られる） |
| `make deploy`                               | npm（`pnpm dlx wrangler@4`、約 220 MB）     | デプロイのたび（CI の runner は毎回空）               |
| `make deploy`                               | wrangler の利用状況と、npm への更新の確認   | デプロイのたび                                        |
| `make announcements`（Announcements、毎月） | タイ中央銀行の API                          | 毎月。照合が目的なので外せない                        |
| `make tools`・`make install`（CI）          | mise・npm                                   | キャッシュ（mise-action・pnpm のストア）が外れたとき  |

行事の日付や出典などのデータを、ビルドやテストの最中に外から取ってくるところは無かった。正解データ（`tests/fixtures/official-dates.json`）と行事の資料はすでにコミットしてある。

## 決定

- `Makefile` で `ASTRO_TELEMETRY_DISABLED=1` を export し、どの make のコマンドでも Astro の利用状況を送らない
- `Makefile` で `WRANGLER_SEND_METRICS=false` と `WRANGLER_HIDE_BANNER=true` を export する。バナーを出さないと、wrangler は起動時の更新の確認（npm への問い合わせ）もしない
- wrangler の版を `Makefile` の `WRANGLER_VERSION` で固定し、`pnpm dlx` のキャッシュの期限（`dlx-cache-max-age`）を 1 年にする。Deploy ワークフローは `~/.cache/pnpm/dlx` を `actions/cache` で保存し、キーに `Makefile` のハッシュを使う。版を変えたときだけ npm から取り直す
- タイ中央銀行の API は、告示を照らすこと自体が目的なので残す（ADR-0023）。依存と道具の取得はこれまでどおりキャッシュに任せる

## 理由

- 利用状況の送信と更新の確認は、ビルドの結果に何も足さない
- wrangler を依存（`devDependencies`）に足すと、デプロイしない CI の実行やクラウドの開発セッションのたびに workerd などの大きなバイナリを入れることになり、かえって通信が増える。`pnpm dlx` のまま取得物をキャッシュすれば、デプロイのときにしか要らないという ADR-0016 の考えも保てる
- `make deploy` の中で版とキャッシュの期限を決めるので、手元と CI の手順は同じまま（ADR-0002）

## 影響・トレードオフ

- wrangler は自動では新しい版にならない。上げるときは `WRANGLER_VERSION` を書き換える（`make deploy` の前に `pnpm view wrangler@4 version` で確かめる）
- `make` を通さずに `pnpm build` などを直接動かすと、Astro の利用状況は送られる。コマンドは `make` に集約しているので（ADR-0002）それで足りるとした
- `tests/deploy.test.ts` で、環境変数の export・版の固定・キャッシュの保存を確かめる
