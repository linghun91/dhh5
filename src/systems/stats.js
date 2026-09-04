import {CABINS,SHIP_TYPES,CREW,EQUIPMENT,PORTS,REGIONS} from '../data/catalog.js';
import {cargoUsed,supplyUsed} from './common.js';

export function shipStats(ship) {
  const type=SHIP_TYPES[ship.type];
  const cabins=ship.cabins.map(id=>CABINS[id]);
  const total=field=>cabins.reduce((sum,cabin)=>sum+cabin[field],0);
  return {id:ship.id,maxHull:type.hull+ship.armor*45,maxSailors:type.sailors+ship.cabins.filter(id=>id==='marine').length*12,cargoCapacity:total('cargo'),supplyCapacity:total('supply'),firepower:total('firepower'),boarding:total('marines'),kitchen:total('kitchen'),medicine:total('medicine'),speed:type.speed+ship.sails*3-ship.armor,slots:type.slots};
}
export function crewSkill(member,skill) {
  const equipment=member.equipment?EQUIPMENT[member.equipment]:null;
  return CREW[member.id][skill]+Math.floor(member.xp/100)*3+(equipment?.skill===skill?equipment.bonus:0);
}
export function getStats(state) {
  const ships=state.fleet.map(shipStats);
  const total=field=>ships.reduce((sum,ship)=>sum+ship[field],0);
  const roles=Object.fromEntries(state.crew.filter(member=>member.role).map(member=>[member.role,member.id]));
  const roleSkill=(role,skill)=>{
    const member=state.crew.find(crew=>crew.role===role);
    return member?crewSkill(member,skill):0;
  };
  const skills={navigation:roleSkill('navigator','navigation')+roleSkill('captain','navigation')*.25,trade:roleSkill('accountant','trade'),combat:roleSkill('gunner','combat')+roleSkill('captain','combat')*.25,medicine:roleSkill('doctor','medicine')};
  const sailors=state.fleet.reduce((sum,ship)=>sum+ship.sailors,0);
  const foodPerDay=Math.max(1,Math.ceil(sailors/18*(1-Math.min(.4,total('kitchen')*.13))));
  const waterPerDay=Math.max(1,Math.ceil(sailors/16));
  const speed=ships.length?Math.max(7,Math.min(...ships.map((ship,i)=>ship.speed*Math.max(.45,state.fleet[i].sailors/ship.maxSailors)*(.65+.35*state.fleet[i].hull/ship.maxHull)))*(1+skills.navigation/230)*(1-state.fatigue/250)):0;
  return {ships,roles,skills,cargoUsed:cargoUsed(state),cargoCapacity:total('cargoCapacity'),supplyUsed:supplyUsed(state),supplyCapacity:total('supplyCapacity'),sailors,maxSailors:total('maxSailors'),hull:state.fleet.reduce((sum,ship)=>sum+ship.hull,0),maxHull:total('maxHull'),firepower:Math.round(total('firepower')*(1+skills.combat/130)*(0.5+state.morale/200)),boarding:Math.round((sailors*.4+total('boarding'))*(1+skills.combat/160)),speed,foodPerDay,waterPerDay,endurance:Math.min(Math.floor(state.supplies.food/foodPerDay),Math.floor(state.supplies.water/waterPerDay)),wage:sailors*3+state.crew.length*25,kitchen:total('kitchen'),medicine:total('medicine')};
}
export function regionProgress(state) {
  return Object.values(REGIONS).map(region=>{
    const ports=Object.values(PORTS).filter(port=>port.region===region.id);
    const visited=ports.filter(port=>state.visited.includes(port.id)).length;
    const influence=ports.reduce((sum,port)=>sum+(state.shares[port.id]||0),0);
    const explored=ports.some(port=>state.explored.includes(port.id));
    return {id:region.id,visited,requiredVisits:region.requiredVisits,influence,requiredInfluence:region.requiredInfluence,explored,relic:state.relics.includes(region.id),ready:visited>=region.requiredVisits&&influence>=region.requiredInfluence&&explored};
  });
}
