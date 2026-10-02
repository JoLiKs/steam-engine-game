#!/bin/bash
# Публикация только игровых файлов в Cloudflare Pages (wrangler 3 в /tmp/wr2)
set -e
cd "$(dirname "$0")/.."
D=/tmp/steam-deploy; rm -rf $D; mkdir -p $D/src
cp index.html style.css _headers $D/ 2>/dev/null || cp index.html style.css $D/
for f in sim data rng layout render draw fx audio bot main; do cp src/$f.js $D/src/; done
export CLOUDFLARE_ACCOUNT_ID=$(curl -s "https://api.cloudflare.com/client/v4/zones?name=ralovich.by" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | python3 -c "import sys,json;print(json.load(sys.stdin)['result'][0]['account']['id'])")
W=/tmp/wr2/node_modules/.bin/wrangler; cd /tmp/wr2
$W pages project create steam-engine-game --production-branch main 2>&1 | grep -v -i token || true
$W pages deploy $D --project-name steam-engine-game --branch main --commit-dirty=true 2>&1 | grep -v -i token
