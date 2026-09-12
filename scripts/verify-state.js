import assert from 'node:assert/strict';
import {createGame,dispatch,derive} from '../src/core/game.js';
import {parseSave,validateSave} from '../src/core/storage.js';
import {SHIP_TYPES,CABINS,CANNONS} from '../src/data/catalog.js';
import {spawnEncounter} from '../src/data/fleets.js';
import {createShip} from '../src/systems/fleet.js';
import {beginCombat} from '../src/systems/combat.js';
import {random} from '../src/systems/common.js';

let checks=0;
const check=(name,fn)=>{fn();checks++;console.log(`✓ ${name}`);};
const act=(state,action)=>assert.equal(dispatch(state,action).ok,true,JSON.stringify(action));
const rejected=(state,action)=>{
  const before=JSON.stringify(state);
  assert.equal(dispatch(state,action).ok,false,JSON.stringify(action));
  assert.equal(JSON.stringify(state),before,'Rejected fleet management must preserve the entire save.');
};
function seaEvent(kind='pirates') {
  const state=createGame();
  act(state,{type:'depart',targetId:'seville'});
  const encounter=spawnEncounter(state,kind,random);
  state.event={id:kind,toll:encounter.toll,encounter};
  return state;
}
function invalidSave(state) {
  assert.equal(validateSave(state),false);
  assert.throws(()=>parseSave(JSON.stringify(state)),/invalid-save/);
}

check('Imported encounters reject negative tolls, broken fleet identities and invalid statistics',()=>{
  const mutations=[
    s=>{s.event.toll=-500;}, s=>{s.event.toll='500';}, s=>{s.event.toll=0;},
    s=>{s.event.encounter=null;}, s=>{s.event.encounter.ships=['missing'];},
    s=>{s.event.encounter.ships=[];}, s=>{s.event.encounter.flagship='first-rate';},
    s=>{s.event.encounter.kind='navy';}, s=>{s.event.encounter.factionId='england';},
    s=>{s.event.encounter.name='<img src=x>';}, s=>{s.event.encounter.reward=-1;},
    s=>{s.event.encounter.hull=s.event.encounter.maxHull+1;},
    s=>{s.event.encounter.maxHull=0;}, s=>{s.event.encounter.sailors=.5;},
    s=>{s.event.encounter.firepower='50';}, s=>{s.event.encounter.toll=-1;},
    s=>{s.event.encounter.patrolPortId='missing';},
    s=>{s.event.encounter.firepowerByRange={close:5,medium:10};},
    s=>{s.event.encounter.firepowerByRange={close:5,medium:10,long:-3};},
    s=>{s.event.id='storm';}
  ];
  for(const mutate of mutations){const state=seaEvent();mutate(state);invalidSave(state);}
  for(const kind of ['pirates','navy','corsair']) {
    const state=seaEvent(kind);
    assert.deepEqual(parseSave(JSON.stringify(state)),state,kind);
    const loaded=parseSave(JSON.stringify(state)),gold=loaded.gold;
    act(loaded,{type:'eventChoice',choiceId:'pay'});
    assert.equal(loaded.gold,gold-state.event.toll,kind);
    assert.equal(validateSave(loaded),true,kind);
  }
});

check('Combat metadata validates as a fleet and legacy combat remains importable',()=>{
  const base=seaEvent('navy'),encounter=base.event.encounter;
  base.event=null;
  assert.equal(beginCombat(base,encounter).ok,true);
  assert.equal(validateSave(base),true);
  const mutations=[
    s=>{s.combat.factionId='pirates';}, s=>{s.combat.flagship='dinghy';},
    s=>{delete s.combat.ships;}, s=>{s.combat.maxSailors=0;},
    s=>{s.combat.patrolPortId='havana';},
    s=>{s.combat.firepowerByRange={close:5,medium:10,long:'20'};}
  ];
  for(const mutate of mutations){const state=structuredClone(base);mutate(state);invalidSave(state);}
  const legacy=structuredClone(base);
  for(const field of ['kind','factionId','ships','flagship','gunRange','range','patrolPortId','firepowerByRange']) delete legacy.combat[field];
  delete legacy.fleet[0].cannons;
  const loaded=parseSave(JSON.stringify(legacy));
  assert.equal(loaded.combat.range,'medium');
  assert.equal(loaded.fleet[0].cannons[4],SHIP_TYPES.caravel.defaultCannon);
  assert.equal(validateSave(loaded),true);
  for(const kind of ['pirates','navy','corsair']) {
    const state=seaEvent(kind);state.event={id:kind};
    assert.equal(validateSave(parseSave(JSON.stringify(state))),true,kind);
  }
});

check('Ship identity counters cannot import duplicate future purchase IDs',()=>{
  const base=createGame();base.fleet.push(createShip('dinghy',2));base.nextShipId=3;
  assert.equal(validateSave(base),true);
  for(const id of ['ship-0','ship-01','ship-1000000000001']) {
    const state=structuredClone(base);state.fleet[1].id=id;invalidSave(state);
  }
  for(const nextShipId of [2,1]) {
    const state=structuredClone(base);state.nextShipId=nextShipId;invalidSave(state);
  }
  const loaded=parseSave(JSON.stringify(base));
  act(loaded,{type:'buyShip',shipType:'dinghy'});
  assert.deepEqual(loaded.fleet.map(ship=>ship.id),['ship-1','ship-2','ship-3']);
  assert.equal(validateSave(loaded),true);
});

check('Every hull, compatible cannon, cabin conversion and upgrade preserves valid parameters',()=>{
  let actions=0;
  for(const type of Object.values(SHIP_TYPES)) {
    const base=createGame();base.gold=1000000;base.fleet=[createShip(type.id,1)];
    base.supplies={food:0,water:0,ammo:0,repair:0};
    const stats=derive(base);
    assert.ok(base.fleet[0].sailors>=8&&base.fleet[0].sailors<=stats.maxSailors,type.id);
    assert.ok(stats.cargoCapacity>0&&stats.supplyCapacity>0&&stats.speed>0,type.id);
    assert.ok(Number.isInteger(stats.ammoPerVolley)&&stats.ammoPerVolley>0,type.id);
    for(let slot=0;slot<type.slots;slot++)for(const cabinId of Object.keys(CABINS)) {
      const state=structuredClone(base),action={type:'cabin',shipId:'ship-1',slot,cabinId};
      if(type.cabins[slot]===cabinId)rejected(state,action);
      else {act(state,action);assert.equal(validateSave(state),true,`${type.id} ${slot} ${cabinId}`);actions++;}
    }
    const slot=type.cabins.indexOf('cannon');
    for(const cannon of Object.values(CANNONS)) {
      const state=structuredClone(base),action={type:'armCannon',shipId:'ship-1',slot,cannonId:cannon.id};
      if(cannon.weight>type.maxGunWeight||cannon.id===type.defaultCannon)rejected(state,action);
      else {act(state,action);assert.equal(validateSave(state),true,`${type.id} ${cannon.id}`);actions++;}
    }
    for(const upgrade of ['armor','sails']) {
      const state=structuredClone(base),action={type:'upgrade',shipId:'ship-1',upgrade};
      for(let i=0;i<3;i++){act(state,action);assert.equal(validateSave(state),true,`${type.id} ${upgrade}`);actions++;}
      rejected(state,action);
    }
  }
  assert.ok(actions>6000,actions);
});

check('Selling and refitting retain loaded cargo, supplies and ship-specific sailor capacity',()=>{
  const state=createGame();state.gold=1000000;
  act(state,{type:'buyShip',shipType:'dinghy'});
  state.cargo.grain={quantity:121,cost:40};
  rejected(state,{type:'sellShip',shipId:'ship-1'});
  rejected(state,{type:'sellShip',shipId:'ship-2'});
  rejected(state,{type:'cabin',shipId:'ship-1',slot:0,cabinId:'marine'});
  delete state.cargo.grain;
  state.supplies.food=145;
  rejected(state,{type:'sellShip',shipId:'ship-1'});
  rejected(state,{type:'cabin',shipId:'ship-1',slot:2,cabinId:'cargo'});
  state.supplies={food:0,water:0,ammo:0,repair:0};
  act(state,{type:'sellShip',shipId:'ship-2'});
  rejected(state,{type:'sellShip',shipId:'ship-1'});
  act(state,{type:'cabin',shipId:'ship-1',slot:0,cabinId:'marine'});
  act(state,{type:'hireSailors',quantity:derive(state).maxSailors-derive(state).sailors});
  rejected(state,{type:'cabin',shipId:'ship-1',slot:0,cabinId:'cargo'});
  rejected(state,{type:'hireSailors',quantity:1});
  assert.equal(validateSave(state),true);
});

console.log(`${checks} save and fleet boundary checks passed.`);
