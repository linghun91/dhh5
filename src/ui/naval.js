import { CANNONS, SHIP_TYPES } from '../data/catalog.js';
import { art, escape, stat } from './components.js';
import { RANGE_FACTORS } from '../systems/stats.js';

export const FAMILIES = {all:'全部舰型',exploration:'探险船',merchant:'商船',war:'战舰'};
export const RANGES = {long:'远程',medium:'中程',close:'近程'};
export const CANNON_KINDS = {all:'全部火炮',light:'轻炮',early:'早期炮',long:'长炮',carronade:'卡隆炮',mortar:'臼炮榴弹'};
export const WEIGHTS = {1:'轻型',2:'标准',3:'中型',4:'重型',5:'超重型'};
export const rateLabel = ship => ship.rate ? `${['','一','二','三','四','五','六'][ship.rate]}级舰` : '非分级舰';
export const cannonAt = (ship,slot) => ship.cabins[slot]==='cannon' ? CANNONS[ship.cannons?.[slot] || SHIP_TYPES[ship.type].defaultCannon] : null;
export const compatibleCannons = ship => Object.values(CANNONS).filter(c=>c.weight<=ship.maxGunWeight);

const cannonSources={
  swivel:'https://www.rmg.co.uk/collections/objects/rmgc-object-36835',
  culverin:'https://maryrose.org/discover/collections/the-weaponry-of-the-mary-rose/great-guns/',
  'demi-cannon':'https://maryrose.org/discover/collections/the-weaponry-of-the-mary-rose/great-guns/',
  'long-9':'https://www.rmg.co.uk/collections/objects/rmgc-object-86783',
  'long-18':'https://www.rijksmuseum.nl/en/collection/object/Model-of-a-18-pounder-cannon-on-a-gun-carriage--398defee74d765e61ac069354ad8f80f',
  'long-24':'https://ussconstitutionmuseum.org/2015/08/25/modern-armament/',
  'long-32':'https://www.rmg.co.uk/collections/objects/rmgc-object-36825',
  'carronade-32':'https://www.rmg.co.uk/stories/maritime-history/what-was-carronade'
};
const shipSources={
  caravel:'https://www.rmg.co.uk/collections/objects/rmgc-object-386365',
  carrack:'https://www.rmg.co.uk/stories/maritime-history/shipbuilding-800-1800',
  galleon:'https://www.rmg.co.uk/collections/objects/rmgc-object-66320',
  junk:'https://ich.unesco.org/en/USL/watertight-bulkhead-technology-of-chinese-junks-00321',
  sloop:'https://www.rmg.co.uk/collections/objects/rmgc-object-133796',
  brig:'https://historicengland.org.uk/listing/the-list/list-entry/1451624'
};
export const shipSourceLink=ship=>`<a class="naval-source" href="${shipSources[ship.id]||shipSources[ship.visualFamily]||shipSources[ship.visual]||'https://www.rmg.co.uk/stories/maritime-history/rated-navy-ships-17th-19th-centuries'}" target="_blank" rel="noreferrer">舰型与历史资料 ↗</a>`;
export const cannonSourceHref=cannon=>cannonSources[cannon.id]||cannonSources[cannon.visualFamily]||cannonSources[cannon.visual]||'https://www.rmg.co.uk/stories/maritime-history/what-was-carronade';

export const progression = family => Object.values(SHIP_TYPES).filter(ship=>ship.family===family).sort((a,b)=>a.rank-b.rank||a.price-b.price);
export const emptyCannons = '<p class="empty-state">此距离与门类组合暂无火炮。请选择其他筛选，或<button class="button outline tiny" data-action="reset-cannon-filters">显示全部火炮</button>。</p>';

export function cannonFacts(cannon) {
  const factors=RANGE_FACTORS[cannon.range];
  return `<div class="cannon-facts">${stat('炮组火力',cannon.firepower)}${stat('优势距离',RANGES[cannon.range])}${stat('承重需求',WEIGHTS[cannon.weight])}</div><p class="small muted">弹药系数 ${cannon.ammoCost} / 炮组 · 白刃支援 +${cannon.boarding}</p><div class="cannon-range-factors" aria-label="距离伤害倍率">${Object.entries(RANGES).map(([range,label])=>`<span>${label} <b>×${factors[range]}</b></span>`).join('')}</div>`;
}

export function cannonCard(cannon,action='',selected=false,inspected=false) {
  return `<article class="cannon-card ${selected?'selected':''} ${inspected?'inspected':''}"><div class="row spread"><span class="eyebrow">${escape(cannon.era)}</span><span class="badge ${cannon.range==='close'?'gold':'dim'}">${RANGES[cannon.range]}炮</span></div>${art(cannon.asset,cannon.name)}<h3>${escape(cannon.name)}</h3><p class="cannon-shot">${escape(cannon.shot)}</p><p class="cannon-description">${escape(cannon.description)}</p><a class="naval-source" href="${cannonSourceHref(cannon)}" target="_blank" rel="noreferrer">馆藏与炮型资料 ↗</a>${cannonFacts(cannon)}${action}</article>`;
}

export function historyNotes() {
  return `<details class="history-notes panel"><summary>历史考据 · 舰级、炮型与绘图依据 <span>展开资料</span></summary><div class="history-content"><p>本船厂汇集 15—19 世纪的船型与火炮，允许跨时代搭配。舰级参考英国海军 18 世纪后期至 1817 年前的惯例；这是炮数分级，不是通用的战力等级。</p><div class="table-scroll"><table class="rating-table"><thead><tr><th>舰级</th><th>典型额定炮数</th><th>主炮甲板</th><th>历史用途</th></tr></thead><tbody><tr><td>一级</td><td>100 门及以上</td><td>三层</td><td>舰队旗舰</td></tr><tr><td>二级</td><td>90—98 门</td><td>三层</td><td>重型战列舰</td></tr><tr><td>三级</td><td>64—80 门</td><td>双层</td><td>战列线主力，74 炮舰最具代表性</td></tr><tr><td>四级</td><td>50—60 门</td><td>双层</td><td>较小的战列舰，18 世纪末逐渐转为护航等任务</td></tr><tr><td>五级</td><td>32—40 门</td><td>单层</td><td>护卫舰，巡航、侦察与护商</td></tr><tr><td>六级</td><td>通常 22—28 门</td><td>单层</td><td>小型护卫舰</td></tr></tbody></table></div><p>“磅”表示所发实心弹的名义重量，不是炮口直径。蛇炮、半加农炮沿用早期炮种名称；长炮使用轮式木炮架，卡隆炮以短粗炮管与滑架区分，旋回炮使用叉形支座。</p><p>图中炮门为结构示意；额定炮数不等于舱位数量。一个炮台舱代表一组火炮，水手、价格、火力、承重与距离倍率均为游戏平衡数值。</p><ul class="source-links"><li><a href="https://www.rmg.co.uk/stories/maritime-history/rated-navy-ships-17th-19th-centuries" target="_blank" rel="noreferrer">Royal Museums Greenwich · 英国海军六级分制</a></li><li><a href="https://www.rmg.co.uk/collections/objects/rmgc-object-66404" target="_blank" rel="noreferrer">Royal Museums Greenwich · 100 炮三层战列舰模型</a></li><li><a href="https://maryrose.org/discover/collections/the-weaponry-of-the-mary-rose/" target="_blank" rel="noreferrer">Mary Rose Museum · 16 世纪舰载武器</a></li><li><a href="https://ussconstitutionmuseum.org/2016/03/17/1906-guns/" target="_blank" rel="noreferrer">USS Constitution Museum · 长炮与卡隆炮</a></li></ul></div></details>`;
}

export function batterySummary(ship) {
  const counts={};
  ship.cabins.forEach((_,slot)=>{const cannon=cannonAt(ship,slot);if(cannon)counts[cannon.id]=(counts[cannon.id]||0)+1;});
  return `<div class="battery-chips">${Object.entries(counts).map(([id,n])=>`<span>${art(CANNONS[id].asset,CANNONS[id].name)}${escape(CANNONS[id].name)} <b>×${n}</b></span>`).join('')||'<span class="muted">未配置炮台</span>'}</div>`;
}
