import {GOODS,PORTS,REGIONS} from '../data/catalog.js';
import {message} from '../data/messages.js';
import {getStats,regionProgress} from './stats.js';
import {fail,success,gainExperience} from './common.js';
import {advanceDay} from './time.js';

export function availableQuests(state) {
  if (!state.portId) return [];
  const from=PORTS[state.portId],epoch=Math.floor(state.day/24);
  const candidates=Object.values(PORTS).filter(port=>port.id!==from.id).sort((a,b)=>Math.hypot(a.x-from.x,a.y-from.y)-Math.hypot(b.x-from.x,b.y-from.y));
  return candidates.slice(0,3).map((port,index)=>{
    const goodId=from.goods[(epoch+index)%from.goods.length],quantity=8+index*4;
    return {id:`${from.id}-${epoch}-${index}`,name:message('questName',{from:from.name,to:port.name,good:GOODS[goodId].name}),from:from.id,to:port.id,goodId,quantity,reward:Math.ceil(GOODS[goodId].price*quantity*1.6)+450,reputation:18+index*5,deadline:state.day+80};
  }).filter(quest=>!state.quests.some(active=>active.id===quest.id)&&!state.completedQuests.includes(quest.id));
}
export function acceptQuest(state,{questId}) {
  const quest=availableQuests(state).find(item=>item.id===questId);
  if (!quest) return fail('questMissing');
  if (state.quests.length>=3) return fail('questLimit');
  state.quests.push(quest);
  return success(state,'questAccepted',{port:PORTS[quest.to].name,quantity:quest.quantity,name:GOODS[quest.goodId].name});
}
export function deliverQuest(state,{questId}) {
  const quest=state.quests.find(item=>item.id===questId);
  if (!quest) return fail('questMissing');
  if (quest.to!==state.portId) return fail('questDestination');
  const cargo=state.cargo[quest.goodId];
  if (!cargo||cargo.quantity<quest.quantity) return fail('goods');
  cargo.quantity-=quest.quantity;
  state.tradeProfit+=Math.round(quest.reward-cargo.cost*quest.quantity);
  if (!cargo.quantity) delete state.cargo[quest.goodId];
  state.gold+=quest.reward;
  state.reputation+=quest.reputation;
  state.quests.splice(state.quests.indexOf(quest),1);
  state.completedQuests.push(quest.id);
  state.questCount++;
  state.completedQuests=state.completedQuests.filter(id=>Number(id.split('-').at(-2))>=Math.floor(state.day/24)-1);
  gainExperience(state,25);
  return success(state,'questDelivered',{gold:quest.reward,reputation:quest.reputation});
}
export function explore(state) {
  if (state.explored.includes(state.portId)) return fail('explored');
  if (state.fatigue>75) return fail('tired');
  if (state.gold<200) return fail('funds',{cost:200});
  if (state.supplies.food<5||state.supplies.water<5) return fail('notEnoughSupplies');
  const stats=getStats(state);
  const gold=350+Math.floor(stats.skills.navigation*3+stats.skills.medicine*2);
  state.gold+=gold-200;
  state.supplies.food-=5;
  state.supplies.water-=5;
  state.fatigue=Math.min(100,state.fatigue+12);
  state.reputation+=30;
  state.explored.push(state.portId);
  gainExperience(state,35);
  advanceDay(state,false);
  return success(state,'explore',{port:PORTS[state.portId].name,gold});
}
export function claimRelic(state) {
  const region=REGIONS[PORTS[state.portId].region];
  if (state.relics.includes(region.id)) return fail('relicOwned');
  if (!regionProgress(state).find(item=>item.id===region.id).ready) return fail('relicRequirements');
  state.relics.push(region.id);
  state.gold+=1800;
  state.reputation+=100;
  gainExperience(state,70);
  return success(state,'relic',{region:region.name,name:region.relic});
}
export function finish(state) {
  if (state.status==='won') return fail('same');
  if (state.portId!=='lisbon'||state.relics.length!==Object.keys(REGIONS).length) return fail('finishRequirements');
  state.status='won';
  state.ending=message('victory');
  return success(state,'victory');
}
