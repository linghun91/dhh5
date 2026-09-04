import {CREW,EQUIPMENT,ROLES} from '../data/catalog.js';
import {fail,success} from './common.js';
import {advanceDay} from './time.js';

export const restCost = state => 80+state.crew.length*15+state.fleet.reduce((sum,ship)=>sum+ship.sailors,0)*2;
export function rest(state) {
  const cost=restCost(state);
  if (state.gold<cost) return fail('funds',{cost});
  state.gold-=cost;
  state.fatigue=Math.max(0,state.fatigue-35);
  state.morale=Math.min(100,state.morale+15);
  advanceDay(state,false);
  return success(state,'rest');
}
export function recruit(state,{crewId}) {
  const crew=CREW[crewId];
  if (!crew||crew.portId!==state.portId||state.crew.some(member=>member.id===crewId)) return fail('crewUnavailable');
  if (state.gold<crew.price) return fail('funds',{cost:crew.price});
  state.gold-=crew.price;
  state.crew.push({id:crewId,role:null,equipment:null,xp:0});
  return success(state,'recruit',{name:crew.name});
}
export function assign(state,{crewId,role}) {
  const crew=state.crew.find(member=>member.id===crewId);
  if (!crew||(role!==null&&!ROLES[role])) return fail('invalid');
  if (crew.role==='captain'||role==='captain') return fail('captain');
  if (crew.role===role) return fail('same');
  if (role) {
    const previous=state.crew.find(member=>member.role===role);
    if (previous) previous.role=null;
  }
  crew.role=role;
  return success(state,role?'assigned':'unassigned',{name:CREW[crewId].name,role:ROLES[role]});
}
export function buyEquipment(state,{equipmentId}) {
  const item=EQUIPMENT[equipmentId];
  if (!item) return fail('invalid');
  if (state.gold<item.price) return fail('funds',{cost:item.price});
  state.gold-=item.price;
  state.equipment[equipmentId]=(state.equipment[equipmentId]||0)+1;
  return success(state,'equipmentBuy',{name:item.name});
}
export function equip(state,{crewId,equipmentId}) {
  const crew=state.crew.find(member=>member.id===crewId);
  if (!crew||(equipmentId!==null&&!EQUIPMENT[equipmentId])) return fail('invalid');
  if (crew.equipment===equipmentId) return fail('same');
  if (equipmentId&&!state.equipment[equipmentId]) return fail('equipmentMissing');
  if (equipmentId) {
    state.equipment[equipmentId]--;
    if (!state.equipment[equipmentId]) delete state.equipment[equipmentId];
  }
  if (crew.equipment) state.equipment[crew.equipment]=(state.equipment[crew.equipment]||0)+1;
  crew.equipment=equipmentId;
  return success(state,equipmentId?'equip':'unequip',{name:CREW[crewId].name,equipment:equipmentId?EQUIPMENT[equipmentId].name:''});
}
