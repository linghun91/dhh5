import {PORTS,GOODS,CREW,CABINS,SHIP_TYPES,CANNONS,EQUIPMENT,SUPPLIES,ROLES} from '../data/catalog.js';
import {getStats,regionProgress} from '../systems/stats.js';
import {message} from '../data/messages.js';
import {fail} from '../systems/common.js';
import {contract,trade,supply,refill,refillPlan,invest} from '../systems/trade.js';
import {createShip,buyShip,sellShip,hireSailors,cabin,armCannon,upgrade,repair,repairCost} from '../systems/fleet.js';
import {recruit,assign,buyEquipment,equip,rest,restCost} from '../systems/crew.js';
import {availableQuests,acceptQuest,deliverQuest,explore,claimRelic,finish} from '../systems/quests.js';
import {depart,step} from '../systems/navigation.js';
import {eventChoice} from '../systems/events.js';
import {battle} from '../systems/combat.js';

export {quote} from '../systems/trade.js';
export {planRoute} from '../systems/navigation.js';
export {getVolley} from '../systems/stats.js';

export function createGame() {
  return {
    version:1,seed:16690409,day:1,gold:12500,reputation:0,portId:'lisbon',status:'playing',ending:null,
    fleet:[createShip('caravel',1)],nextShipId:2,cargo:{},supplies:{food:65,water:65,ammo:12,repair:8},
    crew:[{id:'alvaro',role:'captain',equipment:null,xp:0},{id:'ines',role:'navigator',equipment:null,xp:0}],equipment:{},fatigue:0,morale:85,
    contracts:{},shares:{},visited:['lisbon'],relics:[],explored:[],quests:[],completedQuests:[],questCount:0,tradeProfit:0,battlesWon:0,
    market:Object.fromEntries(Object.values(PORTS).map(port=>[port.id,{epoch:0,stock:Object.fromEntries(Object.keys(GOODS).map(id=>[id,port.goods.includes(id)?55:18]))}])),
    voyage:null,event:null,combat:null,logs:[{day:1,text:message('opening'),tone:'info'}]
  };
}
const portActions={contract,trade,supply,refill,hireSailors,rest,repair,buyShip,sellShip,cabin,armCannon,upgrade,recruit,assign,buyEquipment,equip,invest,acceptQuest,deliverQuest,explore,claimRelic,finish,depart};
const seaActions={step,eventChoice,battle};
const catalogFields={targetId:PORTS,goodId:GOODS,crewId:CREW,cabinId:CABINS,shipType:SHIP_TYPES,cannonId:CANNONS,equipmentId:EQUIPMENT,supplyId:SUPPLIES,role:ROLES};
export function dispatch(state,action) {
  if (state.status==='lost') return fail('lost');
  if (!action||typeof action.type!=='string') return fail('unknown');
  for (const [field,catalog] of Object.entries(catalogFields)) {
    if (!Object.hasOwn(action,field)) continue;
    if (action[field]===null&&(field==='role'||field==='equipmentId')) continue;
    if (typeof action[field]!=='string'||!Object.hasOwn(catalog,action[field])) return fail('invalid');
  }
  if (Object.hasOwn(portActions,action.type)) {
    if (!state.portId) return fail('portOnly');
    return portActions[action.type](state,action);
  }
  if (Object.hasOwn(seaActions,action.type)) return seaActions[action.type](state,action);
  return fail('unknown');
}
export function derive(state) {
  return {...getStats(state),regionProgress:regionProgress(state),availableQuests:availableQuests(state),availableCrew:Object.values(CREW).filter(crew=>crew.portId===state.portId&&!state.crew.some(member=>member.id===crew.id)).map(crew=>crew.id),repairCost:repairCost(state),restCost:restCost(state),refillCost:refillPlan(state).cost,contractCost:150,investCost:500};
}
