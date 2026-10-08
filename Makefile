.PHONY: help test lint check-gas render-pdf clean

help:
	@echo "可用指令列表："
	@echo "  make check-gas   - 使用 Node.js 沙盒驗證 src/*.gs JavaScript 語法"
	@echo "  make test        - 執行 pytest 自動化測試集"
	@echo "  make lint        - 執行 ruff 程式碼風格檢查"
	@echo "  make render-pdf  - 使用 Chrome Headless (Mac M6 純淨模式) 匯出 16:9 簡報 PDF"
	@echo "  make clean       - 清理暫存檔與快取目錄"

check-gas:
	@node -e "\
	const fs = require('fs');\
	const vm = require('vm');\
	const files = ['Config.gs', 'Telegram.gs', 'WebSearch.gs', 'Gemini.gs', 'QuotaManager.gs', 'Storage.gs', 'Main.gs'];\
	for (const file of files) {\
	  const code = fs.readFileSync('src/' + file, 'utf8');\
	  new vm.Script(code, { filename: file });\
	  console.log('✅ ' + file + ' 語法通過');\
	}\
	"

test:
	@if [ -f ".venv/bin/pytest" ]; then \
		.venv/bin/pytest -v tests/; \
	elif command -v uv >/dev/null 2>&1; then \
		uv run pytest -v tests/; \
	else \
		python3 -m pytest -v tests/; \
	fi

lint:
	@if [ -f ".venv/bin/ruff" ]; then \
		.venv/bin/ruff check .; \
	elif command -v uv >/dev/null 2>&1; then \
		uv run ruff check .; \
	else \
		ruff check .; \
	fi

render-pdf:
	@TMP_DIR=$$(mktemp -d); \
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
	  --headless=new \
	  --user-data-dir="$$TMP_DIR" \
	  --no-first-run \
	  --no-default-browser-check \
	  --disable-background-networking \
	  --disable-default-apps \
	  --disable-extensions \
	  --disable-sync \
	  --disable-translate \
	  --disable-gpu \
	  --no-pdf-header-footer \
	  --print-to-pdf="TelegramBot-AI智慧助理Bot改善版-成果簡報.pdf" \
	  "file://$$(pwd)/docs/slides.html"; \
	rm -rf "$$TMP_DIR"; \
	cp "TelegramBot-AI智慧助理Bot改善版-成果簡報.pdf" reports/; \
	cp "TelegramBot-AI智慧助理Bot改善版-成果簡報.pdf" docs/; \
	echo "✅ 簡報 PDF 渲染完成並同步至 reports/ 與 docs/！"

clean:
	@rm -rf .pytest_cache .ruff_cache __pycache__ tests/__pycache__
