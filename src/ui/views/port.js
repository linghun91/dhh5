import { PORTS, REGIONS, GOODS, CREW, SUPPLIES, FACILITIES } from '../../data/catalog.js';
import { UI, text } from '../../data/ui.js';
import { PORT_UI as P } from '../../data/port-ui.js';
import { quote } from '../../core/game.js';
import { art, asset, button, escape, heading, icon, locked, meter, number, price, sectionTitle, stat, empty } from '../components.js';

const gameButton = (label, type, data = {}, style = '', disabled = false) => button(label, 'game', { type, ...data }, style, disabled);
const quantity = (label, value = 1) => `<input class="input quantity-input" type="number" name="quantity" min="1" step="1" value="${value}" aria-label="${escape(label)}" required>`;
const facilityHeading = (title, sub) => `<div class="facility-heading"><h2>${title}</h2><p class="muted">${sub}</p></div>`;
const ratio = (value, max) => `${number(value)}${P.separator}${number(max)}`;

function renderMarket(state, derived) {
  const signed = state.contracts[state.portId];
  const agreement = `<div class="contract-banner ${signed ? 'signed' : ''}"><div>${icon(signed ? 'check' : 'book')}<span>${signed ? UI.signed : UI.contractHint}</span></div>${signed ? `<span class="muted small">${P.contractActive}</span>` : gameButton(`${UI.contract} · ${price(derived.contractCost)}`, 'contract', {}, 'primary', state.gold < derived.contractCost)}</div>`;
  const rows = Object.values(GOODS).map(good => {
    const offer = quote(state, state.portId, good.id);
    const held = state.cargo[good.id];
    const owned = held?.quantity || 0;
    const cost = owned ? held.cost : 0;
    const profit = owned ? offer.sell - cost : 0;
    return `<tr>
      <td><div class="market-product">${art(good.asset, good.name)}<div><strong>${escape(good.name)}</strong><small class="muted">${escape(good.description)}</small></div></div></td>
      <td class="gold">${number(offer.buy)}</td><td>${number(offer.sell)}</td><td>${number(offer.stock)}</td><td>${number(owned)}</td>
      <td>${owned ? number(cost) : P.noCost}${owned ? `<small class="${profit >= 0 ? 'positive' : 'negative'}" title="${P.unitProfit}">${profit >= 0 ? P.plus : ''}${number(profit)}</small>` : ''}</td>
      <td><form class="trade-row">${quantity(P.tradeQuantity)}${gameButton(UI.buy, 'trade', { 'good-id': good.id, side: 'buy' }, 'small primary', !signed || offer.stock <= 0 || state.gold < offer.buy || derived.cargoUsed >= derived.cargoCapacity)}${gameButton(UI.sell, 'trade', { 'good-id': good.id, side: 'sell' }, 'small', !owned)}</form></td>
    </tr>`;
  }).join('');
  return `${facilityHeading(UI.marketTitle, UI.marketSub)}${agreement}${sectionTitle(P.marketStock, `<span class="muted small">${P.cargoLoad} ${ratio(derived.cargoUsed, derived.cargoCapacity)}</span>`)}<div class="table-scroll"><table class="market-table"><thead><tr>${[UI.product, UI.buyPrice, UI.sellPrice, UI.stock, UI.hold, P.unitCost, P.actions].map(label => `<th>${label}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderDock(state, derived) {
  const supplies = Object.values(SUPPLIES).map(supply => `<article class="supply-card card">
    ${art(supply.asset, supply.name)}<div><h3>${escape(supply.name)}</h3><p class="muted small">${UI.hold} ${number(state.supplies[supply.id])} · ${price(supply.price)}</p></div>
    <form class="trade-row">${quantity(P.purchaseQuantity, 5)}${gameButton(UI.buy, 'supply', { 'supply-id': supply.id }, 'small primary', state.gold < supply.price || derived.supplyUsed >= derived.supplyCapacity)}</form>
  </article>`).join('');
  return `${facilityHeading(UI.dockTitle, UI.dockSub)}<div class="stats-grid">${stat(UI.supplyCapacity, ratio(derived.supplyUsed, derived.supplyCapacity))}${stat(UI.sailors, ratio(derived.sailors, derived.maxSailors))}${stat(UI.hull, ratio(derived.hull, derived.maxHull))}${stat(UI.provisions, text('endurance', { n: derived.endurance }))}</div>
    ${sectionTitle(P.fleetService)}<div class="service-actions">${gameButton(`${UI.refill} · ${price(derived.refillCost)}`, 'refill', {}, 'primary', state.gold < derived.refillCost || !derived.refillCost)}${gameButton(`${UI.repairAll} · ${price(derived.repairCost)}`, 'repair', {}, '', state.gold < derived.repairCost || derived.hull >= derived.maxHull)}<form class="trade-row">${quantity(P.sailorQuantity, Math.min(5, Math.max(1, derived.maxSailors - derived.sailors)))}${gameButton(UI.recruitSailors, 'hireSailors', {}, '', derived.sailors >= derived.maxSailors)}<span class="muted small">${UI.sailorCost}</span></form></div>
    ${sectionTitle(P.resupply)}<div class="supply-grid">${supplies}</div>`;
}

function renderTavern(state, derived) {
  const crew = derived.availableCrew.map(id => {
    const person = CREW[id];
    return `<article class="crew-recruit card">${art(person.asset, person.name, 'portrait')}<div><h3>${escape(person.name)}</h3><p class="muted">${escape(person.description)}</p><div class="crew-skill-list">${Object.keys(UI.skills).map(skill => `<span>${UI.skills[skill]} <strong>${number(person[skill])}</strong></span>`).join('')}</div>${gameButton(`${UI.recruit} · ${price(person.price)}`, 'recruit', { 'crew-id': id }, 'primary', state.gold < person.price)}</div></article>`;
  }).join('');
  return `${facilityHeading(UI.tavernTitle, UI.tavernSub)}<div class="tavern-rest card">${asset('facilities', 'tavern', UI.tavernTitle)}<div><h3>${UI.rest}</h3><p class="muted">${UI.restEffect}</p><p class="small">${UI.fatigue} ${number(state.fatigue)} · ${UI.morale} ${number(state.morale)}</p></div>${gameButton(price(derived.restCost), 'rest', {}, 'primary', state.gold < derived.restCost)}</div>${sectionTitle(UI.availableCrew)}<div class="recruit-list">${crew || empty(UI.noCrew)}</div>`;
}

function renderShipyard(state, derived) {
  return `${facilityHeading(UI.shipMarket, P.shipyardSub)}<div class="shipyard-feature">${art(FACILITIES.shipyard.asset, FACILITIES.shipyard.name)}<div><h3>${UI.fleetTitle}</h3><p class="muted">${P.shipyardHint}</p><div class="stats-grid">${stat(UI.fleetTitle, text('fleetCount', { n: state.fleet.length }))}${stat(UI.hull, ratio(derived.hull, derived.maxHull))}</div><div class="service-actions">${button(P.openFleet, 'view', { view: 'fleet' }, 'primary')}${button(P.openCabins, 'view', { view: 'cabins' })}${gameButton(`${UI.repairAll} · ${price(derived.repairCost)}`, 'repair', {}, '', state.gold < derived.repairCost || derived.hull >= derived.maxHull)}</div></div></div>`;
}

function renderPalace(state, derived) {
  const share = state.shares[state.portId] || 0;
  return `${facilityHeading(UI.palaceTitle, UI.palaceSub)}<div class="palace-feature">${asset('facilities', 'palace', UI.palaceTitle)}<div class="share-panel"><h3>${UI.influence}</h3><div class="share-values"><span>${UI.yourShare} <strong class="gold">${share}${P.percent}</strong></span><span class="muted">${UI.otherShare} ${100 - share}${P.percent}</span></div>${meter(share, 100, 'gold-meter')}<p class="muted">${P.shareHint}</p><p class="small">${UI.investEffect}</p>${state.contracts[state.portId] ? gameButton(`${UI.invest} · ${price(derived.investCost)}`, 'invest', {}, 'primary', share >= 100 || state.gold < derived.investCost) : gameButton(`${UI.contract} · ${price(derived.contractCost)}`, 'contract', {}, 'primary', state.gold < derived.contractCost)}</div></div>`;
}

function questCard(quest, state, active) {
  const good = GOODS[quest.goodId];
  const atDestination = state.portId === quest.to;
  const enough = (state.cargo[quest.goodId]?.quantity || 0) >= quest.quantity;
  return `<article class="quest-card card">${art(good.asset, good.name)}<div class="quest-details"><h3>${escape(text('questRoute', { from: PORTS[quest.from].name, to: PORTS[quest.to].name }))}</h3><p>${escape(text('questCargo', { n: quest.quantity, good: good.name }))}</p><p class="muted small">${text('deadline', { n: quest.deadline })}</p></div><div class="quest-reward"><strong class="gold">${price(quest.reward)}</strong><span class="muted small">${UI.reputation} ${P.plus}${quest.reputation}</span>${active ? gameButton(atDestination ? UI.deliver : P.deliverAt, 'deliverQuest', { 'quest-id': quest.id }, 'small primary', !atDestination || !enough) : gameButton(UI.accept, 'acceptQuest', { 'quest-id': quest.id }, 'small primary')}</div></article>`;
}

function renderGuild(state, derived) {
  return `${facilityHeading(UI.guildTitle, UI.guildSub)}${sectionTitle(UI.availableQuests)}<div class="quest-list">${derived.availableQuests.map(quest => questCard(quest, state, false)).join('') || empty(UI.noQuests)}</div>${sectionTitle(UI.activeQuests)}<div class="quest-list">${state.quests.map(quest => questCard(quest, state, true)).join('') || empty(P.noActiveQuests)}</div>`;
}

function renderRuins(state, derived) {
  const port = PORTS[state.portId];
  const progress = derived.regionProgress.find(region => region.id === port.region);
  const explored = state.explored.includes(port.id);
  return `${facilityHeading(UI.ruinsTitle, UI.ruinsSub)}<div class="ruins-feature">${asset('facilities', 'ruins', UI.ruinsTitle)}<div><p class="muted">${P.ruinsHint}</p><p>${UI.exploreCost}</p>${gameButton(explored ? UI.explored : UI.explore, 'explore', {}, 'primary', explored)}</div></div>${sectionTitle(`${REGIONS[port.region].name} · ${UI.relic}`)}<div class="relic-showcase">${asset('relics',port.region,REGIONS[port.region].relic)}<h3>${REGIONS[port.region].relic}</h3></div><div class="stats-grid">${stat(P.visitProgress, ratio(progress.visited, progress.requiredVisits))}${stat(P.influenceProgress, `${ratio(progress.influence, progress.requiredInfluence)}${P.percent}`)}${stat(UI.exploredLabel, progress.explored ? UI.complete : UI.pending)}</div><div class="relic-claim"><p class="muted">${UI.relicGoal}</p>${gameButton(progress.relic ? UI.relicClaimed : UI.claimRelic, 'claimRelic', {}, 'primary', progress.relic || !progress.ready)}</div>`;
}

const renderFacility = { market: renderMarket, dock: renderDock, tavern: renderTavern, shipyard: renderShipyard, palace: renderPalace, guild: renderGuild, ruins: renderRuins };

export function renderPort(state, derived, ui) {
  if (!state.portId) return locked();
  const port = PORTS[state.portId];
  const facility = ui.facility || 'market';
  const specialties = port.goods.map(id => `<span>${art(GOODS[id].asset, GOODS[id].name)}${escape(GOODS[id].name)}</span>`).join('');
  return `${heading(UI.portTitle, UI.portSub, P.arrival)}<section class="port-scene panel">${art(port.asset, port.name, 'port-panorama')}<div class="port-scene-overlay"><p class="eyebrow">${escape(REGIONS[port.region].name)}</p><h2>${escape(port.name)}</h2><p>${escape(port.description)}</p><div class="port-specialties"><span class="small">${UI.specialties}</span>${specialties}</div></div><span class="port-status">${icon('anchor')}${UI.docked}</span></section><nav class="facility-nav" aria-label="${UI.facilities}">${Object.values(FACILITIES).map(item => button(`${art(item.asset, item.name)}<span>${item.name}</span>`, 'facility', { facility: item.id }, `facility-button ${facility === item.id ? 'active' : ''}`)).join('')}</nav><section class="facility-content panel">${renderFacility[facility](state, derived)}</section>`;
}
