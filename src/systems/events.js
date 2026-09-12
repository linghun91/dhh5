import {EVENTS} from '../data/catalog.js';
import {fail,success,random,addLog} from './common.js';
import {message} from '../data/messages.js';
import {getStats} from './stats.js';
import {advanceDay,damageFleet,loseSailors,resolveLosses} from './time.js';
import {addSailors} from './fleet.js';
import {beginCombat} from './combat.js';
import {spawnEncounter} from '../data/fleets.js';

export function eventChoice(state,{choiceId}) {
  if (!state.event) return fail('eventMissing');
  if (state.combat) return fail('blocked');
  if (!state.voyage||state.portId) return fail('notSailing');
  const current=state.event,id=current.id,toll=current.toll??current.encounter?.toll??450;
  if (!Object.hasOwn(EVENTS,id)||!EVENTS[id].choices.some(choice=>choice.id===choiceId)) return fail('invalid');
  if (choiceId==='brace'&&state.supplies.repair<3) return fail('notEnoughSupplies');
  if (choiceId==='pay'&&state.gold<toll) return fail('funds',{cost:toll});
  if (choiceId==='rescue'&&(state.supplies.food<5||state.supplies.water<5)) return fail('notEnoughSupplies');
  if (choiceId==='treat'&&state.supplies.food<4) return fail('notEnoughSupplies');
  const stats=getStats(state);
  state.event=null;
  if (id==='storm') {
    const damage=(choiceId==='brace'?4:14)*state.fleet.length;
    if (choiceId==='brace') state.supplies.repair-=3;
    else advanceDay(state,true);
    if (state.status==='lost') return {ok:true,message:state.ending};
    damageFleet(state,damage);
    if (state.status==='lost') return {ok:true,message:state.ending};
    return success(state,'storm',{damage},'warn');
  }
  if (id==='pirates'||id==='corsair'||id==='navy') {
    if (choiceId==='pay') {
      state.gold-=toll;
      return success(state,id==='navy'?'navyPay':id==='corsair'?'payCorsair':'payPirates',{cost:toll});
    }
    if (choiceId==='salute') {
      if (state.reputation>=18) {
        state.reputation+=5;
        return success(state,'navySalute');
      }
      addLog(state,message('navyRejected'),'warn');
    }
    if (choiceId==='inspect'||choiceId==='salute') {
      advanceDay(state,true);
      if (state.status==='lost') return {ok:true,message:state.ending};
      state.voyage.days++;
      return success(state,'navyInspected');
    }
    if (choiceId==='evade'&&random(state)<Math.min(.88,.4+stats.skills.navigation/300)) {
      if (id==='navy') state.reputation=Math.max(0,state.reputation-5);
      return success(state,id==='navy'?'navyEvaded':'evaded');
    }
    return beginCombat(state,current.encounter||spawnEncounter(state,id,random));
  }
  if (choiceId==='rescue') {
    state.supplies.food-=5;state.supplies.water-=5;
    state.reputation+=18;
    const quantity=addSailors(state,5);
    return success(state,'rescue',{quantity});
  }
  if (choiceId==='salvage') {
    const gold=220+Math.floor(random(state)*580);
    state.gold+=gold;
    state.fatigue=Math.min(100,state.fatigue+5);
    return success(state,'salvage',{gold});
  }
  if (id==='illness') {
    if (choiceId==='treat') state.supplies.food-=4;
    const quantity=loseSailors(state,choiceId==='treat'?Math.max(0,Math.ceil(4-stats.skills.medicine/30-stats.medicine*2)):Math.max(2,Math.ceil(stats.sailors*.08)));
    state.fatigue=Math.min(100,state.fatigue+(choiceId==='treat'?3:10));
    resolveLosses(state);
    if (state.status==='lost') return {ok:true,message:state.ending};
    return success(state,'illness',{quantity},'warn');
  }
  return success(state,'eventResolved');
}
