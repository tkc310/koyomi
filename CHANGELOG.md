# Changelog

このファイルは [release-please](https://github.com/googleapis/release-please) が更新します（ADR-0021）。

## [1.0.1](https://github.com/tkc310/koyomi/compare/v1.0.0...v1.0.1) (2026-10-24)


### ドキュメント

* **loi-krathong:** 仏足跡の言い伝えの結末を直す ([#49](https://github.com/tkc310/koyomi/issues/49)) ([2540f06](https://github.com/tkc310/koyomi/commit/2540f06023923d48b8cf9b136efbb910586bcef2))
* **loi-krathong:** 仏足跡四つの言い伝えを足す ([#47](https://github.com/tkc310/koyomi/issues/47)) ([e89daff](https://github.com/tkc310/koyomi/commit/e89daff6e9aef75b30eb14e862b772b98c61c67b))

## 1.0.0 (2026-10-22)

最初の公開版です（https://koyomi.tkc310.com）。

### 新機能

* タイ太陰暦の計算エンジン（閏月・閏日、公式告示による年型の上書き）と、公式の日付での検証（ADR-0008・0009）
* 行事の一覧・月ごとのカレンダー・行事の詳細ページ（ワンプラ、マーカ・ウィサーカ・アッタミー・アーサーラハ・ブーチャー、カオパンサー、オークパンサー、トートカティン、ロイクラトン、ソンクラーン）
* タンブン（功徳を積む行い）の説明ページとイラスト
* カレンダーアプリに取り込める ICS（calendar.ics）
* ホーム画面への追加とオフライン表示（PWA、ADR-0013）
* SEO（canonical・OGP・JSON-LD・sitemap.xml・robots.txt）と llms.txt（ADR-0017・0019・0020）
* Cloudflare Workers への自動デプロイ（ADR-0016）
