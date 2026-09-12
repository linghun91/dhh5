import {PORTS,REGIONS} from './world.js';
import {SHIP_TYPES,CANNONS,CANNON_RANGE_FACTORS} from './naval.js';

const faction=(id,name,navyName,color,blurb,harbor,patrol,specialty)=>({id,name,navyName,fleetName:navyName,color,blurb,harbor,patrol,specialty,asset:`assets/factions/${id}.svg`});

export const FACTIONS={
  portugal:faction('portugal','葡萄牙王国','葡萄牙皇家海军','#c8102e','以卡拉维尔与 nao 开辟航路的早期远洋海军。',['nao','sixth-rate','caravel','brig'],['caravel','brig','sloop'],['caravel','nao','carrack','discovery-brig']),
  spain:faction('spain','西班牙王国','西班牙皇家海军','#f1bf00','盖伦与珍宝船队支撑的大西洋海军。',['galleon','heavy-frigate','xebec','brig'],['galleon','brig','sloop'],['galleon','trade-galleon','treasure-galleon','nao']),
  england:faction('england','英格兰王国','皇家海军','#012169','以评级战舰编成的远洋海军，一级舰坐镇母港。',['first-rate','third-rate','frigate','brig'],['frigate','brig','sloop'],['sloop','brig','sixth-rate','frigate','third-rate','first-rate']),
  netherlands:faction('netherlands','联省共和国','荷兰海军','#ff6600','商馆、弗鲁特与武装公司船并重的海上力量。',['east-indiaman','fluyt','sixth-rate','brig'],['fluyt','brig','sloop'],['fluyt','flyboat','east-indiaman','west-indiaman']),
  ottoman:faction('ottoman','奥斯曼帝国','奥斯曼帝国海军','#d4af37','地中海与红海的三桅快战船与重炮盖伦。',['xebec','galleon','baghlah','felucca'],['xebec','baghlah','felucca'],['xebec','felucca','baghlah','dhow']),
  venice:faction('venice','威尼斯共和国','威尼斯舰队','#8d1c3c','潟湖商船与武装商队并出的城邦海军。',['armed-indiaman','polacre','roundship','brigantine'],['polacre','brigantine','sloop'],['roundship','polacre','packet-ship']),
  genoa:faction('genoa','热那亚共和国','热那亚舰队','#b7c9e2','银行家供养的轻型护航与商船队。',['sixth-rate','trade-caravel','pink','brig'],['trade-caravel','brig','sloop'],['trade-caravel','pink','cog']),
  sweden:faction('sweden','瑞典王国','瑞典海军','#005eb8','北海与波罗的海的木材、铁器与轻型巡航舰。',['sixth-rate','brig','bark','sloop'],['brig','sloop','ketch'],['bark','brig','snow']),
  oman:faction('oman','阿曼苏丹国','阿曼舰队','#6b2d5b','熟悉季风的阿拉伯海商船与快战船。',['baghlah','dhow','xebec','felucca'],['dhow','xebec','felucca'],['dhow','baghlah','felucca']),
  mughal:faction('mughal','莫卧儿帝国','莫卧儿水师','#2e8b57','胡椒海岸的季风商船与护航快船。',['dhow','baghlah','trade-caravel','brigantine'],['dhow','brigantine','sloop'],['dhow','baghlah','trade-caravel']),
  japan:faction('japan','德川幕府','幕府水军','#bc002d','近海楼船与福船编制的港湾水军。',['atakebune','junk','ketch','sloop'],['junk','ketch','sloop'],['atakebune','junk','large-junk']),
  pirates:{id:'pirates',name:'海盗同盟',navyName:'黑帆海盗',fleetName:'黑潮海盗',color:'#1a1a1a',asset:'assets/factions/pirates.svg',blurb:'没有母港编制的黑帆船队，按海域拼凑捕获与改装的船体。',harbor:['brig','sloop','schooner'],patrol:['sloop','brigantine','schooner'],specialty:['sloop','brigantine','schooner','brig']},
  corsairs:{id:'corsairs',name:'私掠船队',navyName:'私掠许可证',fleetName:'私掠船队',color:'#5c3317',asset:'assets/factions/corsairs.svg',blurb:'持有或伪造许可证的猎手，专打商船与落单探险队。',harbor:['xebec','brigantine','armed-cutter'],patrol:['xebec','brigantine','schooner'],specialty:['xebec','brigantine','armed-cutter']}
};

export const PORT_FACTIONS={
  lisbon:'portugal',seville:'spain',genoa:'genoa',venice:'venice',istanbul:'ottoman',alexandria:'ottoman',
  london:'england',amsterdam:'netherlands',stockholm:'sweden',capetown:'netherlands',elmina:'portugal',capeverde:'portugal',
  aden:'ottoman',muscat:'oman',basra:'ottoman',goa:'portugal',calicut:'mughal',ceylon:'portugal',
  malacca:'portugal',jakarta:'netherlands',macau:'portugal',nagasaki:'japan',havana:'spain',veracruz:'spain'
};

export const CAPITALS=new Set(['lisbon','seville','london','amsterdam','istanbul','venice','goa','macau','havana','nagasaki']);
export const PIRATE_WATERS=new Set(['havana','veracruz','elmina','capeverde','malacca','jakarta','aden']);

const PIRATE_ROSTERS={
  north:['sloop','brigantine','brig'],
  mediterranean:['felucca','xebec','brigantine','sloop'],
  africa:['sloop','dhow','brig','xebec'],
  arabia:['dhow','baghlah','xebec'],
  india:['dhow','brig','sloop','baghlah'],
  asia:['sloop','junk','brigantine','large-junk'],
  caribbean:['sloop','schooner','brig','heavy-frigate']
};

export const factionOf=portId=>FACTIONS[PORT_FACTIONS[portId]];

export function harborFleet(portId) {
  const faction=factionOf(portId);
  const capital=CAPITALS.has(portId);
  const ships=[...(capital?faction.harbor:faction.patrol)];
  const stats=npcStats(ships,REGIONS[PORTS[portId].region].danger);
  return {portId,faction,ships,stats,capital,name:`${PORTS[portId].name}${capital?'母港舰队':'驻港巡防'}`,role:capital?'flag':'patrol'};
}

export function piratePressure(portId) {
  if (!PIRATE_WATERS.has(portId)) return null;
  const region=PORTS[portId].region;
  return {name:FACTIONS.pirates.fleetName,faction:FACTIONS.pirates,ships:[...PIRATE_ROSTERS[region]]};
}

export function npcStats(shipIds,danger=1) {
  const ships=shipIds.map(id=>SHIP_TYPES[id]);
  const hull=Math.max(40,Math.round(70+danger*20+ships.reduce((n,t)=>n+t.hull,0)*.22));
  const sailors=Math.max(12,Math.round(14+danger*6+ships.reduce((n,t)=>n+t.sailors,0)*.32));
  const firepowerByRange=Object.fromEntries(['close','medium','long'].map(range=>[range,Math.max(6,Math.round(6+danger*3+ships.reduce((n,t)=>{
    const guns=t.cabins.filter(cabin=>cabin==='cannon').length,cannon=CANNONS[t.defaultCannon];
    return n+cannon.firepower*guns*.45*CANNON_RANGE_FACTORS[cannon.range][range];
  },0)))]));
  const firepower=firepowerByRange.medium;
  const reward=Math.max(400,Math.round(500+danger*250+ships.reduce((n,t)=>n+t.price,0)*.028));
  return {hull,maxHull:hull,sailors,maxSailors:sailors,firepower,firepowerByRange,reward};
}

// Each sailing leg changes local jurisdiction halfway to its destination.
export function encounterPort(state) {
  const voyage=state.voyage;
  return voyage.progress>=voyage.distance/2?voyage.to:voyage.from;
}

export function seaEventIds(state,eventIds) {
  const portId=encounterPort(state),danger=REGIONS[PORTS[portId].region].danger;
  const ids=[...eventIds];
  // Pirate warnings in harbors describe a real increase in hostile encounters.
  if (PIRATE_WATERS.has(portId)) ids.push('pirates','pirates','corsair');
  if (danger>=3) ids.push('pirates');
  return ids;
}

function pickShips(kind,regionId,danger,roll) {
  const roster=kind==='pirates'?PIRATE_ROSTERS[regionId]:FACTIONS.corsairs.patrol;
  const extra=danger>2&&roll()>.45?1:0;
  const count=Math.min(roster.length,1+(danger>1?1:0)+extra);
  const ships=[];
  for (let i=0;i<count;i++) {
    const cap=Math.min(roster.length-1,Math.max(0,danger-1+i));
    ships.push(roster[Math.min(roster.length-1,Math.max(0,cap))]);
  }
  return ships.length?ships:[roster[0]];
}

function encounterName(kind,faction,ships) {
  const flag=SHIP_TYPES[ships[0]].name;
  if (kind==='pirates') return `${faction.fleetName} · ${flag}`;
  if (kind==='corsair') return `${faction.fleetName} · ${flag}`;
  return `${faction.navyName} · ${flag}`;
}

export function spawnEncounter(state,kind,roll=()=>.5) {
  const patrolPortId=encounterPort(state);
  const regionId=PORTS[patrolPortId].region;
  const danger=REGIONS[regionId].danger;
  const factionId=kind==='pirates'?'pirates':kind==='corsair'?'corsairs':PORT_FACTIONS[patrolPortId];
  const faction=FACTIONS[factionId];
  const progress=state.voyage.progress/state.voyage.distance;
  const harborPatrol=kind==='navy'&&CAPITALS.has(patrolPortId)&&(progress<.18||progress>.82)&&roll(state)<.22;
  const navyRoster=harborPatrol?faction.harbor:faction.patrol;
  const navyCount=harborPatrol?navyRoster.length:Math.min(navyRoster.length,1+(danger>1?1:0)+(CAPITALS.has(patrolPortId)&&danger>1?1:0));
  const ships=kind==='navy'?navyRoster.slice(0,navyCount):pickShips(kind,regionId,danger,()=>roll(state));
  const stats=npcStats(ships,danger);
  const toll=kind==='navy'?220+danger*140+ships.length*40:380+danger*120+ships.length*40;
  return {kind,factionId,regionId,patrolPortId,ships,flagship:ships[0],name:encounterName(kind,faction,ships),toll,...stats};
}

export function buildEvent(state,id,roll) {
  if (id==='pirates'||id==='navy'||id==='corsair') {
    const encounter=spawnEncounter(state,id==='navy'?'navy':id==='corsair'?'corsair':'pirates',roll);
    return {id,toll:encounter.toll,encounter};
  }
  return {id};
}
