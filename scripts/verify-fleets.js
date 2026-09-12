import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createGame,dispatch} from '../src/core/game.js';
import {SHIP_TYPES,PORTS,REGIONS,EVENTS} from '../src/data/catalog.js';
import {FACTIONS,PORT_FACTIONS,harborFleet,spawnEncounter,npcStats,buildEvent,seaEventIds} from '../src/data/fleets.js';
import {parseSave,validateSave} from '../src/core/storage.js';
import {createShip} from '../src/systems/fleet.js';
import {getStats} from '../src/systems/stats.js';
import {beginCombat} from '../src/systems/combat.js';

let checks=0,failures=0;
const check=(name,fn)=>{checks++;try {fn();console.log(`✓ ${name}`);} catch(error) {failures++;console.error(`✗ ${name}: ${error.message}`);}};
function sailing(from='lisbon',to='london',progress=0) {
  const state=createGame();
  state.fleet=[createShip('first-rate',1)];
  state.portId=null;
  state.voyage={from,to,finalTarget:to,points:[[PORTS[from].x,PORTS[from].y],[PORTS[to].x,PORTS[to].y]],distance:1000,progress,days:0,weather:'fair'};
  state.supplies={food:100,water:100,ammo:60,repair:10};
  return state;
}
const act=(state,action)=>assert.equal(dispatch(state,action).ok,true,JSON.stringify(action));
const enemy=(state,kind='pirates')=>({...spawnEncounter(state,kind,()=>.5),hull:10000,maxHull:10000,sailors:1000,maxSailors:1000});

check('Every port fleet and faction emblem resolves to catalog resources',()=>{
  assert.equal(Object.keys(PORT_FACTIONS).length,Object.keys(PORTS).length);
  for (const faction of Object.values(FACTIONS)) {
    assert.ok(faction.asset&&existsSync(faction.asset),`${faction.id}: missing faction emblem`);
    assert.match(readFileSync(faction.asset,'utf8'),/<svg\b/);
    for (const id of [...faction.harbor,...faction.patrol,...faction.specialty]) assert.ok(SHIP_TYPES[id],`${faction.id}: ${id}`);
  }
  for (const id of Object.keys(PORTS)) {
    const fleet=harborFleet(id);
    assert.deepEqual(fleet.stats,npcStats(fleet.ships,REGIONS[PORTS[id].region].danger));
  }
});

check('Encounter jurisdiction follows the current half of the sailing leg',()=>{
  const state=sailing('lisbon','london',900);
  const navy=spawnEncounter(state,'navy',()=>.5);
  assert.equal(navy.regionId,'north');
  assert.equal(navy.factionId,'england');
  assert.equal(navy.patrolPortId,'london');
  state.voyage.progress=50;
  assert.equal(spawnEncounter(state,'navy',()=>.5).factionId,'portugal');
  state.voyage.from='ceylon';state.voyage.to='malacca';state.voyage.progress=900;
  assert.equal(spawnEncounter(state,'pirates',()=>.5).regionId,'asia');
});

check('Capital patrol encounters can deploy their displayed harbor flagship',()=>{
  const state=sailing('london','amsterdam',1);
  const navy=spawnEncounter(state,'navy',()=>0);
  assert.equal(navy.flagship,harborFleet('london').ships[0]);
  assert.ok(navy.ships.includes('first-rate'));
});

check('Mixed NPC batteries expose range-dependent volleys from every ship',()=>{
  const stats=npcStats(['gunboat','first-rate']);
  for (const range of ['close','medium','long']) assert.ok(Number.isFinite(stats.firepowerByRange?.[range])&&stats.firepowerByRange[range]>0);
  assert.equal(stats.firepowerByRange.medium,stats.firepower);
  const short=npcStats(['gunboat']),long=npcStats(['first-rate']);
  assert.ok(short.firepowerByRange.close>short.firepowerByRange.long);
  assert.ok(long.firepowerByRange.long>long.firepowerByRange.close);
  assert.ok(stats.firepowerByRange.long>stats.firepowerByRange.close,'The escort must not impose its short range on the flagship');
  assert.deepEqual(stats.firepowerByRange,npcStats(['first-rate','gunboat']).firepowerByRange,'Fleet order must not change weapon performance');
});

check('Pirate warnings increase encounter weight while retaining every sea event',()=>{
  const quiet=seaEventIds(sailing('lisbon','london'),Object.keys(EVENTS));
  const hotspot=seaEventIds(sailing('havana','veracruz'),Object.keys(EVENTS));
  assert.deepEqual(new Set(hotspot),new Set(Object.keys(EVENTS)));
  const pirateShare=ids=>ids.filter(id=>id==='pirates').length/ids.length;
  assert.ok(pirateShare(hotspot)>pirateShare(quiet));
});

check('Navy paperwork preserves reputation above 100',()=>{
  const state=sailing();state.reputation=180;
  state.event=buildEvent(state,'navy',()=>.5);
  act(state,{type:'eventChoice',choiceId:'salute'});
  assert.equal(state.reputation,185);
  assert.equal(state.combat,null);
});

check('Low-reputation paperwork waits for inspection instead of declaring war',()=>{
  const state=sailing();const day=state.day,progress=state.voyage.progress;
  state.event=buildEvent(state,'navy',()=>.5);
  act(state,{type:'eventChoice',choiceId:'salute'});
  assert.equal(state.combat,null);
  assert.equal(state.event,null);
  assert.equal(state.day,day+1);
  assert.equal(state.voyage.progress,progress);
});

check('Voluntary inspection consumes one sailing day of provisions without moving',()=>{
  const state=sailing(),before=structuredClone(state),stats=getStats(state);
  state.event=buildEvent(state,'navy',()=>.5);
  act(state,{type:'eventChoice',choiceId:'inspect'});
  assert.equal(state.day,before.day+1);
  assert.equal(state.voyage.days,before.voyage.days+1);
  assert.equal(state.voyage.progress,before.voyage.progress);
  assert.equal(state.supplies.food,before.supplies.food-stats.foodPerDay);
  assert.equal(state.supplies.water,before.supplies.water-stats.waterPerDay);
  assert.equal(state.gold,before.gold);
});

check('Starvation during inspection resolves defeat and clears the encounter',()=>{
  const state=sailing();state.supplies.food=state.supplies.water=0;state.morale=1;
  state.event=buildEvent(state,'navy',()=>.5);
  act(state,{type:'eventChoice',choiceId:'inspect'});
  assert.equal(state.status,'lost');
  assert.equal(state.event,null);
  assert.equal(state.combat,null);
  assert.equal(state.voyage,null);
});

check('Evading navy inspection applies only the matching success or combat penalty',()=>{
  for (const [seed,penalty,combat] of [[0,5,false],[1000,25,true]]) {
    const state=sailing();state.crew=[];state.reputation=100;state.seed=seed;
    state.event=buildEvent(state,'navy',()=>.5);
    act(state,{type:'eventChoice',choiceId:'evade'});
    assert.equal(state.reputation,100-penalty);
    assert.equal(!!state.combat,combat);
    assert.equal(state.event,null);
    if (combat) assert.equal(state.combat.kind,'navy');
  }
});

check('Legacy navy events without embedded fleets preserve their navy identity',()=>{
  const state=sailing();state.reputation=60;state.event={id:'navy',toll:450};
  act(state,{type:'eventChoice',choiceId:'fight'});
  assert.equal(state.combat.kind,'navy');
  assert.equal(state.reputation,35);
});

check('Defeating a navy cannot refund the penalty for attacking it',()=>{
  const state=sailing();state.reputation=60;
  const spec=enemy(state,'navy');spec.hull=1;
  assert.equal(beginCombat(state,spec).ok,true);
  act(state,{type:'battle',move:'cannon'});
  assert.equal(state.combat,null);
  assert.equal(state.reputation,35);
  assert.equal(state.battlesWon,1);
});

check('Range changes immediately change the return volley in that round',()=>{
  const state=sailing();
  const spec=enemy(state);spec.firepower=65;spec.firepowerByRange={close:15,medium:65,long:110};
  beginCombat(state,spec);
  const close=structuredClone(state),long=structuredClone(state);
  act(close,{type:'battle',move:'approach'});
  act(long,{type:'battle',move:'withdraw'});
  assert.ok(close.fleet[0].hull>long.fleet[0].hull,'Enemy used stale range / flagship gun instead of mixed fleet batteries');
});

check('Victory loot never removes provisions from a temporarily overfull fleet',()=>{
  const state=sailing();state.supplies.food=getStats(state).supplyCapacity+30;
  const food=state.supplies.food,spec=enemy(state);spec.hull=1;
  beginCombat(state,spec);
  act(state,{type:'battle',move:'cannon'});
  assert.equal(state.supplies.food,food);
});

check('Combat initiation rejects port and duplicate encounter states atomically',()=>{
  const state=createGame(),before=JSON.stringify(state);
  assert.equal(beginCombat(state,{name:'invalid',kind:'pirates',hull:20,sailors:20,firepower:20,reward:200}).ok,false);
  assert.equal(JSON.stringify(state),before);
  const sea=sailing();beginCombat(sea,enemy(sea));const active=JSON.stringify(sea);
  assert.equal(beginCombat(sea,enemy(sea)).ok,false);
  assert.equal(JSON.stringify(sea),active);
});

check('Insufficient encounter fees preserve the event and the entire save',()=>{
  const state=sailing();state.gold=0;state.event=buildEvent(state,'pirates',()=>.5);
  const before=JSON.stringify(state);
  assert.equal(dispatch(state,{type:'eventChoice',choiceId:'pay'}).ok,false);
  assert.equal(JSON.stringify(state),before);
});

check('Legacy and embedded encounter tolls charge the displayed amount',()=>{
  for (const embedded of [false,true]) {
    const state=sailing(),gold=state.gold;
    state.event=embedded?{id:'pirates',encounter:spawnEncounter(state,'pirates',()=>.5)}:{id:'pirates'};
    const toll=state.event.encounter?.toll??450;
    act(state,{type:'eventChoice',choiceId:'pay'});
    assert.equal(state.gold,gold-toll);
    assert.equal(state.event,null);
  }
});

check('All port jurisdictions and encounter types round-trip through event and combat saves',()=>{
  for (const portId of Object.keys(PORTS)) for (const progress of [0,900]) for (const kind of ['pirates','corsair','navy']) {
    const state=sailing(portId,portId==='lisbon'?'london':'lisbon',progress);
    state.event=buildEvent(state,kind,()=>0);
    assert.equal(validateSave(state),true,`${portId}/${progress}/${kind} event`);
    assert.deepEqual(parseSave(JSON.stringify(state)),state);
    act(state,{type:'eventChoice',choiceId:'fight'});
    assert.equal(validateSave(state),true,`${portId}/${progress}/${kind} combat`);
    assert.deepEqual(parseSave(JSON.stringify(state)),state);
  }
});

console.log(`${checks-failures}/${checks} fleet checks passed.`);
if (failures) process.exitCode=1;
