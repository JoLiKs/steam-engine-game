// Живая проверка записи в рейтинг с github.io (reckless-бот до концовки в реальном времени, ник «ТЕСТ-проверка»). После запуска удалить тестовые данные.

const { launch, openGame, playToEnding, ok, results, sleep } = require('/workspace/steam-game/tests/pw/lib');
(async()=>{ const b=await launch(); const errs=[];
 const g=await openGame(b,'https://joliks.github.io/steam-engine-game',{errs});
 const posts=[]; g.page.on('response',r=>{ if(/\/api\/g\/score/.test(r.url())) { posts.push(r.status()); r.text().then(t=>console.log('  body:',t.slice(0,160))); } });
 await g.page.click('#b-new'); await g.page.click('#b-start'); await sleep(500);
 await g.page.evaluate(()=>{window.__game.setBot('reckless');window.__game.setSpeed(1);});
 let ended=false; const t0=Date.now();
 while(Date.now()-t0<200000){ const st=await g.page.evaluate(()=>window.__game.ui); if(st==='ending'){ended=true;break;} if(st==='card') await g.page.click('#c-opts .choice >> nth=0'); else if(st==='summary') await g.page.click('#b-next'); await sleep(200);} 
 ok(ended,'дошли до концовки');
 await sleep(600); await g.page.fill('#e-nick','ТЕСТ-проверка'); await g.page.click('#b-submit'); await sleep(2000);
 ok(posts.includes(200),'POST /score с github.io → '+posts);
 ok(await g.page.isVisible('#board'),'рейтинг открылся');
 const lb=await (await fetch('https://185-255-133-179.sslip.io/steam/api/g/leaderboard',{headers:{origin:'https://joliks.github.io'}})).json();
 ok(lb.entries.some(e=>e.nick==='ТЕСТ-проверка'),'запись видна в рейтинге');
 ok(errs.length===0,'консоль чистая '+JSON.stringify(errs.slice(0,2)));
 await b.close(); console.log(results()); })();
