#!/bin/bash
# Полный прогон тестов: unit (node), бэкенд (pytest), e2e Playwright (рейтинг/админка, мобильные), e2e Puppeteer (игра с нуля до концовки).
set -e
cd "$(dirname "$0")/.."
PY=${SEG_PY:-/workspace/venv-test/bin/python}
echo "== node --test (логика, звук, счёт)"; node --test tests/ 2>&1 | grep -E "^# (tests|pass|fail)"
echo "== pytest (бэкенд)"; (cd backend && $PY -m pytest -q 2>&1 | tail -2)
echo "== OfflineAudioContext"; node tests/audio_offline.js | tail -2
echo "== Playwright: звук на телефонах (Android Chromium + iPhone WebKit)"; node tests/pw/audio_mobile.pw.js 2>&1 | grep -E "✗|ПРОВАЛЕНО|ВСЕ ПРОВЕРКИ"
echo "== Playwright: рейтинг/админка"; node tests/pw/rating_admin.pw.js 2>&1 | grep -E "✗|ПРОВАЛЕНО|ВСЕ ПРОВЕРКИ"
echo "== Playwright: мобильные вьюпорты"; node tests/pw/mobile_visual.pw.js 2>&1 | grep -E "✗|ПРОВАЛЕНО|ВСЕ ПРОВЕРКИ"
echo "== Совместимость: Android Chromium + iPhone WebKit, сбои сети/хранилища/звука, экран ошибки (сборка dist)"; node tests/compat/boot.pw.js 2>&1 | grep -E "✗|ПРОВАЛЕНО|ВСЕ ПРОВЕРКИ"
echo "== Puppeteer: прохождение с нуля (desktop+mobile)"; node tests/e2e.js 2>&1 | grep -E "✗|ПРОВАЛЕНО|ВСЕ ПРОВЕРКИ"
