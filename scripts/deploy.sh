#!/bin/bash
# Публикация в Cloudflare Pages (wrangler 3 в /tmp/wr2; если нет — ставится). Только файлы сайта: без tests/backend/screenshots.
set -e
cd "$(dirname "$0")/.."
D=/tmp/steam-deploy; rm -rf $D; mkdir -p $D/src $D/admin
cp index.html style.css _headers _worker.js _routes.json $D/
cp admin/index.html admin/login.js admin/login.css $D/admin/
cp src/*.js $D/src/
if [ ! -x /tmp/wr2/node_modules/.bin/wrangler ]; then mkdir -p /tmp/wr2 && (cd /tmp/wr2 && npm init -y >/dev/null && npm i wrangler@3 >/dev/null 2>&1); fi
export CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID:-$(cat /tmp/acc 2>/dev/null || curl -s "https://api.cloudflare.com/client/v4/zones?name=aihubai.site" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | python3 -c "import sys,json;print(json.load(sys.stdin)['result'][0]['account']['id'])")}
W=/tmp/wr2/node_modules/.bin/wrangler; cd /tmp/wr2
$W pages deploy $D --project-name steam-engine-game --branch main --commit-dirty=true 2>&1 | grep -v -i token
