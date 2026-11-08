# タイ仏教行事カレンダーの開発・運用コマンド。`make` で一覧を表示する。
# 中身は Vite+（vp）を呼ぶだけ。Astro のコマンドは package.json の scripts に集約している。

.DEFAULT_GOAL := help
SHELL := /bin/bash

# vp をグローバルに入れていなくても動くよう、プロジェクト内の vite-plus を使う
VP ?= pnpm exec vp

# 実行時に外へ出る通信を減らす（ADR-0024）。
# Astro はビルド・型検査のたびに telemetry.astro.build へ利用状況を送る。wrangler は利用状況と更新の確認を送る
export ASTRO_TELEMETRY_DISABLED := 1
export WRANGLER_SEND_METRICS := false
export WRANGLER_HIDE_BANNER := true

# デプロイに使う wrangler。版を固定し、pnpm dlx のキャッシュ（~/.cache/pnpm/dlx）を期限なしで使い回す。
# CI は Deploy ワークフローがこのキャッシュを保存するので、版を変えたときだけ取りに行く（ADR-0024）
WRANGLER_VERSION := 4.158.0
WRANGLER := pnpm_config_dlx_cache_max_age=525600 pnpm dlx --allow-build=esbuild --allow-build=workerd wrangler@$(WRANGLER_VERSION)

# 引数（例: make ui-add C="heading card"）
C ?=

.PHONY: help setup tools install dev build preview check fix test test-watch verify deploy announcements ui-add icons brand clean

##@ はじめる

help: ## コマンドの一覧を表示する
	@awk 'BEGIN { FS = ":.*## " } \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } \
		/^[a-zA-Z0-9_-]+:.*## / { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

setup: tools install ## 初回の準備（道具と依存を入れる）

tools: ## .tool-versions の Node.js・pnpm を入れる（mise か asdf）
	@if command -v mise >/dev/null 2>&1; then mise install; \
	elif command -v asdf >/dev/null 2>&1; then asdf install; \
	else echo "mise か asdf を入れてください"; exit 1; fi

install: ## 依存を入れる
	$(VP) install

##@ 開発

dev: ## 開発サーバーを起動する（http://localhost:4321）
	$(VP) run dev

build: ## 静的サイトを dist/ にビルドする
	$(VP) run build

preview: ## ビルドしたサイトを手元で確認する
	$(VP) run preview

##@ 検査・テスト

check: ## 生成型を作り（astro sync）、fmt・lint（vp check）と型（astro check。ADR-0010）
	$(VP) run sync
	$(VP) check
	$(VP) run typecheck

fix: ## fmt と lint の自動修正
	$(VP) check --fix

test: ## テストを実行する
	$(VP) test

test-watch: ## テストを監視モードで実行する
	$(VP) test watch

verify: build ## ビルドし、dist/calendar.ics が VCALENDAR で VEVENT を含むことを確かめる
	@test -f dist/calendar.ics || { echo "dist/calendar.ics がありません"; exit 1; }
	@[ "$$(head -c 15 dist/calendar.ics)" = BEGIN:VCALENDAR ] || { echo "dist/calendar.ics が BEGIN:VCALENDAR で始まりません"; exit 1; }
	@n=$$(grep -c '^BEGIN:VEVENT' dist/calendar.ics); [ "$$n" -ge 1 ] || { echo "dist/calendar.ics に VEVENT がありません"; exit 1; }; echo "dist/calendar.ics: VEVENT $$n 件"

announcements: ## タイ中央銀行の API で告示を暦の計算・正解データと照合する（BOT_API_TOKEN が要る。ADR-0023）
	node --import ./scripts/diff-pythaidate/resolve-ts.mjs scripts/announcements/check-bot.ts

deploy: build verify ## Cloudflare Workers にデプロイする（初回のログインは CONTRIBUTING.md の「リリース」。ADR-0016）
	$(WRANGLER) deploy

##@ UI

ui-add: ## 8341-ui の部品を足す（C="heading card"）
	@test -n "$(C)" || { echo 'C="部品名 ..." を指定してください（例: make ui-add C="heading card"）'; exit 1; }
	$(VP) dlx shadcn@latest add $(addprefix @8341/,$(C))

icons: ## favicon と PWA のアイコンを法輪の形から作り直す（macOS の sips を使う。ADR-0013）
	node scripts/icons.ts

brand: ## ロゴ（public/logo.svg・logo.png）と OGP バナー（public/og.png）を作り直す（python3・fontTools・playwright と Noto Sans CJK が要る）
	PYTHONDONTWRITEBYTECODE=1 python3 scripts/brand/logo.py
	PYTHONDONTWRITEBYTECODE=1 python3 scripts/brand/og.py

##@ 後片付け

clean: ## ビルドの成果物を消す（依存は残す）
	rm -rf dist .astro
