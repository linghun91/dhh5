import {PORTS,EVENTS} from '../data/catalog.js';
import {buildEvent,seaEventIds} from '../data/fleets.js';
import {SEA_ROUTES} from '../data/world.js';
import {MESSAGES,message} from '../data/messages.js';
import {getStats,shipStats} from './stats.js';
import {fail,success,random,addLog,gainExperience} from './common.js';
import {advanceDay} from './time.js';

const length = points => points.slice(1).reduce((sum,point,index)=>sum+Math.hypot(point[0]-points[index][0],point[1]-points[index][1]),0);
const edges=SEA_ROUTES.flatMap(route=>[{...route,distance:length(route.points)},{from:route.to,to:route.from,points:[...route.points].reverse(),distance:length(route.points)}]);

export function planRoute(state,targetId) {
  if (!state.portId||!Object.hasOwn(PORTS,targetId)||targetId===state.portId) return null;
  const distance=Object.fromEntries(Object.keys(PORTS).map(id=>[id,Infinity]));
  const previous={},pending=new Set(Object.keys(PORTS));
  distance[state.portId]=0;
  while (pending.size) {
    const current=[...pending].reduce((a,b)=>distance[a]<distance[b]?a:b);
    if (distance[current]===Infinity) return null;
    pending.delete(current);
    if (current===targetId) break;
    for (const edge of edges.filter(edge=>edge.from===current&&pending.has(edge.to))) {
      const next=distance[current]+edge.distance;
      if (next<distance[edge.to]) { distance[edge.to]=next; previous[edge.to]=edge; }
    }
  }
  const path=[];
  let cursor=targetId;
  while (cursor!==state.portId) {
    const edge=previous[cursor];
    if (!edge) return null;
    path.unshift(edge);
    cursor=edge.from;
  }
  const stats=getStats(state),days=path.reduce((sum,edge)=>sum+Math.ceil(edge.distance/stats.speed),0);
  const reserveDays=Math.ceil(path[0].distance/stats.speed*1.25)+1;
  const nextLeg={portId:path[0].to,days:reserveDays,food:reserveDays*stats.foodPerDay,water:reserveDays*stats.waterPerDay};
  return {points:path.flatMap((edge,index)=>index?edge.points.slice(1):edge.points),ports:path.map(edge=>edge.to),distance:distance[targetId],days,food:days*stats.foodPerDay,water:days*stats.waterPerDay,nextLeg};
}
export function depart(state,{targetId}) {
  const plan=planRoute(state,targetId);
  if (!plan) return fail('noRoute');
  if (state.fleet.some(ship=>ship.sailors<8)) return fail('crewMinimum');
  if (state.fleet.some(ship=>ship.hull<shipStats(ship).maxHull*.25)) return fail('hullMinimum');
  if (state.fatigue>=70) return fail('tired');
  const stats=getStats(state);
  const edge=edges.find(edge=>edge.from===state.portId&&edge.to===plan.ports[0]);
  const {days,food,water}=plan.nextLeg;
  if (state.supplies.food<food||state.supplies.water<water) return fail('routeSupplies',{port:PORTS[edge.to].name,days,food,water});
  const from=state.portId,to=edge.to;
  state.voyage={from,to,finalTarget:targetId,points:edge.points.map(point=>[...point]),distance:edge.distance,progress:0,days:0,weather:'fair'};
  state.portId=null;
  return success(state,'depart',{from:PORTS[from].name,to:PORTS[to].name,target:PORTS[targetId].name,days:Math.ceil(edge.distance/stats.speed)});
}
export function step(state) {
  if (!state.voyage||state.portId) return fail('notSailing');
  if (state.event||state.combat) return fail('blocked');
  const voyage=state.voyage;
  advanceDay(state,true);
  if (state.status==='lost') return {ok:true,message:state.ending};
  const roll=random(state);
  voyage.weather=roll<.19?'tailwind':roll<.35?'headwind':roll<.43?'fog':'fair';
  const modifier={tailwind:1.35,headwind:.7,fog:.82,fair:1};
  const distance=getStats(state).speed*modifier[voyage.weather];
  voyage.progress=Math.min(voyage.distance,voyage.progress+distance);
  voyage.days++;
  gainExperience(state,2);
  if (voyage.progress>=voyage.distance) {
    state.portId=voyage.to;
    if (!state.visited.includes(state.portId)) {
      state.visited.push(state.portId);
      state.reputation+=15;
      addLog(state,message('discover',{port:PORTS[state.portId].name}),'good');
    }
    state.morale=Math.min(100,state.morale+4);
    if (state.portId===voyage.finalTarget) {
      state.voyage=null;
      return success(state,'arrive',{port:PORTS[state.portId].name});
    }
    const continuation=depart(state,{targetId:voyage.finalTarget});
    if (continuation.ok) return continuation;
    return success(state,'stopover',{port:PORTS[state.portId].name,target:PORTS[voyage.finalTarget].name,reason:continuation.message},'warn');
  }
  if (random(state)<.12) {
    const ids=seaEventIds(state,Object.keys(EVENTS));
    state.event=buildEvent(state,ids[Math.floor(random(state)*ids.length)],random);
    return success(state,'event',{name:EVENTS[state.event.id].name},'warn');
  }
  return success(state,'sailDay',{day:voyage.days,weather:MESSAGES.weather[voyage.weather],distance:Math.round(distance*18)},'info');
}
