import { createState } from '../src/core/sim.js';
import { runGame } from '../src/core/bot.js';
import { smogAvg, toll } from '../src/core/sim.js';
const rows=[];
for (const [skill,policy,react,pusher] of [['good','iron',0.35,true],['good','good',0.35,true],['good','good',0.35],['good','good',0.8],['ok','good',0.9],['good','greedy',0.35],['good','smoky',0.35],['good','iron',0.35],['bad','good'],['idle','good']]) {
  const res={};
  for (let seed=1; seed<=20; seed++) {
    const s=createState(seed,{skipTutorial:true}); runGame(s,skill,{policy,react,pusher});
    res[s.ending]=(res[s.ending]||0)+1;
    if (seed===1) rows.push({skill,policy,react,pusher, night:s.night, pop:Math.round(s.pop), toll:Math.round(toll(s)), smog:Math.round(smogAvg(s)), burn:s.burnouts, coal:Math.round(s.coal)});
  }
  rows[rows.length-1].res=JSON.stringify(res);
}
console.table(rows);
