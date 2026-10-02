#!/bin/bash
# Публикация игры на GitHub Pages: https://joliks.github.io/steam-engine-game/
#   Собирает прод-бандл (SEG_TARGET=ghpages: API-адрес вшит, без админки/_worker.js), кладёт его в ветку gh-pages (ветки 1.x и теги не трогает),
#   включает Pages через API (источник — gh-pages, /) и ждёт публикации.
# Нужен GITHUB_TOKEN (scope repo; в URL/remote/вывод не попадает — только одноразовый http.extraheader).
# Переменные: GH_REPO (JoLiKs/steam-engine-game), SEG_API_BASE (https://185-255-133-179.sslip.io/steam/api/g), GH_SITE (https://joliks.github.io/steam-engine-game/)
set -euo pipefail
cd "$(dirname "$0")/.."
: "${GITHUB_TOKEN:?нужен GITHUB_TOKEN}"
REPO=${GH_REPO:-JoLiKs/steam-engine-game}
export SEG_API_BASE=${SEG_API_BASE:-https://185-255-133-179.sslip.io/steam/api/g}
SITE=${GH_SITE:-https://joliks.github.io/steam-engine-game/}
OUT=$(mktemp -d /tmp/seg-ghp-XXXXXX); WT=$(mktemp -d /tmp/seg-ghw-XXXXXX); trap 'rm -rf "$OUT" "$WT"' EXIT
[ -d node_modules/esbuild ] || npm i --no-audit --no-fund >/dev/null 2>&1
SEG_TARGET=ghpages node scripts/build.mjs "$OUT/site"
[ ! -e "$OUT/site/admin" ] && [ ! -e "$OUT/site/_worker.js" ] || { echo "в gh-pages-сборку попала админка/воркер — стоп" >&2; exit 1; }
! grep -rIl "ADMIN_PASSWORD\|SEG_PROXY_SECRET\|proxy-secret" "$OUT/site" >/dev/null || { echo "в сборке секретоподобные строки — стоп" >&2; exit 1; }

AUTH="Authorization: Basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)"
git_t() { git -c "http.extraheader=$AUTH" "$@" 2>&1 | grep -vi 'token\|authorization' || true; }
URL="https://github.com/$REPO.git"
cd "$WT"; git init -q; git remote add origin "$URL"
if git -c "http.extraheader=$AUTH" ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git_t fetch -q --depth 1 origin gh-pages; git checkout -q -b gh-pages FETCH_HEAD
else git checkout -q --orphan gh-pages; fi
git rm -rqf . >/dev/null 2>&1 || true; find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a "$OUT/site/." .
git add -A
VER=$(node -p "require('$OLDPWD/package.json').version"); SRC=$(git -C "$OLDPWD" rev-parse --short HEAD)
if git diff --cached --quiet; then echo "gh-pages: изменений нет"; else
  git -c user.name="${GIT_AUTHOR_NAME:-JoLiKs}" -c user.email="${GIT_AUTHOR_EMAIL:-joliks@users.noreply.github.com}" commit -qm "gh-pages: сборка v$VER (исходники $SRC)"
  git_t push origin gh-pages
fi
API=https://api.github.com/repos/$REPO/pages
H=(-H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")
if [ "$(curl -s -o /dev/null -w '%{http_code}' "${H[@]}" "$API")" = 404 ]; then
  curl -s -o /dev/null -w 'включение Pages: HTTP %{http_code}\n' "${H[@]}" -X POST "$API" -d '{"source":{"branch":"gh-pages","path":"/"}}'
fi
for i in $(seq 1 40); do
  st=$(curl -s "${H[@]}" "$API" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('status'))")
  c=$(curl -s -o /dev/null -w '%{http_code}' "$SITE?cb=$RANDOM"); echo "Pages: status=$st, сайт HTTP $c"
  [ "$c" = 200 ] && [ "$st" = built ] && { echo "готово: $SITE"; exit 0; }
  sleep 8
done
echo "Pages ещё не опубликовались — проверьте позже: $SITE"; exit 2
