import { PORTS, REGIONS, SHIP_TYPES } from '../../data/catalog.js';
import { UI, text } from '../../data/ui.js';
import { planRoute } from '../../core/game.js';
import { heading, sectionTitle, button, icon, art, asset, stat, meter, number, dayLabel } from '../components.js';
import { renderMap } from '../map.js';

export function logEntries(logs) {
  return `<div class="log-list">${[...logs].reverse().map(log=>`<div class="log-entry ${log.tone}"><time>${dayLabel(log.day)}</time><i class="log-dot"></i><p>${log.text}</p></div>`).join('')}</div>`;
}

function routePanel(state, d, ui, route) {
  const voyage = state.voyage;
  const sailing = voyage && !state.portId;
  const stopover = voyage && state.portId;
  const port = PORTS[sailing ? voyage.finalTarget : ui.selectedPort];
  const isCurrent = port.id === state.portId;
  const firstLeg = !sailing && route ? route.nextLeg : null;
  const status = sailing ? UI.sailing : stopover ? UI.stopover : UI.docked;
  const picker = sailing ? '' : `<label class="destination-picker">
    <span>${UI.destination}</span><select data-action="select-destination" aria-label="${UI.destination}">
      ${Object.values(PORTS).map(p => `<option value="${p.id}" ${p.id === ui.selectedPort ? 'selected' : ''}>${p.name} · ${REGIONS[p.region].name}</option>`).join('')}
    </select></label>`;
  const stops = route ? `<div class="route-stops">${route.ports.map(id => `<span>${PORTS[id].name}</span>`).join(icon('arrow'))}</div>` : '';
  let controls;
  if (sailing) {
    controls = `<div class="row spread weather-row"><span>${icon('wind')}${UI.weatherNames[voyage.weather]}</span><span>${text('speed', { n: d.speed.toFixed(1) })}</span></div>
      <div class="row spread small route-next-port"><span class="muted">${UI.nextPort}</span><strong>${PORTS[voyage.to].name}</strong></div>
      <div class="route-progress"><small>${UI.legProgress}</small><div class="row spread"><small>${PORTS[voyage.from].name}</small><span>${Math.min(100, Math.round(voyage.progress / voyage.distance * 100))}%</span><small>${PORTS[voyage.to].name}</small></div>${meter(voyage.progress, voyage.distance)}</div>
      ${stops}<p class="hint">${UI.routeGuidance}</p>
      <div class="sail-controls">${button(icon(ui.running ? 'pause' : 'play') + (ui.running ? UI.pause : UI.continue), 'toggle-sail', {}, 'primary')}${button(UI.nextDay, 'game', { type: 'step' }, 'outline')}</div>
      <div class="speed-controls"><span>${UI.sailSpeed}</span>${[1, 3, 6].map(speed => button(`${speed}×`, 'speed', { speed }, `tiny ${ui.speed === speed ? 'active' : 'ghost'}`)).join('')}</div>`;
  } else if (isCurrent) {
    controls = `<p class="port-description">${port.description}</p>${button(UI.enterPort + icon('arrow'), 'view', { view: 'port' }, 'primary full-width')}`;
  } else if (route) {
    const resume = stopover && port.id === voyage.finalTarget;
    controls = `<div class="stats-grid route-stats">${stat(UI.estimated, text('days', { n: route.days }))}${stat(UI.remaining, text('days', { n: d.endurance }))}</div>
      ${stops}<p class="hint">${UI.routeGuidance}</p>
      ${d.endurance < firstLeg.days ? `<p class="warning">${text('voyageWarning', firstLeg)}</p>` : ''}
      ${button((resume ? text('resumeRoute', { port: port.name }) : UI.depart) + icon('arrow'), 'game', { type: 'depart', 'target-id': port.id }, 'primary full-width')}
      ${button(text('enterCurrentPort', { port: PORTS[state.portId].name }), 'view', { view: 'port' }, 'outline full-width route-port-button')}`;
  } else {
    controls = '';
  }
  return `<section class="panel route-panel">
    ${sectionTitle(sailing ? UI.sailing : UI.plan, `<span class="badge ${sailing ? 'gold' : ''}">${status}</span>`)}
    ${picker}<div class="route-location"><div class="location-symbol">${icon('pin')}</div><div>
      <small>${sailing ? UI.finalDestination : isCurrent ? UI.currentPort : UI.destination}</small><h2>${port.name}</h2>
      <p>${REGIONS[port.region].name} · ${port.lon.toFixed(1)}° / ${port.lat.toFixed(1)}°</p>
    </div></div><div class="destination-art">${art(port.asset, port.name)}</div>
    ${stopover ? `<p class="warning">${text('stopoverHint', { port: PORTS[state.portId].name, target: PORTS[voyage.finalTarget].name })}</p>` : ''}
    ${controls}
  </section>`;
}

export function renderChart(state,d,ui) {
  const routeState=state.portId?state:{...state,portId:state.voyage.from};
  const target=state.portId?ui.selectedPort:state.voyage.finalTarget;
  const route=planRoute(routeState,target);
  const ship=state.fleet[0],type=SHIP_TYPES[ship.type];
  const tutorial=state.visited.length<3 && state.tradeProfit<300;
  return `${heading(UI.chartTitle,UI.chartSub,UI.legendary)}<div class="chart-layout"><div class="chart-main">${renderMap(state,ui,route)}${tutorial?`<section class="panel tutorial">${art('assets/emblem.svg',UI.title,'tutorial-emblem')}<div><h3>${UI.tutorialTitle}</h3><p>${UI.tutorialSub}</p><ol class="tutorial-steps">${UI.tutorialSteps.map((label,i)=>{const done=[Boolean(state.cargo.olive),d.endurance>=10,state.visited.includes('seville'),state.tradeProfit>0][i];return `<li class="${done?'done':''}"><b>${done?icon('check'):i+1}</b>${label}</li>`;}).join('')}</ol></div></section>`:''}<section class="panel log-preview">${sectionTitle(UI.logTitle,button(UI.log+icon('arrow'),'view',{view:'journal'},'ghost'))}${logEntries(state.logs.slice(-3))}</section></div><aside class="chart-aside">${routePanel(state,d,ui,route)}<section class="panel ship-summary">${sectionTitle(UI.shipOverview,`<span>${text('fleetCount',{n:state.fleet.length})}</span>`)}${art(type.asset,type.name,'ship-summary-art')}<div class="ship-name-row"><h3>${ship.name}</h3><span class="badge gold">${UI.flagship}</span></div><div class="row spread small"><span class="muted">${UI.hull}</span><span>${number(d.hull)} / ${number(d.maxHull)}</span></div>${meter(d.hull,d.maxHull,'green')}<div class="stats-grid">${stat(UI.knots,text('speed',{n:d.speed.toFixed(1)}))}${stat(UI.sailors,`${d.sailors}/${d.maxSailors}`)}${stat(UI.cargo,`${d.cargoUsed}/${d.cargoCapacity}`)}</div></section><section class="panel supplies-panel">${sectionTitle(UI.provisions,`<span>${text('endurance',{n:d.endurance})}</span>`)}${['food','water'].map(id=>`<div class="supply-line">${asset('supplies',id,UI[id])}<div><div class="row spread"><span>${UI[id]}</span><strong>${number(state.supplies[id])}<small> / ${number(id==='food'?d.foodPerDay:d.waterPerDay)} ${UI.daily}</small></strong></div>${meter(state.supplies[id],Math.max(1,d.supplyCapacity/2),id==='water'?'blue':'')}</div></div>`).join('')}<div class="row spread small muted"><span>${UI.fatigue}</span><span>${Math.round(state.fatigue)} / 100</span></div>${meter(state.fatigue,100,'red')}</section></aside></div>`;
}
