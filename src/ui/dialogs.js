import { EVENTS } from '../data/catalog.js';
import { getVolley } from '../systems/stats.js';
import { UI, text } from '../data/ui.js';
import { art, asset, button, icon, meter, escape } from './components.js';

export function modal(title,body,actions='',closable=true) {
  return `<div class="modal-heading"><h2>${title}</h2>${closable?button(icon('close'),'close-modal',{},'ghost'):''}</div><div class="modal-body">${body}</div>${actions?`<div class="modal-actions">${actions}</div>`:''}`;
}
export function guideDialog() {
  return modal(UI.guideTitle,UI.guideSections.map(([title,body])=>`<div><h3>${title}</h3><p>${body}</p></div>`).join(''));
}
export function settingsDialog() {
  return modal(UI.settings,`<p>${UI.settingsHint}</p><div class="stack">${button(UI.save,'save',{},'primary')}${button(UI.export,'export',{},'outline')}<label class="button outline">${UI.import}<input type="file" id="import-save" accept="application/json,.json" class="visually-hidden"></label>${button(UI.newGame,'new-game',{},'danger')}</div>`);
}
export function eventDialog(state) {
  const event=EVENTS[state.event.id];
  return modal(event.name,`${art(event.asset,event.name,'event-art')}<p>${event.description}</p><div class="event-options">${event.choices.map(choice=>button(`<span>${choice.name}<small style="display:block;margin-top:7px">${choice.description}</small></span>`,'game',{type:'eventChoice','choice-id':choice.id},'outline')).join('')}</div>`,'',false);
}
export function battleDialog(state,d) {
  const enemy=state.combat,range=enemy.range||'medium',volley=getVolley(state,range);
  const moves={
    cannon:['侧舷炮击',volley.ammo?`消耗 ${volley.ammo} 炮弹 · 当前距离火力 ${volley.firepower}`:'舰队尚未配置火炮'],
    approach:['接近敌舰',range==='close'?'已到近距离':'靠近一档距离 · 敌方照常反击'],
    withdraw:['拉开距离',range==='long'?'已到远距离':'退后一档距离 · 敌方照常反击'],
    board:['接舷白刃战',range==='close'?'削减敌方水手 · 双方可能减员':'需先接近至近距离'],
    guard:UI.battleMoves.guard,repair:UI.battleMoves.repair,flee:UI.battleMoves.flee
  };
  const disabled=move=>(move==='cannon'&&(!volley.ammo||state.supplies.ammo<volley.ammo))||(move==='board'&&range!=='close')||(move==='approach'&&range==='close')||(move==='withdraw'&&range==='long')||(move==='repair'&&(state.supplies.repair<3||d.hull===d.maxHull));
  return modal(`${UI.battleTitle} · ${text('round',{n:enemy.round})}`,`<div class="battle-arena">${asset('ships',state.fleet[0].type,UI.fleetTitle)}<span class="battle-vs">×</span>${asset('ships','galleon',enemy.name)}</div><div class="battle-range"><div>交战距离<small>长炮宜远射，卡隆炮与旋回炮宜近战。</small></div><div class="range-track">${Object.entries({close:'近距离',medium:'中距离',long:'远距离'}).map(([id,name])=>`<span class="${range===id?'active':''}" ${range===id?'aria-current="step"':''}>${name}</span>`).join('')}</div></div><div class="battle-stats"><div><h3>${UI.fleetTitle}</h3><p>${UI.hull} ${d.hull} / ${d.maxHull}</p>${meter(d.hull,d.maxHull,'green')}<p>${UI.sailors} ${d.sailors}</p>${meter(d.sailors,d.maxSailors,'blue')}</div><div><h3>${escape(enemy.name)}</h3><p>${UI.hull} ${enemy.hull} / ${enemy.maxHull}</p>${meter(enemy.hull,enemy.maxHull,'red')}<p>${UI.sailors} ${enemy.sailors} / ${enemy.maxSailors}</p>${meter(enemy.sailors,enemy.maxSailors,'red')}</div></div><p>${escape(state.logs.at(-1)?.text||UI.battleSub)}</p><div class="battle-resources"><span>${asset('supplies','ammo',UI.ammo)}${UI.ammo} ${state.supplies.ammo}</span><span>${asset('supplies','repair',UI.repair)}${UI.repair} ${state.supplies.repair}</span><span>距离修正火力 ${volley.firepower}</span><span>${UI.boarding} ${d.boarding}</span></div><div class="battle-options">${Object.entries(moves).map(([move,[label,description]])=>button(`${label}<small>${description}</small>`,'game',{type:'battle',move},'outline',disabled(move))).join('')}</div>`,'',false);
}
export function endingDialog(state) {
  return modal(state.status==='won'?UI.won:UI.lost,`${art('assets/emblem.svg',UI.title,'event-art')}<p>${escape(state.ending)}</p>`,state.status==='won'?button(UI.continueGame,'close-modal',{},'primary'):button(UI.newGame,'new-game',{},'primary'),state.status==='won');
}
