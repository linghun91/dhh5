import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createGame,dispatch,derive,getVolley} from '../src/core/game.js';
import {parseSave,validateSave} from '../src/core/storage.js';
import {SHIP_TYPES,CANNONS,CABINS,PORTS} from '../src/data/catalog.js';
import {FACTIONS,PORT_FACTIONS,harborFleet,spawnEncounter,npcStats} from '../src/data/fleets.js';
import {createShip} from '../src/systems/fleet.js';
import {shipStats} from '../src/systems/stats.js';
import {beginCombat} from '../src/systems/combat.js';
import {random} from '../src/systems/common.js';

let checks=0;
const check=(name,fn)=>{fn();checks++;console.log(`✓ ${name}`);};
const act=(state,action)=>assert.equal(dispatch(state,action).ok,true,JSON.stringify(action));
const rejected=(state,action)=>{
  const before=JSON.stringify(state);
  assert.equal(dispatch(state,action).ok,false,JSON.stringify(action));
  assert.equal(JSON.stringify(state),before,'A rejected action must not mutate the save.');
};
function gameWith(type='caravel') {
  const state=createGame();
  state.gold=500000;
  state.fleet=[createShip(type,1)];
  return state;
}
function combatWith(type='caravel') {
  const state=gameWith(type);
  act(state,{type:'depart',targetId:'seville'});
  assert.equal(beginCombat(state).ok,true);
  // Keep the encounter alive so ammunition use is not obscured by victory loot.
  state.combat.hull=state.combat.maxHull=2000;
  return state;
}

check('The original twelve hulls keep their stats, and the expanded catalog can be purchased',()=>{
  assert.ok(Object.keys(SHIP_TYPES).length>=60);
  assert.ok(Object.keys(CANNONS).length>=60);
  const families={exploration:0,merchant:0,war:0};
  for (const type of Object.values(SHIP_TYPES)) {
    families[type.family]++;
    assert.equal(type.cabins.length,type.slots,type.id);
    assert.ok(type.sailors>=8,type.id);
    assert.ok(CANNONS[type.defaultCannon].weight<=type.maxGunWeight,type.id);
    assert.ok(existsSync(type.asset),type.asset);
    assert.ok(type.masts>=1&&type.rig,type.id);
    assert.equal(type.visual,type.id);
    assert.equal(type.asset,`assets/ships/${type.id}.svg`);
    const state=createGame();state.gold=500000;
    act(state,{type:'buyShip',shipType:type.id});
    const ship=state.fleet[1];
    assert.equal(ship.cabins.length,type.slots);
    assert.equal(ship.cannons.length,type.slots);
    assert.ok(ship.cannons.some(Boolean));
    assert.equal(validateSave(state),true,type.id);
    assert.deepEqual(parseSave(JSON.stringify(state)),state);
  }
  assert.ok(families.exploration>=20&&families.merchant>=20&&families.war>=20,JSON.stringify(families));
  for (const cannon of Object.values(CANNONS)) {
    assert.ok(existsSync(cannon.asset),cannon.asset);
    assert.equal(cannon.visual,cannon.id);
    assert.equal(cannon.asset,`assets/cannons/${cannon.id}.svg`);
  }
  assert.equal(SHIP_TYPES.caravel.price,6500);
  assert.equal(SHIP_TYPES.caravel.hull,160);
  assert.equal(SHIP_TYPES.caravel.defaultCannon,'culverin');
  assert.equal(SHIP_TYPES.sloop.price,4200);
  assert.equal(SHIP_TYPES.brig.defaultCannon,'long-9');
  assert.equal(SHIP_TYPES['first-rate'].slots,16);
  assert.equal(SHIP_TYPES.frigate.rate,5);
  assert.equal(SHIP_TYPES.frigate.ratedGuns,38);
  assert.equal(CANNONS['long-32'].price,2400);
  assert.equal(CANNONS['carronade-32'].weight,3);
  assert.equal(CANNONS.swivel.firepower,8);
});

check('Mixed batteries change range performance, boarding strength and ammunition',()=>{
  const state=gameWith('frigate'),ship=state.fleet[0],slot=ship.cabins.indexOf('cannon');
  const before=shipStats(ship),gold=state.gold;
  act(state,{type:'armCannon',shipId:ship.id,slot,cannonId:'carronade-32'});
  assert.equal(state.gold,gold-CANNONS['carronade-32'].price);
  assert.equal(ship.cannons[slot+1],'long-18');
  assert.ok(shipStats(ship).boarding>before.boarding);
  assert.ok(getVolley(state,'close').firepower>getVolley(state,'long').firepower);
  rejected(state,{type:'armCannon',shipId:ship.id,slot,cannonId:'carronade-32'});
});

check('Weight, port, funds, cannon-slot and catalog restrictions are atomic',()=>{
  const state=gameWith(),ship=state.fleet[0],base={type:'armCannon',shipId:ship.id,slot:4};
  for(const action of [
    {...base,cannonId:'long-32'}, {...base,cannonId:'__proto__'},
    {...base,cannonId:'unknown'}, {...base,cannonId:'swivel',slot:0},
    {...base,cannonId:'swivel',slot:-1}, {...base,cannonId:'swivel',slot:4.2},
    {...base,cannonId:'swivel',slot:90}, {...base,cannonId:'swivel',shipId:'missing'}
  ])rejected(state,action);
  state.gold=0;
  rejected(state,{...base,cannonId:'swivel'});
  state.gold=500000;
  act(state,{type:'depart',targetId:'seville'});
  rejected(state,{...base,cannonId:'swivel'});
});

check('Refitting a cabin clears its weapon and rebuilding includes the default gun',()=>{
  const state=gameWith(),ship=state.fleet[0];
  act(state,{type:'armCannon',shipId:ship.id,slot:4,cannonId:'swivel'});
  act(state,{type:'cabin',shipId:ship.id,slot:4,cabinId:'cargo'});
  assert.equal(ship.cannons[4],null);
  assert.equal(derive(state).batteryCount,0);
  assert.equal(derive(state).ammoPerVolley,0);
  const gold=state.gold;
  act(state,{type:'cabin',shipId:ship.id,slot:4,cabinId:'cannon'});
  assert.equal(ship.cannons[4],'culverin');
  assert.equal(state.gold,gold-CABINS.cannon.price-CANNONS.culverin.price);
  assert.equal(validateSave(state),true);
});

check('Dismantling and rebuilding a battery cannot discount its default heavy cannon',()=>{
  const state=gameWith('first-rate'),ship=state.fleet[0],slot=ship.cabins.indexOf('cannon');
  act(state,{type:'armCannon',shipId:ship.id,slot,cannonId:'swivel'});
  const direct=structuredClone(state),rebuilt=structuredClone(state),gold=state.gold;
  act(direct,{type:'armCannon',shipId:ship.id,slot,cannonId:'long-32'});
  act(rebuilt,{type:'cabin',shipId:ship.id,slot,cabinId:'supply'});
  act(rebuilt,{type:'cabin',shipId:ship.id,slot,cabinId:'cannon'});
  assert.deepEqual(rebuilt.fleet,direct.fleet,'Both purchase paths reach the same configuration.');
  assert.ok(gold-rebuilt.gold>gold-direct.gold,'Rebuilding must include cannon cost and construction work.');
  assert.equal(validateSave(rebuilt),true);
  const short=structuredClone(state);
  act(short,{type:'cabin',shipId:ship.id,slot,cabinId:'supply'});
  short.gold=3099;
  rejected(short,{type:'cabin',shipId:ship.id,slot,cabinId:'cannon'});
  short.gold=3100;
  act(short,{type:'cabin',shipId:ship.id,slot,cabinId:'cannon'});
  assert.equal(short.gold,0,'A 32-pounder battery costs 700 construction plus 2400 for the gun.');
});

check('Volley ammunition rounds up once per armed ship and excludes unarmed ships',()=>{
  const state=gameWith('brig');
  assert.equal(derive(state).ammoPerVolley,1,'Two light batteries share one ammo unit.');
  state.fleet.push(createShip('brig',2));state.nextShipId=3;
  assert.equal(derive(state).ammoPerVolley,2,'Each ship rounds separately.');
  act(state,{type:'cabin',shipId:'ship-2',slot:3,cabinId:'cargo'});
  act(state,{type:'cabin',shipId:'ship-2',slot:4,cabinId:'cargo'});
  assert.equal(derive(state).ammoPerVolley,1);
  assert.equal(getVolley(state,'long').ammo,1);
});

check('Combat spends the actual heavy battery ammunition and insufficient ammo costs no turn',()=>{
  const state=combatWith('first-rate');
  assert.ok(getVolley(state).ammo>state.fleet.length);
  const ammo=state.supplies.ammo,required=getVolley(state,'medium').ammo,hull=state.combat.hull;
  act(state,{type:'battle',move:'cannon'});
  assert.equal(state.supplies.ammo,ammo-required);
  assert.ok(state.combat.hull<hull);
  state.supplies.ammo=required-1;
  rejected(state,{type:'battle',move:'cannon'});
});

check('Distance maneuvers take a turn with retaliation, and boarding requires close range',()=>{
  const state=combatWith(),hull=state.fleet[0].hull,ammo=state.supplies.ammo;
  assert.equal(state.combat.range,'medium');
  rejected(state,{type:'battle',move:'board'});
  act(state,{type:'battle',move:'withdraw'});
  assert.equal(state.combat.range,'long');
  assert.equal(state.combat.round,2);
  assert.ok(state.fleet[0].hull<hull);
  assert.equal(state.supplies.ammo,ammo);
  rejected(state,{type:'battle',move:'withdraw'});
  act(state,{type:'battle',move:'approach'});
  act(state,{type:'battle',move:'approach'});
  assert.equal(state.combat.range,'close');
  rejected(state,{type:'battle',move:'approach'});
  const enemyCrew=state.combat.sailors;
  act(state,{type:'battle',move:'board'});
  assert.ok(!state.combat||state.combat.sailors<enemyCrew);
});

check('The same cannon volley hits harder at its preferred distance using equal RNG seeds',()=>{
  const base=combatWith('frigate');
  base.fleet[0].cannons=base.fleet[0].cabins.map(id=>id==='cannon'?'carronade-32':null);
  const near=structuredClone(base),far=structuredClone(base);
  near.combat.range='close';far.combat.range='long';
  act(near,{type:'battle',move:'cannon'});
  act(far,{type:'battle',move:'cannon'});
  assert.ok(near.combat.hull<far.combat.hull);
  assert.equal(near.supplies.ammo,far.supplies.ammo);
  const longGun=combatWith('frigate');
  assert.ok(getVolley(longGun,'long').firepower>getVolley(longGun,'medium').firepower);
  assert.ok(getVolley(longGun,'medium').firepower>getVolley(longGun,'close').firepower);
});

check('An unarmed fleet cannot fire a free volley',()=>{
  const state=gameWith();
  act(state,{type:'cabin',shipId:'ship-1',slot:4,cabinId:'cargo'});
  act(state,{type:'depart',targetId:'seville'});
  beginCombat(state);
  rejected(state,{type:'battle',move:'cannon'});
});

check('Old saves migrate default guns and mid-range combat without losing custom cabins',()=>{
  const state=gameWith('galleon');
  act(state,{type:'cabin',shipId:'ship-1',slot:0,cabinId:'cannon'});
  act(state,{type:'depart',targetId:'seville'});
  beginCombat(state);
  delete state.fleet[0].cannons;
  delete state.combat.range;
  const loaded=parseSave(JSON.stringify(state));
  assert.equal(loaded.combat.range,'medium');
  assert.equal(loaded.fleet[0].cannons[0],'demi-cannon');
  assert.deepEqual(loaded.fleet[0].cabins,state.fleet[0].cabins);
  assert.equal(validateSave(loaded),true);
  assert.equal(derive(loaded).batteryCount,4);
});

check('Malformed, overweight and orphaned loadouts fail validation and import',()=>{
  const mutations=[
    s=>{s.fleet[0].cannons=null;}, s=>{s.fleet[0].cannons=[];},
    s=>{s.fleet[0].cannons[4]=null;}, s=>{s.fleet[0].cannons[4]='unknown';},
    s=>{s.fleet[0].cannons[4]='__proto__';}, s=>{s.fleet[0].cannons[4]='long-32';},
    s=>{s.fleet[0].cannons[0]='swivel';}, s=>{s.fleet[0].cabins.push('cannon');},
    s=>{s.fleet[0]=null;}, s=>{s.combat.range='far-away';},
    s=>{s.combat.range=null;}
  ];
  for(const mutate of mutations) {
    const state=combatWith();mutate(state);
    assert.equal(validateSave(state),false);
    assert.throws(()=>parseSave(JSON.stringify(state)),/invalid-save/);
  }
  assert.throws(()=>parseSave(null),/invalid-save/);
});

check('Faction harbours, pirate dens and combat encounters use catalog ships',()=>{
  assert.equal(Object.keys(PORT_FACTIONS).length,Object.keys(PORTS).length);
  for (const port of Object.values(PORTS)) {
    const harbor=harborFleet(port.id);
    assert.ok(harbor.faction&&harbor.ships.length>=2,port.id);
    for (const id of harbor.ships) assert.ok(SHIP_TYPES[id],`${port.id} ${id}`);
  }
  const state=createGame();
  act(state,{type:'depart',targetId:'seville'});
  const pirates=spawnEncounter(state,'pirates',random);
  const navy=spawnEncounter(state,'navy',random);
  const corsair=spawnEncounter(state,'corsair',random);
  assert.equal(pirates.kind,'pirates');
  assert.equal(navy.factionId,'portugal');
  assert.equal(corsair.kind,'corsair');
  assert.ok(pirates.ships.length>=1&&navy.ships.length>=1);
  assert.ok(pirates.hull>=40&&navy.firepower>=6);
  assert.notEqual(pirates.name,navy.name);
  const london=createGame();london.portId='london';
  act(london,{type:'depart',targetId:'amsterdam'});
  const royal=spawnEncounter(london,'navy',random);
  assert.equal(royal.factionId,'england');
  assert.ok(royal.ships.includes('frigate')||SHIP_TYPES[royal.ships[0]].family==='war');
  assert.ok(npcStats(['first-rate'],3).hull>npcStats(['sloop'],1).hull);
});

check('Combat records the opposing fleet and navy papers can avoid a fight',()=>{
  const state=combatWith('caravel');
  assert.ok(Array.isArray(state.combat.ships)&&state.combat.ships.length>=1);
  assert.ok(SHIP_TYPES[state.combat.flagship]);
  assert.equal(state.combat.kind,'pirates');
  const papers=createGame();
  papers.gold=500000;papers.reputation=40;
  act(papers,{type:'depart',targetId:'seville'});
  papers.event={id:'navy',toll:360,encounter:spawnEncounter(papers,'navy',random)};
  act(papers,{type:'eventChoice',choiceId:'salute'});
  assert.equal(papers.combat,null);
  assert.ok(papers.reputation>=45);
  const toll=createGame();
  toll.gold=500000;
  act(toll,{type:'depart',targetId:'seville'});
  toll.event={id:'pirates',toll:520,encounter:spawnEncounter(toll,'pirates',random)};
  act(toll,{type:'eventChoice',choiceId:'pay'});
  assert.equal(toll.gold,500000-520);
  assert.equal(toll.combat,null);
});

console.log(`${checks} naval integration checks passed.`);
