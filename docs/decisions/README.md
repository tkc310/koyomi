# 設計判断の記録（ADR）

値や方針を決めた・変えたときは、ここに 1 判断 1 ファイルで残します。ファイル名は `NNNN-短い説明.md`（番号は連番）。
後から方針を変えるときは、古い ADR を消さずに状態を「廃止（→ NNNN）」にし、新しい ADR を足します。

| #                                                | 判断                                                                                                  | 状態                   |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------- |
| [0001](./0001-astro-and-vite-plus.md)            | Astro を静的出力で使い、dev と build は Astro、fmt・lint・test は Vite+ に分ける                      | 採用                   |
| [0002](./0002-makefile-and-tool-versions.md)     | コマンドの入口を Makefile と `vp` に集め、ツールの版は `.tool-versions` だけで持つ                    | 採用                   |
| [0003](./0003-8341-ui-from-registry.md)          | デザインシステムに 8341-ui を shadcn レジストリ（v0.1.0 固定）で取り込む                              | 採用                   |
| [0004](./0004-improvement-loop.md)               | 改善ループ（バックログ・ログ・ADR・改善スキル）を置く                                                 | 採用                   |
| [0005](./0005-early-buddhist-events-only.md)     | 対象を原始仏教にとって重要な行事に限り、ロイクラトンとソンクラーンを外す                              | 廃止（→ 0007）         |
| [0006](./0006-japanese-translation-in-names.md)  | 行事名に日本語訳を加え「タイ語 / ローマ字 / カタカナ / 日本語訳」の 4 表記にする                      | 一部置き換え（→ 0012） |
| [0007](./0007-folk-events-as-exceptions.md)      | 原始仏教の基準は残し、ロイクラトンとソンクラーンを「民間行事」の例外として戻す                        | 採用                   |
| [0008](./0008-lunar-calendar-strategy.md)        | 太陰暦の行事日は暦法で年型を出して計算し、公式と食い違う年だけ年型を上書きする                        | 採用                   |
| [0009](./0009-compute-beyond-official-dates.md)  | 公式告示より先の年も、暦法で計算して出す（`supportedRange` を年表の全体にする）                       | 採用                   |
| [0010](./0010-typecheck-with-astro-check.md)     | 型検査は `astro check` に寄せ、tsgolint は型を使う lint 規則だけにする                                | 採用                   |
| [0011](./0011-format-astro-with-oxfmt.md)        | `.astro` は oxfmt（`vp fmt`）で丸ごと整形し、テンプレートの lint は足さない                           | 採用                   |
| [0012](./0012-japanese-only-display.md)          | サイトと配信からタイ文字を外し、由来と行うことを 1 行ずつ書いて一覧にも出す                           | 採用                   |
| [0013](./0013-mobile-first-and-pwa.md)           | スマホファーストのカード（ホバーできる広い画面だけポップアップ）と自前の Service Worker で PWA にする | 一部廃止（→ 0014）     |
| [0014](./0014-cards-inline-and-softer-radius.md) | 一覧のカードは PC でもカードの中に説明を出し、ボタン以外の角丸を弱くする                              | 採用                   |
| [0015](./0015-yearly-update.md)                  | 定期作業を年 1 回（12 月）にまとめ、ビルドした日に依存する表示（次の行事・次回）を外す                | 採用                   |
| [0016](./0016-deploy-cloudflare-workers.md)      | Cloudflare Workers の静的アセットで配り、main の CI が通ったら `make deploy` でデプロイする           | 採用                   |
| [0017](./0017-seo.md)                            | canonical・JSON-LD・sitemap.xml で検索エンジンに伝え、ヘッダーのロゴを logo.svg にする                | 採用                   |
| [0018](./0018-www-redirect.md)                   | www.koyomi.tkc310.com を独自ドメインにして証明書を作り、Redirect Rule で転送する                      | 採用                   |
| [0019](./0019-llms-txt.md)                       | AI 向けに llms.txt を置き、行事の由来・行うこと・日付まで書く                                         | 採用                   |
| [0020](./0020-rich-results.md)                   | リッチリザルト向けに Organization と Article の JSON-LD を出し、Event は出さない                      | 採用                   |
| [0021](./0021-release-please.md)                 | バージョンとリリースノートを release-please で自動化する                                              | 採用                   |
| [0022](./0022-yearly-rebuild.md)                 | 毎年 1 月 1 日に自動でビルドし直し、定期実行を毎月有効にし直す                                        | 採用                   |
| [0023](./0023-announcement-check.md)             | タイ中央銀行の API で告示を毎月照合し、知らせることがあれば Issue を立てる                            | 採用                   |
| [0024](./0024-minimize-external-access.md)       | コマンドと CI の実行時に外へ出る通信を減らす                                                          | 採用                   |

## テンプレート

```md
# NNNN タイトル

- 日付: YYYY-MM-DD
- 状態: 提案 / 採用 / 廃止（→ NNNN）

## 背景

## 決定

## 理由

## 影響・トレードオフ
```
