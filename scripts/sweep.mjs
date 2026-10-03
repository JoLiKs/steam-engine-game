import { createState } from '../src/core/sim.js';
import { runGame } from '../src/core/bot.js';
for (const react of [0.5,1,1.5,2,3]) for (const skill of ['good','ok']) {
  const res={}; let pops=0;
  for (let seed=1; seed<=20; seed++){ const s=createState(seed,{skipTutorial:true}); runGame(s,skill,{react}); res[s.ending]=(res[s.ending]||0)+1; pops+=s.pop;}
  console.log(react,skill,JSON.stringify(res),Math.round(pops/20));
}
