import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createGame,derive,dispatch} from '../src/core/game.js';
import * as catalog from '../src/data/catalog.js';
import {buildEvent} from '../src/data/fleets.js';
import {random} from '../src/systems/common.js';
import {createShip} from '../src/systems/fleet.js';
import {renderFleet} from '../src/ui/views/fleet.js';
import {renderCabins} from '../src/ui/views/cabins.js';
import {renderPort} from '../src/ui/views/port.js';
import {eventDialog,battleDialog} from '../src/ui/dialogs.js';
import {CANNON_KINDS,RANGES,progression} from '../src/ui/naval.js';

const assets=new Set();
let renders=0;
function verifyMarkup(html) {
  assert.doesNotMatch(html,/\b(?:undefined|NaN)\b/);
  for (const [,path] of html.matchAll(/(?:src|href)="\.\/(assets\/[^"<>]+)"/g)) assets.add(path);
  renders++;
  return html;
}
// Exercise consumers of the complete catalogs: new hulls, every cabin slot,
// all ports, every filter combination and all three NPC encounter kinds.
for (const value of Object.values(catalog)) {
  if (!value||typeof value!=='object') continue;
  for (const item of Object.values(value)) if (item?.asset) assets.add(item.asset);
}
for (const family of ['exploration','merchant','war']) {
  const line=progression(family);
  assert.ok(line.length>=20);
  for (const type of line) {
    const state=createGame();state.fleet=[createShip(type.id,1)];
    const d=derive(state);
    const html=verifyMarkup(renderFleet(state,d,{shipFilter:family,inspectedShip:type.id}));
    assert.ok(html.includes(`src="./${type.asset}"`));
    assert.ok(html.includes('默认物资容量'));
    for (let cabinSlot=0;cabinSlot<type.slots;cabinSlot++) verifyMarkup(renderCabins(state,d,{cabinSlot}));
  }
}
for (const cannonFilter of ['all',...Object.keys(RANGES)]) for (const cannonKind of Object.keys(CANNON_KINDS)) {
  const state=createGame(),d=derive(state);
  const expected=Object.values(catalog.CANNONS).filter(c=>(cannonFilter==='all'||c.range===cannonFilter)&&(cannonKind==='all'||c.kind===cannonKind));
  const html=verifyMarkup(renderFleet(state,d,{fleetTab:'cannons',cannonFilter,cannonKind}));
  assert.equal([...html.matchAll(/<article class="cannon-card /g)].length,expected.length);
  if (!expected.length) assert.ok(html.includes('reset-cannon-filters'));
}
for (const port of Object.values(catalog.PORTS)) for (const facility of Object.keys(catalog.FACILITIES)) {
  const state=createGame();state.portId=port.id;
  verifyMarkup(renderPort(state,derive(state),{facility}));
}
for (const kind of ['navy','pirates','corsair']) {
  const state=createGame();
  assert.ok(dispatch(state,{type:'depart',targetId:'seville'}).ok);
  state.event=buildEvent(state,kind,random);state.gold=0;
  const html=verifyMarkup(eventDialog(state));
  assert.match(html,/data-choice-id="pay"[^>]*disabled/);
  if (kind==='navy') assert.ok(html.includes('data-choice-id="inspect"'));
  assert.ok(dispatch(state,{type:'eventChoice',choiceId:'fight'}).ok);
  verifyMarkup(battleDialog(state,derive(state)));
}
for (const path of assets) {
  assert.ok(existsSync(path),`Missing runtime asset: ${path}`);
  assert.match(readFileSync(path,'utf8'),/<svg\b/,path);
}
console.log(`✓ ${renders} catalog, loadout, port and encounter views rendered; ${assets.size} referenced assets present.`);
