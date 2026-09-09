import {PORTS,REGIONS} from '../data/catalog.js';
import {message} from '../data/messages.js';
import {getStats,shipStats,getVolley} from './stats.js';
import {random,fail,success,addLog,gainExperience} from './common.js';
import {damageFleet,loseSailors,resolveLosses} from './time.js';

export function beginCombat(state) {
  const regionId=PORTS[state.voyage.from].region,danger=REGIONS[regionId].danger;
  const hull=85+danger*30,sailors=20+danger*9;
  state.combat={name:message('pirateName'),hull,maxHull:hull,sailors,maxSailors:sailors,firepower:9+danger*4,round:1,reward:750+danger*400,regionId,range:'medium'};
  return success(state,'combatStart',{},'warn');
}
function victory(state) {
  const gold=state.combat.reward,stats=getStats(state);
  state.gold+=gold;
  state.reputation+=25;
  state.battlesWon++;
  state.morale=Math.min(100,state.morale+8);
  let free=stats.supplyCapacity-stats.supplyUsed;
  for (const id of ['food','water','ammo']) {
    const quantity=Math.min(free,4);
    state.supplies[id]+=quantity;
    free-=quantity;
  }
  gainExperience(state,45);
  state.combat=null;
  return success(state,'battleWin',{gold});
}
export function battle(state,{move}) {
  if (!state.combat) return fail('noCombat');
  if (!['cannon','board','guard','flee','repair','approach','withdraw'].includes(move)) return fail('invalid');
  const range=state.combat.range||'medium',ranges=['close','medium','long'];
  const volley=getVolley(state,range);
  if (move==='cannon'&&!volley.ammo) return fail('noCannons');
  if (move==='cannon'&&state.supplies.ammo<volley.ammo) return fail('ammo');
  if (move==='board'&&range!=='close') return fail('boardRange');
  if ((move==='approach'&&range==='close')||(move==='withdraw'&&range==='long')) return fail('rangeLimit');
  if (move==='repair'&&state.supplies.repair<3) return fail('notEnoughSupplies');
  if (move==='repair'&&state.fleet.every(ship=>ship.hull===shipStats(ship).maxHull)) return fail('full');
  const stats=getStats(state),enemy=state.combat;
  let key,values={},guard=1;
  if (move==='cannon') {
    state.supplies.ammo-=volley.ammo;
    const damage=Math.max(1,Math.round(volley.firepower*(.85+random(state)*.45)));
    enemy.hull=Math.max(0,enemy.hull-damage);
    key='battleCannon';values={damage,ammo:volley.ammo};
  }
  if (move==='approach'||move==='withdraw') {
    enemy.range=ranges[ranges.indexOf(range)+(move==='approach'?-1:1)];
    key=move==='approach'?'battleApproach':'battleWithdraw';
    values={range:{close:'近距离',medium:'中距离',long:'远距离'}[enemy.range]};
  }
  if (move==='board') {
    const damage=Math.max(2,Math.round(stats.boarding*(.55+random(state)*.35)));
    enemy.sailors=Math.max(0,enemy.sailors-damage);
    loseSailors(state,Math.max(1,Math.floor(enemy.sailors*.07)));
    key='battleBoard';values={damage};
  }
  if (move==='guard') {
    guard=.3;
    state.morale=Math.min(100,state.morale+3);
    key='battleGuard';
  }
  if (move==='repair') {
    state.supplies.repair-=3;
    let repair=0;
    for (const ship of state.fleet) {
      const heal=Math.min(24,shipStats(ship).maxHull-ship.hull);
      ship.hull+=heal;
      repair+=heal;
    }
    key='battleRepair';values={repair};
  }
  if (move==='flee') {
    if (random(state)<Math.min(.9,.45+stats.skills.navigation/400+stats.speed/180)) {
      state.combat=null;
      state.morale=Math.max(1,state.morale-3);
      return success(state,'battleFlee');
    }
    key='battleFleeFail';
  }
  addLog(state,message(key,values),move==='flee'?'warn':'info');
  resolveLosses(state);
  if (state.status==='lost') return {ok:true,message:state.ending};
  if (enemy.hull<=0||enemy.sailors<=0) return victory(state);
  const armor=state.fleet.reduce((sum,ship)=>sum+ship.armor,0)/state.fleet.length;
  const damage=Math.max(1,Math.round(enemy.firepower*(.8+random(state)*.4)*guard*(1-armor*.09)));
  damageFleet(state,damage);
  if (state.status==='lost') return {ok:true,message:state.ending};
  state.fatigue=Math.min(100,state.fatigue+1);
  enemy.round++;
  return success(state,'enemyAttack',{damage},'warn');
}
