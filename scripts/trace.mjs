import { createState, step } from '../src/core/sim.js';
import { botAct } from '../src/core/bot.js';
const [skill='good',policy='good',react='0.35']=process.argv.slice(2);
const s=createState(1);
let last=-1;
while(s.phase!=='ended' && s.clock<4000){
  botAct(s,skill,{policy,react:+react}); step(s,1/60); s.events.length=0;
  if(s.phase==='summary' && last!==s.night){last=s.night;
    console.log(s.night, 'pop',Math.round(s.pop),'lostH/C/S',Math.round(s.lostHosp),Math.round(s.lostCold),Math.round(s.lostSmog),'coal',Math.round(s.coal),'fw',Math.round(s.fw),'smog',Math.round(s.smog),'burn',s.burnouts,'leaks',s.leaksFixed);}
}
console.log(s.ending, s.night);
