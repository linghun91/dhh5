import {GOODS,PORTS,SUPPLIES} from '../data/catalog.js';
import {getStats} from './stats.js';
import {positive,fail,success,gainExperience} from './common.js';

function stockFor(state,portId,goodId) {
  const market=state.market[portId];
  if (market.epoch===Math.floor(state.day/12)) return market.stock[goodId];
  return PORTS[portId].goods.includes(goodId)?55:18;
}
export function quote(state,portId,goodId) {
  if (!Object.hasOwn(PORTS,portId)||!Object.hasOwn(GOODS,goodId)) return null;
  const port=PORTS[portId],good=GOODS[goodId];
  const local=port.goods.includes(goodId);
  const regional=Object.values(PORTS).some(other=>other.region===port.region&&other.goods.includes(goodId));
  const phase=Object.keys(PORTS).indexOf(portId)*.7+Object.keys(GOODS).indexOf(goodId)*1.3;
  const season=1+Math.sin(Math.floor(state.day/6)+phase)*.12;
  const skill=getStats(state).skills.trade;
  const share=state.shares[portId]||0;
  const base=good.price*(local?.62:regional?1.06:1.62)*season;
  const buy=Math.ceil(base*(1.16-Math.min(.13,skill/1000)-share*.0006));
  const sell=Math.max(1,Math.min(Math.floor(buy*.95),Math.floor(base*(.84+Math.min(.1,skill/1200)+share*.0005))));
  return {buy,sell,stock:stockFor(state,portId,goodId)};
}
function refreshMarket(state) {
  const market=state.market[state.portId];
  if (market.epoch===Math.floor(state.day/12)) return market;
  market.epoch=Math.floor(state.day/12);
  market.stock=Object.fromEntries(Object.keys(GOODS).map(id=>[id,PORTS[state.portId].goods.includes(id)?55:18]));
  return market;
}
export function contract(state) {
  if (state.contracts[state.portId]) return fail('contractExists');
  if (state.gold<150) return fail('funds',{cost:150});
  state.gold-=150;
  state.contracts[state.portId]=true;
  state.shares[state.portId]=Math.max(5,state.shares[state.portId]||0);
  return success(state,'contract',{port:PORTS[state.portId].name});
}
export function trade(state,action) {
  const {goodId,quantity,side}=action;
  if (!GOODS[goodId]||!positive(quantity)||!['buy','sell'].includes(side)) return fail('invalid');
  const price=quote(state,state.portId,goodId);
  const item=state.cargo[goodId];
  const cost=price[side]*quantity;
  if (side==='buy') {
    if (!state.contracts[state.portId]) return fail('contractRequired');
    if (state.gold<cost) return fail('funds',{cost});
    if (price.stock<quantity) return fail('stock');
    const stats=getStats(state);
    if (stats.cargoUsed+quantity>stats.cargoCapacity) return fail('cargo');
    state.gold-=cost;
    const oldQuantity=item?.quantity||0;
    state.cargo[goodId]={quantity:oldQuantity+quantity,cost:((item?.cost||0)*oldQuantity+cost)/(oldQuantity+quantity)};
    refreshMarket(state).stock[goodId]-=quantity;
    return success(state,'tradeBuy',{quantity,name:GOODS[goodId].name,cost});
  }
  if (!item||item.quantity<quantity) return fail('goods');
  const profit=Math.round(cost-item.cost*quantity);
  item.quantity-=quantity;
  if (!item.quantity) delete state.cargo[goodId];
  state.gold+=cost;
  state.tradeProfit+=profit;
  refreshMarket(state).stock[goodId]+=quantity;
  if (profit>0) {
    state.reputation+=Math.max(1,Math.floor(profit/500));
    gainExperience(state,Math.min(15,Math.ceil(profit/200)));
  }
  return success(state,'tradeSell',{quantity,name:GOODS[goodId].name,cost,profit});
}
export function supply(state,{supplyId,quantity}) {
  if (!SUPPLIES[supplyId]||!positive(quantity)) return fail('invalid');
  const cost=SUPPLIES[supplyId].price*quantity;
  if (state.gold<cost) return fail('funds',{cost});
  const stats=getStats(state);
  if (stats.supplyUsed+quantity>stats.supplyCapacity) return fail('supplyCapacity');
  state.gold-=cost;
  state.supplies[supplyId]+=quantity;
  return success(state,'supply',{quantity,name:SUPPLIES[supplyId].name});
}
export function refillPlan(state) {
  const stats=getStats(state);
  const ratio={food:.43,water:.45,ammo:.07,repair:.05};
  let free=stats.supplyCapacity-stats.supplyUsed;
  const amounts={food:0,water:0,ammo:0,repair:0};
  for (const id of Object.keys(amounts)) {
    amounts[id]=Math.max(0,Math.min(free,Math.floor(stats.supplyCapacity*ratio[id])-state.supplies[id]));
    free-=amounts[id];
  }
  return {amounts,cost:Object.entries(amounts).reduce((sum,[id,quantity])=>sum+quantity*SUPPLIES[id].price,0)};
}
export function refill(state) {
  const plan=refillPlan(state);
  if (!plan.cost) return fail('full');
  if (state.gold<plan.cost) return fail('funds',{cost:plan.cost});
  state.gold-=plan.cost;
  for (const [id,quantity] of Object.entries(plan.amounts)) state.supplies[id]+=quantity;
  return success(state,'refill',{cost:plan.cost});
}
export function invest(state) {
  if (!state.contracts[state.portId]) return fail('contractRequired');
  if ((state.shares[state.portId]||0)>=100) return fail('shareMax');
  if (state.gold<500) return fail('funds',{cost:500});
  state.gold-=500;
  state.shares[state.portId]=Math.min(100,(state.shares[state.portId]||0)+10);
  state.reputation+=5;
  return success(state,'invest',{port:PORTS[state.portId].name,share:state.shares[state.portId]});
}
