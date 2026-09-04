import { CABINS, SHIP_TYPES } from '../../data/catalog.js';
import { UI, text } from '../../data/ui.js';
import { heading, art, button, stat, sectionTitle, price } from '../components.js';

export function renderCabins(state,d,ui) {
  const ship=state.fleet.find(s=>s.id===ui.selectedShip)||state.fleet[0];
  const stats=d.ships.find(s=>s.id===ship.id);
  const slot=Math.min(ui.cabinSlot,ship.cabins.length-1);
  return `${heading(UI.cabinsTitle,UI.cabinsSub)}<div class="tab-row">${state.fleet.map(s=>button(s.name,'select-ship',{'ship-id':s.id},s.id===ship.id?'active outline':'')).join('')}</div><div class="deck-scene">${art('assets/ship-deck.svg',SHIP_TYPES[ship.type].name,'deck-background')}<div class="deck-cabins" style="--cabin-columns:${Math.ceil(ship.cabins.length/2)}">${ship.cabins.map((id,i)=>`<button class="deck-cabin ${i===slot?'active':''}" data-action="cabin-slot" data-slot="${i}"><small>${text('cabinSlot',{n:i+1})}</small>${art(CABINS[id].asset,CABINS[id].name)}<span>${CABINS[id].name}</span></button>`).join('')}</div></div><div class="panel journal-stats"><div class="stats-grid">${stat(UI.capacity,stats.cargoCapacity)}${stat(UI.supplyCapacity,stats.supplyCapacity)}${stat(UI.firepower,stats.firepower)}${stat(UI.sailors,stats.maxSailors)}</div><p class="hint">${state.portId?UI.cabinHint:UI.atPortOnly}</p></div>${sectionTitle(`${text('cabinSlot',{n:slot+1})} · ${UI.chooseCabin}`)}<div class="cabin-options">${Object.values(CABINS).map(cabin=>`<article class="cabin-option">${art(cabin.asset,cabin.name)}<div><h3>${cabin.name}</h3><p>${cabin.description}</p>${button(ship.cabins[slot]===cabin.id?UI.refitCurrent:`${UI.refit} · ${price(cabin.price)}`,'game',{type:'cabin','ship-id':ship.id,slot,'cabin-id':cabin.id},ship.cabins[slot]===cabin.id?'ghost':'outline',!state.portId||ship.cabins[slot]===cabin.id||state.gold<cabin.price)}</div></article>`).join('')}</div>`;
}
