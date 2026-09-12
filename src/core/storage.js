import { createGame, derive } from './game.js';
import { PORTS, REGIONS, SHIP_TYPES, CABINS, CANNONS, GOODS, CREW, EQUIPMENT, EVENTS, ROLES, FACTIONS, PORT_FACTIONS } from '../data/catalog.js';

const key='seven-seas-expedition';
const finite=(n,min=0,max=1e12)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const integer=(n,min=0,max=1e12)=>finite(n,min,max)&&Number.isInteger(n);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const list=(value,max)=>Array.isArray(value)&&value.length<=max;
const safeText=(value,max=400)=>typeof value==='string'&&value.length<=max&&!/[<>]/.test(value);
const unique=items=>new Set(items).size===items.length;
const reference=(value,catalog)=>typeof value==='string'&&Object.hasOwn(catalog,value);
const record=(value,check)=>plain(value)&&Object.entries(value).every(([id,item])=>check(id,item));
const idList=(value,catalog)=>list(value,Object.keys(catalog).length)&&unique(value)&&value.every(id=>reference(id,catalog));
const ranges=['close','medium','long'];
const hostileEvents=['pirates','navy','corsair'];
const fleetIdentity=['kind','factionId','ships','flagship'];

// Encounters are imported before a choice turns them into combat. Validate both
// boundaries identically so a nested encounter cannot bypass combat validation.
function validateOpponent(opponent,{legacy=false}={}) {
  if(!plain(opponent)||!safeText(opponent.name,80)||!reference(opponent.regionId,REGIONS))return false;
  if(!['hull','maxHull','sailors','maxSailors','firepower','reward'].every(k=>integer(opponent[k],1)))return false;
  if(opponent.hull>opponent.maxHull||opponent.sailors>opponent.maxSailors)return false;
  const hasIdentity=fleetIdentity.some(k=>Object.hasOwn(opponent,k));
  if(!legacy||hasIdentity) {
    if(!hostileEvents.includes(opponent.kind)||!reference(opponent.factionId,FACTIONS))return false;
    if(!(list(opponent.ships,5)&&opponent.ships.length>=1&&opponent.ships.every(id=>reference(id,SHIP_TYPES)))||opponent.flagship!==opponent.ships[0])return false;
    if(opponent.kind==='pirates'&&opponent.factionId!=='pirates'||opponent.kind==='corsair'&&opponent.factionId!=='corsairs'||opponent.kind==='navy'&&['pirates','corsairs'].includes(opponent.factionId))return false;
  }
  if(Object.hasOwn(opponent,'gunRange')&&!ranges.includes(opponent.gunRange))return false;
  if(Object.hasOwn(opponent,'patrolPortId')) {
    const port=opponent.patrolPortId;
    if(!reference(port,PORTS)||PORTS[port].region!==opponent.regionId)return false;
    if(opponent.kind==='navy'&&PORT_FACTIONS[port]!==opponent.factionId)return false;
  }
  if(Object.hasOwn(opponent,'firepowerByRange')) {
    const firepower=opponent.firepowerByRange;
    if(!plain(firepower)||Object.keys(firepower).sort().join()!=='close,long,medium'||!ranges.every(range=>finite(firepower[range],Number.MIN_VALUE)))return false;
  }
  return true;
}

function validateState(s) {
  if(!plain(s)||s.version!==1||Object.keys(s).sort().join()!==Object.keys(createGame()).sort().join())return false;
  if(!integer(s.seed,0,4294967295)||!integer(s.day,1)||!integer(s.nextShipId,2)||!['playing','won','lost'].includes(s.status))return false;
  if(!['gold','reputation','questCount','battlesWon'].every(k=>integer(s[k]))||!finite(s.tradeProfit,-1e12)||!finite(s.fatigue,0,100)||!finite(s.morale,0,100))return false;
  if(!(s.portId===null||reference(s.portId,PORTS))||!(s.ending===null||safeText(s.ending)))return false;
  if(!list(s.fleet,5)||(s.status!=='lost'&&!s.fleet.length)||!unique(s.fleet.map(x=>x.id)))return false;
  if(!s.fleet.every(ship=>plain(ship)&&/^ship-[1-9]\d*$/.test(ship.id)&&integer(Number(ship.id.slice(5)),1,s.nextShipId-1)&&reference(ship.type,SHIP_TYPES)&&safeText(ship.name,70)&&integer(ship.sails,0,3)&&integer(ship.armor,0,3)&&finite(ship.hull,0,SHIP_TYPES[ship.type].hull+ship.armor*45)&&integer(ship.sailors)&&list(ship.cabins,SHIP_TYPES[ship.type].slots)&&ship.cabins.length===SHIP_TYPES[ship.type].slots&&ship.cabins.every(id=>reference(id,CABINS))))return false;
  if(!s.fleet.every(ship=>!Object.hasOwn(ship,'cannons')||(list(ship.cannons,ship.cabins.length)&&ship.cannons.length===ship.cabins.length&&ship.cannons.every((id,slot)=>ship.cabins[slot]==='cannon'?reference(id,CANNONS)&&CANNONS[id].weight<=SHIP_TYPES[ship.type].maxGunWeight:id===null))))return false;
  if(!record(s.cargo,(id,item)=>reference(id,GOODS)&&plain(item)&&integer(item.quantity,1)&&finite(item.cost)))return false;
  if(!plain(s.supplies)||Object.keys(s.supplies).sort().join()!=='ammo,food,repair,water'||!Object.values(s.supplies).every(n=>integer(n)))return false;
  if(!list(s.crew,8)||!unique(s.crew.map(c=>c.id))||s.crew.filter(c=>c.role==='captain').length!==1)return false;
  if(!s.crew.every(c=>reference(c.id,CREW)&&integer(c.xp)&&(c.role===null||reference(c.role,ROLES))&&(c.equipment===null||reference(c.equipment,EQUIPMENT))))return false;
  if(!unique(s.crew.filter(c=>c.role).map(c=>c.role))||!record(s.equipment,(id,n)=>reference(id,EQUIPMENT)&&integer(n,1)))return false;
  if(!record(s.contracts,(id,v)=>reference(id,PORTS)&&v===true)||!record(s.shares,(id,n)=>reference(id,PORTS)&&finite(n,0,100)))return false;
  if(!idList(s.visited,PORTS)||!idList(s.explored,PORTS)||!idList(s.relics,REGIONS))return false;
  if(!list(s.quests,3)||!unique(s.quests.map(q=>q.id))||!s.quests.every(q=>safeText(q.id,80)&&reference(q.from,PORTS)&&reference(q.to,PORTS)&&reference(q.goodId,GOODS)&&integer(q.quantity,1)&&integer(q.reward,1)&&integer(q.reputation)&&integer(q.deadline,1)&&safeText(q.name)))return false;
  if(!list(s.completedQuests,144)||!unique(s.completedQuests)||!s.completedQuests.every(id=>safeText(id,80)))return false;
  if(!plain(s.market)||Object.keys(s.market).length!==Object.keys(PORTS).length||!record(s.market,(id,m)=>reference(id,PORTS)&&plain(m)&&integer(m.epoch)&&plain(m.stock)&&Object.keys(m.stock).length===Object.keys(GOODS).length&&record(m.stock,(g,n)=>reference(g,GOODS)&&integer(n))))return false;
  if(!list(s.logs,80)||!s.logs.every(log=>integer(log.day,1)&&safeText(log.text)&&['info','good','warn','bad'].includes(log.tone)))return false;
  if(s.voyage!==null) {
    const v=s.voyage;
    if(!plain(v)||!reference(v.from,PORTS)||!reference(v.to,PORTS)||!reference(v.finalTarget,PORTS)||!finite(v.distance,.01)||!finite(v.progress,0,v.distance)||!integer(v.days)||!['fair','tailwind','headwind','fog'].includes(v.weather)||!list(v.points,100)||v.points.length<2||!v.points.every(p=>list(p,2)&&p.length===2&&finite(p[0],0,1200)&&finite(p[1],0,660)))return false;
    if(s.portId!==null&&(s.portId!==v.to||v.progress!==v.distance||v.to===v.finalTarget))return false;
  } else if(s.portId===null&&s.status!=='lost')return false;
  if(s.event!==null) {
    const event=s.event;
    if(!plain(event)||!reference(event.id,EVENTS)||!s.voyage||s.portId!==null)return false;
    if(Object.hasOwn(event,'toll')&&(!hostileEvents.includes(event.id)||!integer(event.toll,1)))return false;
    if(Object.hasOwn(event,'encounter')&&(!hostileEvents.includes(event.id)||!validateOpponent(event.encounter)||event.encounter.kind!==event.id||!integer(event.encounter.toll,1)))return false;
  }
  if(s.combat!==null) {
    const c=s.combat;
    if(!validateOpponent(c,{legacy:true})||!s.voyage||s.portId!==null||s.event||!integer(c.round,1)||(Object.hasOwn(c,'range')&&!ranges.includes(c.range)))return false;
  }
  const stats=derive(s);
  return stats.cargoUsed<=stats.cargoCapacity&&stats.supplyUsed<=stats.supplyCapacity&&s.fleet.every((ship,i)=>ship.sailors<=stats.ships[i].maxSailors);
}

export function validateSave(state) {
  try {return validateState(state);}
  catch {return false;}
}

export function parseSave(raw) {
  if(typeof raw!=='string'||raw.length>262144)throw new Error('invalid-save');
  const state=JSON.parse(raw);
  if(!validateSave(state))throw new Error('invalid-save');
  for (const ship of state.fleet) {
    if (!Object.hasOwn(ship,'cannons')) ship.cannons=ship.cabins.map(id=>id==='cannon'?SHIP_TYPES[ship.type].defaultCannon:null);
  }
  if (state.combat&&!Object.hasOwn(state.combat,'range')) state.combat.range='medium';
  return state;
}
export function loadGame() {
  try {const raw=localStorage.getItem(key);return {state:raw?parseSave(raw):createGame(),error:false};}
  catch {return {state:createGame(),error:true};}
}
export function saveGame(state) {
  try {localStorage.setItem(key,JSON.stringify(state));return true;}
  catch {return false;}
}
export function exportGame(state,filename) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
}
