import {CABINS,SHIP_TYPES,CANNONS} from '../data/catalog.js';
import {message} from '../data/messages.js';
import {fail,positive,success} from './common.js';
import {getStats,shipStats} from './stats.js';

export function createShip(type,id) {
  const data=SHIP_TYPES[type];
  return {id:`ship-${id}`,type,name:message('shipName',{name:data.name,number:id}),hull:data.hull,sailors:Math.ceil(data.sailors*.6),cabins:[...data.cabins],cannons:data.cabins.map(cabin=>cabin==='cannon'?data.defaultCannon:null),sails:0,armor:0};
}
export const repairCost = state => Math.ceil(state.fleet.reduce((sum,ship)=>sum+shipStats(ship).maxHull-ship.hull,0)*3);
export function repair(state) {
  const cost=repairCost(state);
  if (!cost) return fail('full');
  if (state.gold<cost) return fail('funds',{cost});
  state.gold-=cost;
  for (const ship of state.fleet) ship.hull=shipStats(ship).maxHull;
  return success(state,'repair',{cost});
}
export function hireSailors(state,{quantity}) {
  if (!positive(quantity)) return fail('invalid');
  const stats=getStats(state),cost=quantity*20;
  if (stats.sailors+quantity>stats.maxSailors) return fail('full');
  if (state.gold<cost) return fail('funds',{cost});
  state.gold-=cost;
  addSailors(state,quantity);
  return success(state,'hire',{quantity,cost});
}
export function addSailors(state,quantity) {
  let remaining=quantity;
  for (const ship of state.fleet) {
    const adding=Math.min(remaining,shipStats(ship).maxSailors-ship.sailors);
    ship.sailors+=adding;
    remaining-=adding;
  }
  return quantity-remaining;
}
export function buyShip(state,{shipType}) {
  const type=SHIP_TYPES[shipType];
  if (!type) return fail('invalid');
  if (state.fleet.length>=5) return fail('fleetLimit');
  if (state.gold<type.price) return fail('funds',{cost:type.price});
  state.gold-=type.price;
  state.fleet.push(createShip(shipType,state.nextShipId++));
  return success(state,'buyShip',{name:type.name});
}
export function sellShip(state,{shipId}) {
  const ship=state.fleet.find(item=>item.id===shipId);
  if (!ship) return fail('invalid');
  if (state.fleet.length===1) return fail('lastShip');
  const stats=getStats(state),own=shipStats(ship);
  if (stats.cargoUsed>stats.cargoCapacity-own.cargoCapacity||stats.supplyUsed>stats.supplyCapacity-own.supplyCapacity) return fail('overload');
  const cost=Math.floor(SHIP_TYPES[ship.type].price*.6*ship.hull/own.maxHull);
  state.fleet.splice(state.fleet.indexOf(ship),1);
  state.gold+=cost;
  return success(state,'sellShip',{name:ship.name,cost});
}
// New batteries pay for construction and their included weapon; ship purchases already include it.
export const cabinCost=(ship,cabinId)=>CABINS[cabinId].price+(cabinId==='cannon'?CANNONS[SHIP_TYPES[ship.type].defaultCannon].price:0);
export function cabin(state,{shipId,slot,cabinId}) {
  const ship=state.fleet.find(item=>item.id===shipId),next=CABINS[cabinId];
  if (!ship||!next||!Number.isInteger(slot)||slot<0||slot>=ship.cabins.length) return fail('invalid');
  if (ship.cabins[slot]===cabinId) return fail('same');
  const previous=CABINS[ship.cabins[slot]],stats=getStats(state),own=shipStats(ship);
  if (stats.cargoUsed>stats.cargoCapacity-previous.cargo+next.cargo||stats.supplyUsed>stats.supplyCapacity-previous.supply+next.supply||ship.sailors>own.maxSailors-(previous.marines?12:0)+(next.marines?12:0)) return fail('overload');
  const cost=cabinCost(ship,cabinId);
  if (state.gold<cost) return fail('funds',{cost});
  if (!ship.cannons) ship.cannons=ship.cabins.map(id=>id==='cannon'?SHIP_TYPES[ship.type].defaultCannon:null);
  state.gold-=cost;
  ship.cabins[slot]=cabinId;
  ship.cannons[slot]=cabinId==='cannon'?SHIP_TYPES[ship.type].defaultCannon:null;
  return success(state,'cabin',{ship:ship.name,name:next.name,cost});
}
export function armCannon(state,{shipId,slot,cannonId}) {
  const ship=state.fleet.find(item=>item.id===shipId),next=CANNONS[cannonId];
  if (!ship||!next||!Number.isInteger(slot)||slot<0||slot>=ship.cabins.length||ship.cabins[slot]!=='cannon') return fail('invalid');
  const type=SHIP_TYPES[ship.type];
  if (next.weight>type.maxGunWeight) return fail('cannonWeight',{weight:next.weight,max:type.maxGunWeight});
  const current=ship.cannons?ship.cannons[slot]:type.defaultCannon;
  if (current===cannonId) return fail('same');
  if (state.gold<next.price) return fail('funds',{cost:next.price});
  if (!ship.cannons) ship.cannons=ship.cabins.map(id=>id==='cannon'?type.defaultCannon:null);
  state.gold-=next.price;
  ship.cannons[slot]=cannonId;
  return success(state,'armCannon',{ship:ship.name,slot:slot+1,name:next.name,cost:next.price});
}
export function upgrade(state,{shipId,upgrade}) {
  const ship=state.fleet.find(item=>item.id===shipId);
  if (!ship||!['sails','armor'].includes(upgrade)) return fail('invalid');
  if (ship[upgrade]>=3) return fail('upgradeLimit');
  const cost=(ship[upgrade]+1)*1200;
  if (state.gold<cost) return fail('funds',{cost});
  state.gold-=cost;
  ship[upgrade]++;
  if (upgrade==='armor') ship.hull+=45;
  return success(state,'upgrade',{ship:ship.name,name:message(upgrade),level:ship[upgrade]});
}
