import { SHIP_TYPES, CANNONS } from '../../data/catalog.js';
import { UI, text } from '../../data/ui.js';
import { createShip } from '../../systems/fleet.js';
import { shipStats } from '../../systems/stats.js';
import { heading, art, button, meter, stat, number, sectionTitle, price, escape } from '../components.js';
import { FAMILIES, RANGES, WEIGHTS, rateLabel, compatibleCannons, cannonCard, historyNotes, batterySummary, shipSourceLink } from '../naval.js';

function buyButton(state,ship,style='primary') {
  const reason=!state.portId?'靠港后订购':state.fleet.length>=5?'舰队已满':state.gold<ship.price?'金币不足':UI.buyShip;
  return button(`${reason} · ${price(ship.price)}`,'game',{type:'buyShip','ship-type':ship.id},style,!state.portId||state.gold<ship.price||state.fleet.length>=5);
}

function shipDetail(state,ship) {
  const sample=createShip(ship.id,0),stats=shipStats(sample);
  const loadout=ship.family==='merchant'?'远洋商路：保留货仓、物资舱，以蛇炮自卫，兼顾续航与收益。':ship.maxGunWeight>=5?'战列混装：32 磅长炮负责远射，24 磅长炮节省弹耗，卡隆炮补充近战。':ship.maxGunWeight>=3?'巡航混装：长炮牵制远敌，卡隆炮在接近后输出；保留厨房与补给舱。':'轻装探索：蛇炮负责远射，旋回炮支援接舷；保留货仓与两间物资舱。';
  return `<section class="ship-dossier" id="ship-dossier"><div class="dossier-art"><div class="dossier-topline"><span class="eyebrow">NAVAL ARCHIVE / 舰船档案</span><span class="badge gold">${rateLabel(ship)}</span></div><span class="dossier-watermark" aria-hidden="true">${ship.rate?['','I','II','III','IV','V','VI'][ship.rate]:'✦'}</span>${art(ship.asset,ship.name)}<div class="dossier-caption"><span>${escape(ship.era)}</span><span>${ship.gunDecks?`${ship.gunDecks} 层主炮甲板`:'轻型帆装'} · ${ship.ratedGuns?`名义 ${ship.ratedGuns} 炮`:'非分级船型'}</span></div></div><div class="dossier-info"><p class="eyebrow">${FAMILIES[ship.family]} / ${escape(ship.role)}</p><h2>${escape(ship.name)}</h2><p class="dossier-description">${escape(ship.description)}</p><div class="stats-grid">${stat('船体耐久',ship.hull)}${stat('设计航速',`${ship.speed} 节`)}${stat('改装舱位',ship.slots)}${stat('默认火力',stats.firepower)}${stat('水手上限',stats.maxSailors)}${stat('炮架承重',WEIGHTS[ship.maxGunWeight])}</div><div class="dossier-armament"><h3>可装火炮 <span>${compatibleCannons(ship).length} 种</span></h3><p>${compatibleCannons(ship).map(c=>escape(c.name)).join(' · ')}</p></div><p class="loadout-suggestion">${loadout}</p><div class="dossier-order">${buyButton(state,ship)}<small>含默认船舱与火炮 · ${sample.sailors} 名水手</small>${shipSourceLink(ship)}</div></div></section>`;
}

function shipArchive(state,ui) {
  const filter=ui.shipFilter||'all';
  const ships=Object.values(SHIP_TYPES).filter(s=>filter==='all'||s.family===filter);
  const selected=ships.find(s=>s.id===ui.inspectedShip)||ships.find(s=>s.id==='first-rate')||ships[0];
  return `<div class="archive-intro"><div><h2>从轻帆，到海上堡垒</h2><p>以船体定使命，以火炮定战法。选择舰型，查看结构与配装。</p></div><span class="archive-count">${Object.keys(SHIP_TYPES).length}<small>种舰型</small></span></div><div class="archive-filters" aria-label="舰船类型筛选">${Object.entries(FAMILIES).map(([id,name])=>button(name,'ship-filter',{filter:id},filter===id?'outline active':'ghost')).join('')}</div>${shipDetail(state,selected)}<div class="ship-archive-grid">${ships.map(ship=>`<article class="archive-ship-card ${ship.id===selected.id?'selected':''}"><div class="row spread"><span class="badge ${ship.family==='line'?'gold':'dim'}">${rateLabel(ship)}</span><span class="small muted">${ship.ratedGuns?`${ship.ratedGuns} 炮`:FAMILIES[ship.family]}</span></div><button class="ship-art-button" data-action="inspect-ship" data-ship-type="${ship.id}" aria-label="查看${escape(ship.name)}详细资料" aria-pressed="${ship.id===selected.id}">${art(ship.asset,ship.name)}</button><h3>${escape(ship.name)}</h3><p>${escape(ship.role)} · ${ship.gunDecks?`${ship.gunDecks} 层炮甲板`:ship.era}</p><div class="ship-card-specs"><span>耐久 <b>${ship.hull}</b></span><span>航速 <b>${ship.speed}</b></span><span>舱位 <b>${ship.slots}</b></span></div><div class="row spread"><span class="ship-price">${price(ship.price)}</span>${button('查看舰型','inspect-ship',{'ship-type':ship.id},'tiny outline')}</div></article>`).join('')}</div>${historyNotes()}`;
}

function cannonArchive(ui) {
  const filter=ui.cannonFilter||'all';
  const cannons=Object.values(CANNONS).filter(c=>filter==='all'||c.range===filter);
  return `<div class="archive-intro"><div><h2>八种火炮，各有所长</h2><p>细长蛇炮、重型长炮、短管卡隆炮——看清结构，选择交战距离。</p></div><span class="archive-count">${Object.keys(CANNONS).length}<small>种火炮</small></span></div><div class="archive-filters" aria-label="火炮距离筛选">${Object.entries({all:'全部火炮',...RANGES}).map(([id,name])=>button(name,'cannon-filter',{filter:id},filter===id?'outline active':'ghost')).join('')}</div><p class="hint">每个炮台舱可独立装配一种炮组。弹耗按每艘船的炮组系数合计后向上取整；承重需求须低于或等于该舰炮架承重。</p><div class="cannon-grid">${cannons.map(c=>cannonCard(c,`<div class="cannon-card-footer"><span class="ship-price">${price(c.price)}</span>${button('前往配装','view',{view:'cabins'},'outline tiny')}</div>`)).join('')}</div>${historyNotes()}`;
}

function ownedFleet(state,d) {
  return `${sectionTitle('在役舰船',button(UI.repairAll,'game',{type:'repair'},'outline',!state.portId||!d.repairCost||state.gold<d.repairCost))}<div class="card-grid">${state.fleet.map((ship,i)=>{
    const type=SHIP_TYPES[ship.type],stats=d.ships.find(s=>s.id===ship.id);
    return `<article class="card ship-card"><div class="card-title"><h3>${escape(ship.name)}</h3><span class="badge ${i===0?'gold':''}">${i===0?UI.flagship:UI.escort}</span></div>${art(type.asset,type.name)}<div class="row spread small"><span>${escape(type.name)} · ${rateLabel(type)}</span><span class="muted">${UI.hull} ${ship.hull} / ${stats.maxHull}</span></div>${meter(ship.hull,stats.maxHull,'green')}<div class="stats-grid">${stat(UI.sailors,`${ship.sailors}/${stats.maxSailors}`)}${stat(UI.knots,stats.speed.toFixed(1))}${stat(UI.capacity,stats.cargoCapacity)}${stat(UI.firepower,stats.firepower)}${stat('齐射耗弹',stats.ammoPerVolley)}${stat(UI.slots,type.slots)}</div>${batterySummary(ship)}<div class="card-actions">${button('船舱与火炮配装','ship-cabins',{'ship-id':ship.id},'primary')}${button(`${UI.upgradeSails} ${ship.sails}/3 · ${price((ship.sails+1)*1200)}`,'game',{type:'upgrade','ship-id':ship.id,upgrade:'sails'},'',!state.portId||ship.sails>=3||state.gold<(ship.sails+1)*1200)}${button(`${UI.upgradeArmor} ${ship.armor}/3 · ${price((ship.armor+1)*1200)}`,'game',{type:'upgrade','ship-id':ship.id,upgrade:'armor'},'',!state.portId||ship.armor>=3||state.gold<(ship.armor+1)*1200)}${state.fleet.length>1?button(UI.sellShip,'sell-ship',{'ship-id':ship.id},'danger',!state.portId):''}</div></article>`;
  }).join('')}</div>`;
}

export function renderFleet(state,d,ui={}) {
  const tab=ui.fleetTab||'ships';
  return `${heading('舰队与造船厂','横跨帆船时代的舰船与军械，编成属于你的远洋舰队。','FLEET & ARMAMENT')}<div class="fleet-ledger"><span>${UI.fleetTitle} <strong>${text('fleetCount',{n:state.fleet.length})}</strong></span><span>舰队火力 <strong>${number(d.firepower)}</strong></span><span>齐射耗弹 <strong>${d.ammoPerVolley}</strong></span><span>持有金币 <strong class="gold">${number(state.gold)}</strong></span></div><nav class="naval-tabs" aria-label="舰队图鉴">${[['ships','舰船图鉴'],['cannons','火炮图鉴'],['owned','我的舰队']].map(([id,name])=>button(name,'fleet-tab',{tab:id},tab===id?'active':'ghost')).join('')}</nav>${tab==='cannons'?cannonArchive(ui):tab==='owned'?ownedFleet(state,d):shipArchive(state,ui)}`;
}
