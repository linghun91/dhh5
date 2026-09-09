export {PORTS,REGIONS} from './world.js';
const keyed = (rows,folder) => Object.fromEntries(rows.map(row => [row.id,{...row,asset:`assets/${folder}/${row.id}.svg`}]));
export const GOODS = keyed([
  {id:'grain',name:'谷物',price:38,description:'基础粮食，北方与地中海盛产。'},
  {id:'wine',name:'葡萄酒',price:95,description:'欧洲佳酿，远洋市场需求旺盛。'},
  {id:'cloth',name:'毛织物',price:125,description:'精织布匹，在热带港口颇受欢迎。'},
  {id:'olive',name:'橄榄油',price:82,description:'地中海特产，温暖阳光的馈赠。'},
  {id:'iron',name:'铁器',price:140,description:'北方出产的优质金属工具。'},
  {id:'spice',name:'香料',price:230,description:'胡椒与肉桂，是跨洋贸易的珍宝。'},
  {id:'ivory',name:'象牙工艺品',price:245,description:'历史时代的精雕工艺品。'},
  {id:'coffee',name:'咖啡',price:165,description:'阿拉伯海沿岸的芳香货品。'},
  {id:'cocoa',name:'可可',price:190,description:'加勒比海的浓郁特产。'},
  {id:'sugar',name:'蔗糖',price:105,description:'群岛出产的甜蜜结晶。'},
  {id:'silk',name:'丝绸',price:285,description:'东方的轻柔锦缎，海外售价可观。'},
  {id:'tea',name:'茶叶',price:180,description:'东方茶园的精挑叶片。'},
  {id:'porcelain',name:'青花瓷',price:310,description:'远东窑厂烧制的精致器皿。'},
  {id:'gold',name:'黄金',price:380,description:'黄金海岸与新大陆的贵金属。'},
  {id:'wood',name:'优质木材',price:65,description:'船匠与各地工坊不可或缺的原料。'},
  {id:'medicine',name:'药材',price:155,description:'港口药师调配的珍贵药用货品。'}
],'goods');
export const CABINS = keyed([
  {id:'cargo',name:'货仓',price:350,cargo:60,supply:0,firepower:0,marines:0,kitchen:0,medicine:0,description:'增加 60 单位商品容量。'},
  {id:'supply',name:'物资舱',price:300,cargo:0,supply:80,firepower:0,marines:0,kitchen:0,medicine:0,description:'增加 80 单位粮水、炮弹与维修材容量。'},
  {id:'cannon',name:'炮台',price:700,cargo:0,supply:0,firepower:0,marines:0,kitchen:0,medicine:0,description:'新建炮台需支付 700 施工费及该船默认火炮全价；建成即装炮，火力、射程与弹耗取决于炮型。'},
  {id:'marine',name:'水兵室',price:550,cargo:0,supply:0,firepower:0,marines:22,kitchen:0,medicine:0,description:'增加 22 白刃战力与 12 名水手上限。'},
  {id:'kitchen',name:'厨房',price:400,cargo:0,supply:0,firepower:0,marines:0,kitchen:1,medicine:0,description:'每艘设厨房的船使舰队粮食消耗降低，最多 40%。'},
  {id:'infirmary',name:'医务室',price:650,cargo:0,supply:0,firepower:0,marines:0,kitchen:0,medicine:1,description:'减少疾病伤亡，降低疲劳增长。'}
],'cabins');
export {SHIP_TYPES,CANNONS,NAVAL_NOTES} from './naval.js';
export const CREW = keyed([
  {id:'alvaro',name:'阿尔瓦罗',title:'远征船长',portId:'lisbon',price:0,navigation:55,trade:38,combat:48,medicine:18,description:'继承旧海图的年轻船长，决心收集七海的航海信物。'},
  {id:'ines',name:'伊内斯',title:'星象领航员',portId:'lisbon',price:1200,navigation:78,trade:35,combat:23,medicine:30,description:'相信星辰与数字，一次次把船队带回正确航线。'},
  {id:'marco',name:'马尔科',title:'精明主计长',portId:'genoa',price:1800,navigation:32,trade:86,combat:35,medicine:22,description:'一眼识破报价中的水分，熟悉各地商人的脾气。'},
  {id:'leila',name:'蕾拉',title:'随船医师',portId:'alexandria',price:1500,navigation:35,trade:38,combat:26,medicine:88,description:'擅长治疗远航的疾病，也读得懂古老遗迹的铭文。'},
  {id:'hassan',name:'哈桑',title:'季风领航员',portId:'muscat',price:1900,navigation:89,trade:50,combat:42,medicine:30,description:'在印度洋长大，能从浪花读出季风即将转向。'},
  {id:'mei',name:'梅青',title:'东方博物学者',portId:'macau',price:2300,navigation:60,trade:66,combat:30,medicine:78,description:'记录植物与星空，把知识视为最贵重的货物。'},
  {id:'kaori',name:'香织',title:'剑术教官',portId:'nagasaki',price:2600,navigation:45,trade:28,combat:92,medicine:30,description:'沉稳的剑士，能够将新招募的水手训练成接舷精兵。'},
  {id:'diego',name:'迭戈',title:'老练炮术长',portId:'havana',price:2100,navigation:50,trade:35,combat:86,medicine:20,description:'昔日的护航炮手，知道每一道浪谷都是瞄准的机会。'}
],'crew');
export const EQUIPMENT = keyed([
  {id:'compass',name:'黄铜罗盘',price:750,skill:'navigation',bonus:15,description:'航海能力 +15。'},
  {id:'sextant',name:'精密观星仪',price:1700,skill:'navigation',bonus:28,description:'航海能力 +28。'},
  {id:'sword',name:'精锻长剑',price:900,skill:'combat',bonus:18,description:'战斗能力 +18。'},
  {id:'musket',name:'燧发火枪',price:1800,skill:'combat',bonus:30,description:'战斗能力 +30。'},
  {id:'ledger',name:'商路账册',price:1100,skill:'trade',bonus:22,description:'贸易能力 +22。'},
  {id:'medicine',name:'医师药箱',price:1000,skill:'medicine',bonus:24,description:'医疗能力 +24。'}
],'equipment');
export const FACILITIES = keyed([
  {id:'market',name:'交易所',description:'签订合约，买卖当地特产与远洋货物。'},
  {id:'dock',name:'码头',description:'补充粮水、炮弹、维修材并招募水手。'},
  {id:'tavern',name:'酒馆',description:'休息，招募海员，购买航海装备。'},
  {id:'shipyard',name:'造船厂',description:'购买、维修与出售舰船，升级船帆和装甲。'},
  {id:'palace',name:'总督府',description:'投资贸易份额，领取地区信物与远征荣誉。'},
  {id:'guild',name:'商人行会',description:'承接限期运货委托，赚取金钱与声望。'},
  {id:'ruins',name:'遗迹',description:'组织岸上探索，寻找七海信物的线索。'}
],'facilities');
export const SUPPLIES = keyed([
  {id:'food',name:'食物',price:3,description:'每日消耗，厨房降低用量。'},
  {id:'water',name:'淡水',price:2,description:'每日消耗，缺水导致严重减员。'},
  {id:'ammo',name:'炮弹',price:12,description:'齐射按所装炮组耗弹；各船炮组弹耗相加后向上取整。'},
  {id:'repair',name:'维修材',price:15,description:'暴风加固和海战抢修时使用。'}
],'supplies');
export const ROLES = {captain:'船长',navigator:'领航员',accountant:'主计长',gunner:'炮术长',doctor:'船医'};
export const EVENTS = {
  storm:{id:'storm',name:'暴风来袭',description:'乌云压低了天际，巨浪将拍向船舷。',asset:'assets/supplies/repair.svg',choices:[{id:'shelter',name:'降帆避风',description:'停航一天，少量船体损伤。'},{id:'brace',name:'加固迎浪',description:'消耗 3 维修材，大幅降低损伤。'}]},
  pirates:{id:'pirates',name:'陌生黑帆',description:'一支海盗船驶入视野，号炮要求你交出过路费。',asset:'assets/ships/galleon.svg',choices:[{id:'fight',name:'准备迎战',description:'进入回合海战。'},{id:'pay',name:'支付通行费',description:'支付 450 金币，避免交火。'},{id:'evade',name:'全帆脱离',description:'领航能力决定逃脱机会，失败则进入战斗。'}]},
  castaway:{id:'castaway',name:'海上的求救',description:'一艘遇难渔船的幸存者挥舞着破旧的旗帜。',asset:'assets/crew/diego.svg',choices:[{id:'rescue',name:'救助幸存者',description:'消耗 5 粮水，获得声望与愿意加入的水手。'},{id:'leave',name:'送上祝福',description:'继续原定航线。'}]},
  salvage:{id:'salvage',name:'漂浮货箱',description:'海浪中出现几只仍然完好的密封货箱。',asset:'assets/goods/gold.svg',choices:[{id:'salvage',name:'打捞货箱',description:'水手疲劳 +5，找到一笔金币。'},{id:'leave',name:'保持航向',description:'继续原定航线。'}]},
  illness:{id:'illness',name:'船上疾病',description:'几名水手发烧倒下，必须决定应对办法。',asset:'assets/cabins/infirmary.svg',choices:[{id:'treat',name:'隔离护理',description:'消耗 4 食物；船医与医务室降低伤亡。'},{id:'endure',name:'压缩口粮休养',description:'增加疲劳并损失部分水手。'}]}
};
