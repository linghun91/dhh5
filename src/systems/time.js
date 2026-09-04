import {PORTS} from '../data/catalog.js';
import {message} from '../data/messages.js';
import {addLog} from './common.js';
import {getStats} from './stats.js';

export function loseSailors(state,quantity) {
  let remaining=quantity;
  for (const ship of [...state.fleet].sort((a,b)=>b.sailors-a.sailors)) {
    const loss=Math.min(remaining,ship.sailors);
    ship.sailors-=loss;
    remaining-=loss;
  }
  return quantity-remaining;
}
export function damageFleet(state,damage) {
  if (!state.fleet.length) return;
  const perShip=Math.ceil(damage/state.fleet.length);
  for (const ship of state.fleet) ship.hull=Math.max(0,ship.hull-perShip);
  resolveLosses(state);
}
export function resolveLosses(state) {
  const sunk=state.fleet.filter(ship=>ship.hull<=0);
  for (const ship of sunk) addLog(state,message('shipLost',{name:ship.name}),'bad');
  state.fleet=state.fleet.filter(ship=>ship.hull>0);
  if (sunk.length) {
    const stats=getStats(state);
    let excess=stats.cargoUsed-stats.cargoCapacity;
    for (const id of Object.keys(state.cargo)) {
      const loss=Math.max(0,Math.min(excess,state.cargo[id].quantity));
      state.cargo[id].quantity-=loss;
      excess-=loss;
      if (!state.cargo[id].quantity) delete state.cargo[id];
    }
    let suppliesExcess=stats.supplyUsed-stats.supplyCapacity;
    for (const id of ['ammo','repair','food','water']) {
      const loss=Math.max(0,Math.min(suppliesExcess,state.supplies[id]));
      state.supplies[id]-=loss;
      suppliesExcess-=loss;
    }
  }
  const reason=!state.fleet.length?'defeatHull':state.fleet.every(ship=>ship.sailors===0)?'defeatCrew':state.morale<=0?'defeatMorale':null;
  if (reason) {
    state.status='lost';
    state.ending=message(reason);
    state.voyage=null;
    state.event=null;
    state.combat=null;
    addLog(state,state.ending,'bad');
  }
}
export function advanceDay(state,atSea) {
  state.day++;
  if (state.day%30===0) {
    const wage=getStats(state).wage;
    const unpaid=state.gold<wage;
    state.gold=Math.max(0,state.gold-wage);
    if (unpaid) state.morale=Math.max(0,state.morale-18);
    addLog(state,message(unpaid?'unpaid':'wage',{cost:wage}),unpaid?'warn':'info');
  }
  const expired=state.quests.filter(quest=>quest.deadline<state.day);
  for (const quest of expired) addLog(state,message('questExpired',{port:PORTS[quest.to].name}),'warn');
  state.quests=state.quests.filter(quest=>quest.deadline>=state.day);
  if (atSea) {
    const stats=getStats(state);
    const starving=state.supplies.food<stats.foodPerDay||state.supplies.water<stats.waterPerDay;
    state.supplies.food=Math.max(0,state.supplies.food-stats.foodPerDay);
    state.supplies.water=Math.max(0,state.supplies.water-stats.waterPerDay);
    state.fatigue=Math.min(100,state.fatigue+Math.max(.3,1.6-stats.skills.medicine/130-stats.medicine*.2));
    if (starving) {
      loseSailors(state,Math.max(1,Math.ceil(stats.sailors*.08)));
      state.morale=Math.max(0,state.morale-12);
      addLog(state,message('starving'),'bad');
    }
    if (state.fatigue>85) {
      loseSailors(state,Math.max(1,Math.floor(stats.sailors*.015)));
      state.morale=Math.max(0,state.morale-2);
    }
  }
  resolveLosses(state);
}
