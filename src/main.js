import { createGame, dispatch, derive } from './core/game.js';
import { loadGame, saveGame, parseSave, exportGame } from './core/storage.js';
import { UI } from './data/ui.js';
import { art, button, escape } from './ui/components.js';
import { renderShell } from './ui/shell.js';
import { renderChart } from './ui/views/chart.js';
import { renderPort } from './ui/views/port.js';
import { renderFleet } from './ui/views/fleet.js';
import { renderCabins } from './ui/views/cabins.js';
import { renderCrew } from './ui/views/crew.js';
import { renderJournal } from './ui/views/journal.js';
import { modal, guideDialog, settingsDialog, eventDialog, battleDialog, endingDialog } from './ui/dialogs.js';

const loaded=loadGame();
let state=loaded.state;
const ui={view:'chart',facility:'market',selectedPort:state.voyage?.finalTarget||state.portId||'lisbon',selectedShip:state.fleet[0]?.id,cabinSlot:0,fleetTab:'ships',shipFilter:'all',cannonFilter:'all',inspectedShip:'first-rate',running:false,speed:1,mapBox:[0,0,1200,660]};
const app=document.getElementById('app'),overlay=document.getElementById('overlay'),toastElement=document.getElementById('toast');
const views={chart:renderChart,port:renderPort,fleet:renderFleet,cabins:renderCabins,crew:renderCrew,journal:renderJournal};
let timer=null,toastTimer=null,controller=null,drag=null,suppressMapClick=false,endingSeen=false;

function toast(message,error=false) {
  clearTimeout(toastTimer);
  toastElement.textContent=message;
  toastElement.className=`visible ${error?'error':''}`;
  toastTimer=setTimeout(()=>{toastElement.className='';toastTimer=null;},4200);
}
function stopSailing() {
  clearTimeout(timer);timer=null;ui.running=false;
}
function schedule() {
  clearTimeout(timer);timer=null;
  if(!ui.running||!state.voyage||state.portId||state.event||state.combat||document.hidden)return;
  timer=setTimeout(()=>{timer=null;perform({type:'step'},false);},1250/ui.speed);
}
function persist(notify=false) {
  const saved=saveGame(state);
  ui.saveAvailable=saved;
  if(!saved||notify)toast(saved?UI.saveSuccess:UI.saveError,!saved);
}
function closeDialog() {
  overlay.close();overlay.replaceChildren();
}
function showDialog(html) {
  overlay.innerHTML=html;
  if(!overlay.open)overlay.showModal();
}
function mandatoryDialog() {
  if(state.status==='lost')return endingDialog(state);
  if(state.event)return eventDialog(state);
  if(state.combat)return battleDialog(state,derive(state));
  if(state.status==='won'&&!endingSeen){endingSeen=true;return endingDialog(state);}
  return null;
}
function render() {
  drag=null;
  const d=derive(state);
  const content=state.status==='lost'?`<section class="locked-scene">${art('assets/emblem.svg',UI.title)}<h1>${UI.lost}</h1><p>${escape(state.ending)}</p>${button(UI.newGame,'new-game',{},'primary')}</section>`:views[ui.view](state,d,ui);
  app.innerHTML=renderShell(state,d,ui,content);
  const dialog=mandatoryDialog();
  if(dialog)showDialog(dialog);
}
function perform(action,notify=true) {
  const result=dispatch(state,action);
  if(!result.ok){toast(result.message,true);return;}
  if(action.type==='depart'){ui.view='chart';ui.selectedPort=state.voyage.finalTarget;ui.running=true;}
  if(action.type==='buyShip'){ui.fleetTab='owned';ui.selectedShip=state.fleet.at(-1).id;}
  if(!state.voyage||state.portId||state.event||state.combat||state.status==='lost')stopSailing();
  if(overlay.open)closeDialog();
  persist();render();
  if(notify)toast(result.message);
  schedule();
}
function changeView(view) {ui.view=view;render();window.scrollTo({top:0,behavior:'instant'});}
function zoom(factor,center=[.5,.5]) {
  const [x,y,w,h]=ui.mapBox;
  const nextW=Math.min(1200,Math.max(260,w*factor)),nextH=nextW*660/1200;
  ui.mapBox=[Math.max(0,Math.min(1200-nextW,x+(w-nextW)*center[0])),Math.max(0,Math.min(660-nextH,y+(h-nextH)*center[1])),nextW,nextH];
  document.getElementById('world-map')?.setAttribute('viewBox',ui.mapBox.join(' '));
}
const actions={
  view:element=>changeView(element.dataset.view),
  facility:element=>{ui.facility=element.dataset.facility;render();},
  'select-port':element=>{if(suppressMapClick)return;ui.selectedPort=element.dataset.port;render();},
  'select-ship':element=>{ui.selectedShip=element.dataset.shipId;ui.cabinSlot=0;render();},
  'ship-cabins':element=>{ui.selectedShip=element.dataset.shipId;ui.cabinSlot=0;changeView('cabins');},
  'cabin-slot':element=>{ui.cabinSlot=Number(element.dataset.slot);render();},
  'fleet-tab':element=>{ui.fleetTab=element.dataset.tab;render();},
  'ship-filter':element=>{ui.shipFilter=element.dataset.filter;render();},
  'cannon-filter':element=>{ui.cannonFilter=element.dataset.filter;render();},
  'inspect-ship':element=>{ui.inspectedShip=element.dataset.shipType;render();document.getElementById('ship-dossier')?.scrollIntoView({behavior:'instant',block:'start'});},
  game:element=>{
    const action={...element.dataset};delete action.action;
    if(action.slot!==undefined)action.slot=Number(action.slot);
    const input=element.closest('form')?.querySelector('[name="quantity"]');
    if(input){if(!input.reportValidity())return;action.quantity=Number(input.value);}
    perform(action);
  },
  'toggle-sail':()=>{
    if(!state.voyage||state.portId)return;
    if(ui.running)stopSailing();else ui.running=true;
    render();schedule();
  },
  speed:element=>{ui.speed=Number(element.dataset.speed);render();schedule();},
  'map-zoom':element=>zoom(Number(element.dataset.factor)),
  'map-reset':()=>{ui.mapBox=[0,0,1200,660];render();},
  guide:()=>{stopSailing();render();showDialog(guideDialog());},
  settings:()=>{stopSailing();render();showDialog(settingsDialog());},
  'close-modal':()=>closeDialog(),
  save:()=>persist(true),
  export:()=>exportGame(state,UI.exportFile),
  'new-game':()=>showDialog(modal(UI.newGame,`<p>${UI.newGamePrompt}</p>`,button(UI.cancel,'cancel-reset',{},'outline')+button(UI.confirm,'reset',{},'primary'))),
  'cancel-reset':()=>{closeDialog();render();},
  reset:()=>{
    stopSailing();state=createGame();endingSeen=false;
    Object.assign(ui,{view:'chart',facility:'market',selectedPort:'lisbon',selectedShip:state.fleet[0].id,cabinSlot:0,mapBox:[0,0,1200,660]});
    closeDialog();persist();render();
  },
  'sell-ship':element=>showDialog(modal(UI.sellShip,`<p>${UI.sellShip} · ${escape(state.fleet.find(s=>s.id===element.dataset.shipId).name)}</p>`,button(UI.cancel,'close-modal',{},'outline')+button(UI.confirm,'game',{type:'sellShip','ship-id':element.dataset.shipId},'danger'))),
};
function onClick(event) {
  const element=event.target.closest('[data-action]');
  if(!element||element.matches('select')||element.disabled)return;
  event.preventDefault();
  actions[element.dataset.action]?.(element);
}
async function onChange(event) {
  const element=event.target;
  if(element.id==='import-save') {
    const file=element.files[0];if(!file)return;
    try {
      if(file.size>262144)throw new Error('file-size');
      const imported=parseSave(await file.text());
      stopSailing();state=imported;endingSeen=false;ui.selectedPort=state.voyage?.finalTarget||state.portId||'lisbon';ui.selectedShip=state.fleet[0]?.id;ui.view='chart';
      closeDialog();persist();render();toast(UI.importSuccess);
    } catch {toast(UI.invalidSave,true);}
    return;
  }
  if(element.dataset.action==='select-destination'){ui.selectedPort=element.value;render();return;}
  if(element.dataset.action==='assign')perform({type:'assign',crewId:element.dataset.crewId,role:element.value||null});
  if(element.dataset.action==='equip')perform({type:'equip',crewId:element.dataset.crewId,equipmentId:element.value||null});
}
function bindEvents() {
  controller=new AbortController();const signal=controller.signal;
  document.addEventListener('click',onClick,{signal});
  document.addEventListener('change',onChange,{signal});
  document.addEventListener('submit',event=>event.preventDefault(),{signal});
  overlay.addEventListener('cancel',event=>{if(state.event||state.combat||state.status==='lost')event.preventDefault();},{signal});
  document.addEventListener('keydown',event=>{
    if(event.target.matches('input,select,textarea')||overlay.open)return;
    if(event.key==='Enter'&&event.target.matches('.port-marker')){actions['select-port'](event.target);return;}
    if(event.code==='Space'&&state.voyage&&!state.portId){event.preventDefault();actions['toggle-sail']();}
    if(/^[1-6]$/.test(event.key))changeView(UI.nav[Number(event.key)-1].id);
  },{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopSailing();persist();render();}},{signal});
  document.addEventListener('wheel',event=>{
    const stage=event.target.closest('#map-stage');if(!stage)return;
    event.preventDefault();const rect=stage.getBoundingClientRect();
    zoom(event.deltaY>0?1.12:.89,[(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height]);
  },{signal,passive:false});
  document.addEventListener('pointerdown',event=>{
    const stage=event.target.closest('#map-stage');if(!stage||event.pointerType==='touch')return;
    suppressMapClick=false;drag={stage,x:event.clientX,y:event.clientY,box:[...ui.mapBox],moved:false};
  },{signal});
  document.addEventListener('pointermove',event=>{
    if(!drag)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(Math.hypot(dx,dy)<4&&!drag.moved)return;
    drag.moved=true;drag.stage.classList.add('dragging');
    const rect=drag.stage.getBoundingClientRect(),[x,y,w,h]=drag.box;
    ui.mapBox=[Math.max(0,Math.min(1200-w,x-dx/rect.width*w)),Math.max(0,Math.min(660-h,y-dy/rect.height*h)),w,h];
    document.getElementById('world-map')?.setAttribute('viewBox',ui.mapBox.join(' '));
  },{signal});
  document.addEventListener('pointerup',()=>{if(!drag)return;suppressMapClick=drag.moved;drag.stage.classList.remove('dragging');drag=null;},{signal});
  document.addEventListener('pointercancel',()=>{drag=null;suppressMapClick=false;},{signal});
}
function dispose() {
  stopSailing();clearTimeout(toastTimer);toastTimer=null;controller.abort();drag=null;saveGame(state);
}
window.addEventListener('pagehide',dispose);
window.addEventListener('pageshow',event=>{if(event.persisted){bindEvents();render();}});
if(!loaded.error)persist();
bindEvents();render();
if(loaded.error)toast(UI.invalidSave,true);
