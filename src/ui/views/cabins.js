import { CABINS, SHIP_TYPES, CANNONS } from '../../data/catalog.js';
import { UI, text } from '../../data/ui.js';
import { shipStats } from '../../systems/stats.js';
import { cabinCost } from '../../systems/fleet.js';
import { heading, art, button, stat, sectionTitle, price, escape } from '../components.js';
import { WEIGHTS, cannonAt, cannonCard, batterySummary, rateLabel } from '../naval.js';

function renderArmory(state,ship,stats,slot) {
  const type=SHIP_TYPES[ship.type],current=cannonAt(ship,slot);
  if(!current)return `<section class="armory-empty panel"><div>${art(CANNONS[type.defaultCannon].asset,CANNONS[type.defaultCannon].name)}<div><h3>为这艘船配置火炮</h3><p>选择上方已有的炮台，或将当前舱位改为炮台，再逐组选择火炮。</p></div></div>${button('将此舱改为炮台 · '+price(cabinCost(ship,'cannon')),'game',{type:'cabin','ship-id':ship.id,slot,'cabin-id':'cannon'},'outline',!state.portId||state.gold<cabinCost(ship,'cannon'))}</section>`;
  return `<section class="armory-section">${sectionTitle(`舱位 ${slot+1} · 火炮配装`,`<span class="badge gold">炮架承重：${WEIGHTS[type.maxGunWeight]}</span>`)}<div class="armory-current"><div>${art(current.asset,current.name)}<div><small>当前炮组</small><h3>${escape(current.name)}</h3><p>单独更换此炮台，其他炮台可保留不同炮型。</p></div></div><span class="badge">已装配</span></div><p class="hint">下方预览换装后的整船基础火力与齐射耗弹。换炮收取全价，旧炮不折现；新建炮台收取炮台费与默认炮价。承重、射程和弹耗均为游戏规则。</p><div class="cannon-grid refit-grid">${Object.values(CANNONS).map(cannon=>{
    const selected=cannon.id===current.id,compatible=cannon.weight<=type.maxGunWeight;
    const cannons=ship.cabins.map((_,i)=>cannonAt(ship,i)?.id||null);cannons[slot]=cannon.id;
    const preview=shipStats({...ship,cannons});
    const reason=selected?'当前装备':!compatible?'超过炮架承重':!state.portId?'靠港后换装':state.gold<cannon.price?'金币不足':'装配此炮';
    const delta=preview.firepower-stats.firepower;
    const previewText=compatible?`<div class="refit-preview"><span>整船火力 <b>${preview.firepower}</b> <em class="${delta>=0?'green':'red'}">${delta>=0?'+':''}${delta}</em></span><span>齐射 <b>${preview.ammoPerVolley}</b> 弹</span></div>`:`<p class="refit-preview muted">需要${WEIGHTS[cannon.weight]}炮架 · 当前为${WEIGHTS[type.maxGunWeight]}</p>`;
    return cannonCard(cannon,`${previewText}${button(`${reason}${selected?'':` · ${price(cannon.price)}`}`,'game',{type:'armCannon','ship-id':ship.id,slot,'cannon-id':cannon.id},selected?'ghost':compatible?'outline':'ghost',selected||!compatible||!state.portId||state.gold<cannon.price)}`,selected);
  }).join('')}</div></section>`;
}

export function renderCabins(state,d,ui) {
  const ship=state.fleet.find(s=>s.id===ui.selectedShip)||state.fleet[0];
  const stats=d.ships.find(s=>s.id===ship.id),type=SHIP_TYPES[ship.type];
  const slot=Math.max(0,Math.min(ui.cabinSlot||0,ship.cabins.length-1));
  return `${heading('船舱与火炮配装','每一处舱位，都是航速、货运、续航与战力之间的取舍。','SHIP CONFIGURATION')}<div class="tab-row">${state.fleet.map(s=>button(s.name,'select-ship',{'ship-id':s.id},s.id===ship.id?'active outline':'')).join('')}</div><section class="loadout-overview panel">${art(type.asset,type.name)}<div><span class="eyebrow">${rateLabel(type)} / ${escape(type.role)}</span><h2>${escape(ship.name)}</h2>${batterySummary(ship)}</div><div class="stats-grid">${stat('基础火力',stats.firepower)}${stat('齐射耗弹',stats.ammoPerVolley)}${stat('炮组数量',stats.batteryCount)}${stat(UI.capacity,stats.cargoCapacity)}${stat(UI.supplyCapacity,stats.supplyCapacity)}${stat(UI.sailors,stats.maxSailors)}</div></section><div class="deck-scene naval-deck">${art('assets/ship-deck.svg',type.name,'deck-background')}<div class="deck-cabins" style="--cabin-columns:${Math.min(6,Math.ceil(ship.cabins.length/2))}">${ship.cabins.map((id,i)=>{
    const cannon=cannonAt(ship,i),item=cannon||CABINS[id];
    return `<button class="deck-cabin ${i===slot?'active':''} ${cannon?'armed':''}" data-action="cabin-slot" data-slot="${i}" aria-pressed="${i===slot}"><small>${text('cabinSlot',{n:i+1})} ${cannon?'· 炮台':''}</small>${art(item.asset,item.name)}<span>${escape(item.name)}</span></button>`;
  }).join('')}</div></div><p class="hint">${state.portId?'点击舱位查看配置。炮台可分别装备不同火炮；货仓、物资舱改装须保留足够容量。':UI.atPortOnly}</p>${renderArmory(state,ship,stats,slot)}<section class="cabin-refit-section">${sectionTitle(`${text('cabinSlot',{n:slot+1})} · ${UI.chooseCabin}`)}<div class="cabin-options">${Object.values(CABINS).map(cabin=>`<article class="cabin-option">${art(cabin.asset,cabin.name)}<div><h3>${cabin.name}</h3><p>${cabin.id==='cannon'?`新增一个炮组，含${CANNONS[type.defaultCannon].name}；之后可独立换炮。`:cabin.description}</p>${button(ship.cabins[slot]===cabin.id?UI.refitCurrent:`${UI.refit} · ${price(cabinCost(ship,cabin.id))}`,'game',{type:'cabin','ship-id':ship.id,slot,'cabin-id':cabin.id},ship.cabins[slot]===cabin.id?'ghost':'outline',!state.portId||ship.cabins[slot]===cabin.id||state.gold<cabinCost(ship,cabin.id))}</div></article>`).join('')}</div></section>`;
}
