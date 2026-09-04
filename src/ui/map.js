import { PORTS } from '../data/catalog.js';
import { SEA_ROUTES } from '../data/world.js';
import { UI } from '../data/ui.js';
import { icon, button, escape } from './components.js';

const namedPorts = new Set(['lisbon','london','genoa','alexandria','capeverde','capetown','muscat','calicut','macau','nagasaki','havana','veracruz']);
const labels = {lisbon:[-48,-17],london:[-15,-16],genoa:[4,-12],alexandria:[13,15],capeverde:[-15,21],havana:[10,-13],veracruz:[-35,20],calicut:[-16,-12],macau:[8,18]};

export function positionOnRoute(points, ratio) {
  const lengths = points.slice(1).map((point,i)=>Math.hypot(point[0]-points[i][0],point[1]-points[i][1]));
  let remaining = lengths.reduce((a,b)=>a+b,0)*Math.min(1,ratio);
  for(let i=0;i<lengths.length;i++) {
    if(remaining>lengths[i]) { remaining-=lengths[i]; continue; }
    const t=lengths[i] ? remaining/lengths[i] : 0;
    return [points[i][0]+(points[i+1][0]-points[i][0])*t,points[i][1]+(points[i+1][1]-points[i][1])*t];
  }
  return points.at(-1);
}

export function renderMap(state, ui, route) {
  const voyage=state.portId?null:state.voyage;
  const points=route?.points;
  const location=voyage ? positionOnRoute(voyage.points,voyage.progress/voyage.distance) : [PORTS[state.portId].x,PORTS[state.portId].y];
  return `<section class="map-panel"><div class="map-topline"><span>${icon('compass')}${UI.chartEyebrow}</span><span class="map-coordinate">85° N — 85° S</span></div><div class="map-stage" id="map-stage"><svg id="world-map" viewBox="${ui.mapBox.join(' ')}" role="img" aria-label="${UI.chartTitle}"><image href="./assets/world.svg" width="1200" height="660"/><g class="shipping-lanes">${SEA_ROUTES.map(r=>`<polyline points="${r.points.map(p=>p.join(',')).join(' ')}"/>`).join('')}</g><g class="ocean-labels"><text x="365" y="340">${UI.oceanAtlantic}</text><text x="840" y="400">${UI.oceanIndian}</text><text x="165" y="330">${UI.oceanPacific}</text><text x="1130" y="330">${UI.oceanPacific}</text></g>${points ? `<polyline class="planned-route" points="${points.map(p=>p.join(',')).join(' ')}"/>` : ''}<g class="port-markers">${Object.values(PORTS).map(p=>{
    const selected=p.id===ui.selectedPort,current=p.id===state.portId,visited=state.visited.includes(p.id);
    const offset=labels[p.id] || [9,-9];
    return `<g class="port-marker ${selected?'selected':''} ${current?'current':''} ${visited?'visited':''}" data-action="select-port" data-port="${p.id}" role="button" tabindex="0" aria-label="${escape(p.name)}"><title>${escape(p.name)}</title><circle class="port-hit" cx="${p.x}" cy="${p.y}" r="12"/><circle class="port-ring" cx="${p.x}" cy="${p.y}" r="8"/><circle class="port-dot" cx="${p.x}" cy="${p.y}" r="3"/><text class="${namedPorts.has(p.id)?'named':''}" x="${p.x+offset[0]}" y="${p.y+offset[1]}">${p.name}</text></g>`;
  }).join('')}</g><g class="fleet-marker" transform="translate(${location[0]},${location[1]})"><circle r="17"/><image href="./assets/ships/caravel.svg" x="-27" y="-34" width="54" height="45"/></g></svg></div><div class="map-bottomline"><span><i></i>${UI.discovered}<i class="unknown"></i>${UI.unknown}</span><div class="map-controls">${button(icon('minus'),'map-zoom',{factor:1.25},'ghost tiny',false)}${button(icon('compass'),'map-reset',{},'ghost tiny')}${button(icon('plus'),'map-zoom',{factor:.8},'ghost tiny')}</div></div><p class="map-tip">${UI.chartHint}</p></section>`;
}
