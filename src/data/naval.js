// Historical identities follow the Royal Museums Greenwich rating guide.
// Slots, crew complements, prices and weapon performance are game abstractions.
const CANNON_HULLS=['swivel','culverin','demi-cannon','long-9','long-18','long-24','long-32','carronade-32'];
function cannonVisual(row) {
  if (row.visual) return row.visual;
  if (CANNON_HULLS.includes(row.id)) return row.id;
  if (row.kind==='light') return 'swivel';
  if (row.kind==='carronade') return 'carronade-32';
  if (row.kind==='mortar') return row.weight>=4?'demi-cannon':'carronade-32';
  if (row.kind==='early') return row.weight>=4?'demi-cannon':'culverin';
  if (row.weight<=2) return 'long-9';
  if (row.weight===3) return 'long-18';
  if (row.weight===4) return 'long-24';
  return 'long-32';
}
const keyed=(rows,folder)=>Object.fromEntries(rows.map(row=>{
  // Keep the old illustration family for source links, but every catalog entry
  // has its own asset. Similar hulls must not silently inherit another rig.
  const visualFamily=folder==='cannons'?cannonVisual(row):(row.visual||row.id);
  return [row.id,{...row,visualFamily,visual:row.id,asset:`assets/${folder}/${row.id}.svg`}];
}));

export const RIG_LABELS={lug:'斜桁帆',gaff:'纵帆',lateen:'三角帆',square:'横帆',junk:'硬篷',mixed:'混装帆',barque:'巴克帆装',xebec:'三桅三角帆'};
export const CANNON_RANGE_FACTORS={
  long:{long:1.15,medium:1,close:.8},
  medium:{long:.65,medium:1,close:1},
  close:{long:.25,medium:.65,close:1.5}
};
const P=(masts,rig,castle=1,decks=null)=>({masts,rig,castle,decks});
const PROFILE={
  dinghy:P(1,'lug',0,0),shallop:P(1,'gaff',0,0),smack:P(1,'gaff',0,0),pinnace:P(1,'lug',0,0),
  'coastal-cutter':P(1,'gaff',0,1),yawl:P(2,'gaff',0,1),ketch:P(2,'gaff',1),schooner:P(2,'gaff',0,1),
  felucca:P(1,'lateen',0),barca:P(1,'lateen',1),caravel:P(2,'lateen',1),'caravel-redonda':P(2,'mixed',1),
  nao:P(3,'square',2),'discovery-brig':P(2,'square',1),snow:P(2,'square',1),bark:P(3,'barque',1),
  packet:P(3,'square',1),'survey-brig':P(2,'square',1),'discovery-frigate':P(3,'square',1),
  'ice-bark':P(3,'barque',1),'discovery-flagship':P(3,'square',2),
  cog:P(1,'square',2),hulk:P(1,'square',2),roundship:P(2,'square',2),flyboat:P(2,'square',1),
  'trade-caravel':P(2,'lateen',1),dhow:P(1,'lateen',1),pink:P(2,'square',1),carrack:P(3,'square',2),
  fluyt:P(3,'square',1),baghlah:P(2,'lateen',1),junk:P(3,'junk',1),polacre:P(3,'mixed',1),
  'trade-galleon':P(3,'square',2),'trade-snow':P(2,'square',1),'west-indiaman':P(3,'square',1),
  'large-junk':P(3,'junk',1),'packet-ship':P(3,'square',1),'east-indiaman':P(3,'square',2),
  'tea-ship':P(3,'square',1),'armed-indiaman':P(3,'square',2),'grand-indiaman':P(3,'square',2),
  'treasure-galleon':P(3,'square',2),
  gunboat:P(1,'gaff',0,1),'armed-cutter':P(1,'gaff',0,1),sloop:P(1,'gaff',0),brigantine:P(2,'mixed',1),
  brig:P(2,'square',1),xebec:P(3,'xebec',1),'war-snow':P(2,'square',1),corvette:P(3,'square',1),
  'post-ship':P(3,'square',1),'sixth-24':P(3,'square',1),'sixth-rate':P(3,'square',1),
  atakebune:P(2,'junk',2),'fifth-32':P(3,'square',1),galleon:P(3,'square',2),'fifth-36':P(3,'square',1),
  frigate:P(3,'square',1),'heavy-frigate':P(3,'square',1),razee:P(3,'square',1),
  'fourth-rate':P(3,'square',2),'fourth-60':P(3,'square',2),'third-64':P(3,'square',2),
  'third-70':P(3,'square',2),'third-rate':P(3,'square',2),'third-80':P(3,'square',2),
  'second-90':P(3,'square',3),'second-rate':P(3,'square',3),'first-rate':P(3,'square',3),
  'first-110':P(3,'square',3),'first-120':P(3,'square',3)
};

function layout(family,slots,batteries) {
  const kitchen=1,infirmary=slots>=7?1:0;
  const marine=family==='war'?(slots>=14?3:slots>=12?2:slots>=6?1:0):(slots>=9?1:0);
  const rest=slots-kitchen-infirmary-marine-batteries;
  if (rest<2) throw new Error(`cabin layout ${family} slots=${slots} batteries=${batteries}`);
  let cargo=Math.max(family==='merchant'?2:1,Math.round(rest*(family==='merchant'?.58:family==='exploration'?.48:.36)));
  let supply=rest-cargo;
  if (supply<1) {cargo-=1;supply=1;}
  if (cargo<1) {supply-=1;cargo=1;}
  return [...Array(cargo).fill('cargo'),...Array(supply).fill('supply'),...Array(batteries).fill('cannon'),...Array(marine).fill('marine'),'kitchen',...Array(infirmary).fill('infirmary')];
}

function ship(id,name,family,spec) {
  const {batteries,...rest}=spec;
  const cabins=spec.cabins||layout(family,spec.slots,batteries);
  if (cabins.length!==spec.slots) throw new Error(`${id} cabins ${cabins.length}!=${spec.slots}`);
  const profile=PROFILE[id]||{masts:2,rig:'square',castle:1};
  const gunCount=batteries??cabins.filter(cabin=>cabin==='cannon').length;
  const gunDecks=rest.gunDecks??profile.decks??(rest.rate===1||rest.rate===2?3:rest.rate===3||rest.rate===4?2:gunCount>=1?1:0);
  return {id,name,family,rate:0,ratedGuns:0,...rest,masts:rest.masts??profile.masts,rig:rest.rig??profile.rig,castle:rest.castle??profile.castle,gunDecks,batterySlots:gunCount,cabins};
}

export const CANNONS=keyed([
  {id:'swivel-1',name:'1 磅旋回炮',price:260,firepower:5,range:'close',weight:1,ammoCost:.12,boarding:5,kind:'light',era:'16—18 世纪',shot:'1 磅散弹',description:'最轻的舷缘旋回炮，适合渔帆与港湾小艇驱赶登船者。'},
  {id:'robinet',name:'罗宾内特小炮',price:320,firepower:6,range:'close',weight:1,ammoCost:.16,boarding:6,kind:'light',era:'16 世纪',shot:'小型实心弹',description:'早期青铜小炮，火力有限，却能让轻型船体第一次拥有侧舷声音。'},
  {id:'falconet',name:'隼炮',price:380,firepower:7,range:'close',weight:1,ammoCost:.2,boarding:7,kind:'light',era:'16 世纪',shot:'隼炮弹',description:'比旋回炮略重的早期轻炮，近距驱散甲板上的水手。'},
  {id:'swivel',name:'旋回小炮',price:450,firepower:8,range:'close',weight:1,ammoCost:.25,boarding:10,kind:'light',era:'16—18 世纪',shot:'小型散弹炮',description:'舷缘叉架上的轻型旋回炮，擅长近距离压制甲板与支援接舷，远射弱。'},
  {id:'wall-gun',name:'舷墙铳',price:500,firepower:9,range:'close',weight:1,ammoCost:.28,boarding:14,kind:'light',era:'17—18 世纪',shot:'铁弹与霰弹',description:'固定在舷墙上的重型火绳/燧发铳，接舷时比小炮更凶。'},
  {id:'swivel-3',name:'3 磅旋回炮',price:560,firepower:10,range:'close',weight:1,ammoCost:.3,boarding:12,kind:'light',era:'18 世纪',shot:'3 磅散弹',description:'加重旋回炮，仍用叉架，但对小艇与索具的杀伤明显提高。'},
  {id:'falcon',name:'猎鹰炮',price:620,firepower:11,range:'long',weight:1,ammoCost:.32,boarding:2,kind:'light',era:'16 世纪',shot:'猎鹰炮弹',description:'早期轻型长身炮，可作侦察船的远距警告炮。'},
  {id:'long-3',name:'3 磅长炮',price:640,firepower:12,range:'long',weight:1,ammoCost:.3,boarding:0,kind:'long',era:'18 世纪',shot:'3 磅实心弹',description:'最小的制式长炮，弹耗极低，适合入门武装与通讯舰。'},
  {id:'long-4',name:'4 磅长炮',price:700,firepower:13,range:'long',weight:1,ammoCost:.32,boarding:0,kind:'long',era:'18 世纪',shot:'4 磅实心弹',description:'小型巡航与商船自卫的常用轻炮，承重需求仍低。'},
  {id:'minion',name:'轻蛇炮',price:720,firepower:13,range:'long',weight:2,ammoCost:.35,boarding:0,kind:'early',era:'16 世纪',shot:'早期轻弹',description:'蛇炮序列中的轻型，身管细长，是卡拉维尔常见的早期舷炮。'},
  {id:'short-6',name:'6 磅短炮',price:740,firepower:13,range:'medium',weight:1,ammoCost:.34,boarding:1,kind:'long',era:'18 世纪',shot:'6 磅实心弹',description:'缩短身管的 6 磅炮，中距够用，远射略逊长炮。'},
  {id:'carronade-6',name:'6 磅卡隆炮',price:720,firepower:14,range:'close',weight:1,ammoCost:.35,boarding:4,kind:'carronade',era:'18 世纪后期',shot:'6 磅炮弹',description:'最小的卡隆炮，让轻型船体在贴近时拥有超出承重的近战火力。'},
  {id:'long-6',name:'6 磅长炮',price:760,firepower:14,range:'long',weight:2,ammoCost:.36,boarding:0,kind:'long',era:'18 世纪',shot:'6 磅实心弹',description:'双桅军舰与纵帆船常用的轻型长炮，弹道平直。'},
  {id:'chase-6',name:'6 磅艏炮',price:780,firepower:13,range:'long',weight:1,ammoCost:.34,boarding:0,kind:'long',era:'18 世纪',shot:'6 磅追击弹',description:'布置在艏楼的追击炮，用于逃跑或追击时的远距点射。'},
  {id:'saker',name:'萨卡炮',price:800,firepower:15,range:'long',weight:2,ammoCost:.38,boarding:0,kind:'early',era:'16—17 世纪',shot:'萨卡炮弹',description:'介于轻蛇炮与半蛇炮之间的早期长炮，地中海与北欧都常见。'},
  {id:'short-9',name:'9 磅短炮',price:780,firepower:15,range:'medium',weight:2,ammoCost:.38,boarding:1,kind:'long',era:'18 世纪',shot:'9 磅实心弹',description:'身管较短的 9 磅炮，中距输出接近长炮，远射略差。'},
  {id:'long-9',name:'9 磅长炮',price:800,firepower:16,range:'long',weight:2,ammoCost:.4,boarding:0,kind:'long',era:'18 世纪后期',shot:'9 磅实心弹',description:'轻型巡航舰常见的长炮，弹耗低，适合侦察舰与远距牵制；磅数指炮弹重量。'},
  {id:'chase-9',name:'9 磅艏炮',price:820,firepower:15,range:'long',weight:2,ammoCost:.38,boarding:0,kind:'long',era:'18 世纪',shot:'9 磅追击弹',description:'护卫舰艏楼常用的 9 磅追击炮，用于切断敌舰桅杆。'},
  {id:'demi-culverin',name:'半蛇炮',price:830,firepower:17,range:'long',weight:2,ammoCost:.45,boarding:0,kind:'early',era:'16—17 世纪',shot:'半蛇炮弹',description:'早期长炮主力之一，火力接近后期 9—12 磅长炮。'},
  {id:'perrier',name:'石弹炮',price:840,firepower:14,range:'medium',weight:2,ammoCost:.4,boarding:4,kind:'mortar',era:'16 世纪',shot:'石弹',description:'发射石弹的早期中距炮，破碎弹丸对人员和索具有效。'},
  {id:'culverin',name:'长身蛇炮',price:850,firepower:18,range:'long',weight:2,ammoCost:.5,boarding:0,kind:'early',era:'16—17 世纪',shot:'早期长炮型号',description:'大航海时代常见的长身炮。蛇炮名称随地区与时期而变，本作取长身远射特点。'},
  {id:'pedrero',name:'佩德雷罗石炮',price:880,firepower:16,range:'close',weight:2,ammoCost:.42,boarding:6,kind:'mortar',era:'16 世纪',shot:'石弹',description:'伊比利亚石弹炮，近距以碎裂弹丸清扫甲板。'},
  {id:'carronade-12',name:'12 磅卡隆炮',price:980,firepower:18,range:'close',weight:2,ammoCost:.48,boarding:5,kind:'carronade',era:'18 世纪后期',shot:'12 磅炮弹',description:'轻型卡隆炮，双桅舰在接舷前可用来撕开敌方舷墙。'},
  {id:'short-12',name:'12 磅短炮',price:1000,firepower:18,range:'medium',weight:2,ammoCost:.48,boarding:1,kind:'long',era:'18 世纪',shot:'12 磅实心弹',description:'缩短的 12 磅炮，中距可靠，适合货舱宝贵的商船。'},
  {id:'long-12',name:'12 磅长炮',price:1100,firepower:19,range:'long',weight:3,ammoCost:.52,boarding:0,kind:'long',era:'18 世纪',shot:'12 磅实心弹',description:'六级舰与武装商船的常用主炮，是 9 磅与 18 磅之间的台阶。'},
  {id:'medium-12',name:'12 磅中管炮',price:1050,firepower:18,range:'long',weight:2,ammoCost:.5,boarding:0,kind:'long',era:'18 世纪',shot:'12 磅实心弹',description:'身管介于长短之间，承重略低于标准 12 磅长炮。'},
  {id:'chase-12',name:'12 磅艏炮',price:1080,firepower:18,range:'long',weight:2,ammoCost:.5,boarding:0,kind:'long',era:'18 世纪',shot:'12 磅追击弹',description:'护卫舰常用艏炮，追击时比舷侧短炮打得更远。'},
  {id:'gunnade',name:'12 磅混合炮',price:1120,firepower:20,range:'close',weight:2,ammoCost:.52,boarding:5,kind:'carronade',era:'18 世纪后期',shot:'12 磅炮弹',description:'卡隆炮与长炮之间的过渡型号，近距强、中距尚可。'},
  {id:'pasavolante',name:'帕萨沃兰特长炮',price:1180,firepower:20,range:'long',weight:3,ammoCost:.55,boarding:0,kind:'early',era:'16—17 世纪',shot:'细长实心弹',description:'西班牙细长重炮，射程出色，是盖伦舰早期的远射选择。'},
  {id:'hongyi',name:'红夷炮',price:1250,firepower:21,range:'long',weight:3,ammoCost:.58,boarding:0,kind:'early',era:'17 世纪',shot:'红夷实心弹',description:'东亚仿铸的西洋长炮，福船与安宅船可借此获得远距火力。'},
  {id:'culverin-royal',name:'皇家蛇炮',price:1280,firepower:22,range:'long',weight:3,ammoCost:.6,boarding:0,kind:'early',era:'16—17 世纪',shot:'重型蛇炮弹',description:'蛇炮序列的重型，接近后期 18 磅长炮的远射能力。'},
  {id:'carronade-18',name:'18 磅卡隆炮',price:1300,firepower:22,range:'close',weight:2,ammoCost:.6,boarding:6,kind:'carronade',era:'18 世纪后期',shot:'18 磅炮弹',description:'护卫舰近战常用的中型卡隆炮，承重低于同磅长炮。'},
  {id:'short-18',name:'18 磅短炮',price:1280,firepower:22,range:'medium',weight:3,ammoCost:.6,boarding:1,kind:'long',era:'18 世纪',shot:'18 磅实心弹',description:'缩短身管的 18 磅炮，中距输出接近长炮。'},
  {id:'medium-18',name:'18 磅中管炮',price:1320,firepower:21,range:'long',weight:3,ammoCost:.62,boarding:0,kind:'long',era:'18 世纪',shot:'18 磅实心弹',description:'比标准 18 磅长炮略短，弹耗与火力都更温和。'},
  {id:'chase-18',name:'18 磅艏炮',price:1340,firepower:22,range:'long',weight:3,ammoCost:.62,boarding:0,kind:'long',era:'18 世纪',shot:'18 磅追击弹',description:'重型护卫舰的艏追击炮，用来打断敌舰前桅。'},
  {id:'long-18',name:'18 磅长炮',price:1350,firepower:23,range:'long',weight:3,ammoCost:.65,boarding:0,kind:'long',era:'18 世纪后期',shot:'18 磅实心弹',description:'重型护卫舰的代表主炮，在威力与承重之间取得平衡，也可用于战列舰上层。'},
  {id:'howitzer-8',name:'8 寸榴弹炮',price:1480,firepower:24,range:'close',weight:3,ammoCost:.7,boarding:3,kind:'mortar',era:'18 世纪',shot:'8 寸榴弹',description:'短身管曲射炮，近距以爆炸弹打击甲板与索具。'},
  {id:'carronade-24',name:'24 磅卡隆炮',price:1500,firepower:26,range:'close',weight:3,ammoCost:.72,boarding:7,kind:'carronade',era:'18 世纪后期',shot:'24 磅炮弹',description:'重型卡隆炮，四级以下军舰贴近时的主力近战武器。'},
  {id:'short-24',name:'24 磅短炮',price:1550,firepower:26,range:'medium',weight:3,ammoCost:.75,boarding:2,kind:'long',era:'18 世纪',shot:'24 磅实心弹',description:'缩短的 24 磅炮，让承重不足的船体也能打出中距重弹。'},
  {id:'medium-24',name:'24 磅中管炮',price:1650,firepower:26,range:'long',weight:3,ammoCost:.78,boarding:0,kind:'long',era:'18 世纪',shot:'24 磅实心弹',description:'中等身管的 24 磅炮，远射略逊标准长炮，承重更友好。'},
  {id:'chase-24',name:'24 磅艏炮',price:1700,firepower:27,range:'long',weight:4,ammoCost:.8,boarding:0,kind:'long',era:'18 世纪',shot:'24 磅追击弹',description:'战列舰与重型护卫舰的重型追击炮。'},
  {id:'bombard',name:'舰载臼炮',price:1580,firepower:28,range:'close',weight:4,ammoCost:.85,boarding:2,kind:'mortar',era:'16—17 世纪',shot:'抛射弹',description:'早期抛射重炮，近距砸击敌舰甲板，远射几乎无效。'},
  {id:'shell-24',name:'24 磅开花弹炮',price:1750,firepower:28,range:'medium',weight:4,ammoCost:.85,boarding:2,kind:'mortar',era:'18 世纪后期',shot:'24 磅开花弹',description:'发射早期爆炸弹的中距炮，对上层建筑破坏力突出。'},
  {id:'demi-cannon',name:'半加农炮',price:1500,firepower:29,range:'medium',weight:4,ammoCost:.9,boarding:2,kind:'early',era:'16—17 世纪',shot:'早期重炮型号',description:'早期重型半加农炮，炮身较蛇炮粗短，以沉重弹丸破坏船体，需较强船体承重。'},
  {id:'long-24',name:'24 磅长炮',price:1800,firepower:29,range:'long',weight:4,ammoCost:.85,boarding:0,kind:'long',era:'18 世纪后期',shot:'24 磅实心弹',description:'适合较大军舰炮甲板的重型长炮，远距火力强，需要更多弹药和承重。'},
  {id:'balyemez',name:'巴勒耶梅兹重炮',price:1850,firepower:30,range:'medium',weight:4,ammoCost:.92,boarding:1,kind:'early',era:'16—17 世纪',shot:'奥斯曼重弹',description:'奥斯曼海军的重型舷炮，中距砸击船体，是地中海盖伦的对手。'},
  {id:'carronade-32',name:'32 磅卡隆炮',price:1650,firepower:30,range:'close',weight:3,ammoCost:.8,boarding:8,kind:'carronade',era:'18 世纪后期',shot:'32 磅炮弹',description:'短身轻量的近战舰炮，以较低承重发射重弹，贴近敌舰时威力突出，远距离明显乏力。'},
  {id:'short-32',name:'32 磅短炮',price:1900,firepower:31,range:'medium',weight:4,ammoCost:.95,boarding:2,kind:'long',era:'18 世纪',shot:'32 磅实心弹',description:'缩短身管的 32 磅炮，让四级舰在中距打出接近下层炮甲板的重量。'},
  {id:'cannon-7',name:'七成加农炮',price:2000,firepower:32,range:'medium',weight:4,ammoCost:1,boarding:2,kind:'early',era:'16—17 世纪',shot:'重型加农弹',description:'介于半加农与全加农之间的早期重炮，盖伦下层甲板的常见选择。'},
  {id:'mortar-10',name:'10 寸舰臼炮',price:2050,firepower:27,range:'close',weight:4,ammoCost:.9,boarding:0,kind:'mortar',era:'18 世纪',shot:'10 寸抛射弹',description:'炮击舰使用的曲射臼炮，对近距甲板与岸防有效，远射极差。'},
  {id:'medium-32',name:'32 磅中管炮',price:2150,firepower:33,range:'long',weight:4,ammoCost:1.05,boarding:0,kind:'long',era:'18 世纪',shot:'32 磅实心弹',description:'比标准 32 磅长炮略短，让承重临界的船体也能使用重弹。'},
  {id:'cannon',name:'全加农炮',price:2200,firepower:34,range:'medium',weight:5,ammoCost:1.1,boarding:2,kind:'early',era:'16—17 世纪',shot:'加农重弹',description:'早期最重的舷侧加农，身管粗短，专打船体。'},
  {id:'carronade-42',name:'42 磅卡隆炮',price:2100,firepower:34,range:'close',weight:4,ammoCost:1,boarding:9,kind:'carronade',era:'18 世纪后期',shot:'42 磅炮弹',description:'重型卡隆炮，战列舰上层近战混装的凶狠选择。'},
  {id:'shell-32',name:'32 磅开花弹炮',price:2300,firepower:34,range:'medium',weight:5,ammoCost:1.1,boarding:2,kind:'mortar',era:'18 世纪后期',shot:'32 磅开花弹',description:'重型爆炸弹炮，中距破坏上层建筑，弹耗与承重都高。'},
  {id:'long-32',name:'32 磅长炮',price:2400,firepower:35,range:'long',weight:5,ammoCost:1.15,boarding:0,kind:'long',era:'18 世纪后期',shot:'32 磅实心弹',description:'大型战列舰下层炮甲板的重炮。最强远射火力之一，承重与弹耗需求也高。'},
  {id:'basilisk',name:'蛇怪重炮',price:2500,firepower:36,range:'long',weight:5,ammoCost:1.2,boarding:0,kind:'early',era:'16—17 世纪',shot:'蛇怪重弹',description:'早期超重长炮，名称来自传说中的蛇怪，射程与弹重都接近后期 32 磅以上长炮。'},
  {id:'mortar-13',name:'13 寸舰臼炮',price:2550,firepower:33,range:'close',weight:5,ammoCost:1.15,boarding:0,kind:'mortar',era:'18 世纪',shot:'13 寸抛射弹',description:'最大的舰载臼炮，专用于近距炮击与轰击港湾工事。'},
  {id:'long-36',name:'36 磅长炮',price:2700,firepower:38,range:'long',weight:5,ammoCost:1.25,boarding:0,kind:'long',era:'18 世纪',shot:'36 磅实心弹',description:'法国与西班牙战列舰常见的下层重炮，比 32 磅更重、弹耗更高。'},
  {id:'carronade-68',name:'68 磅卡隆炮',price:2800,firepower:40,range:'close',weight:4,ammoCost:1.3,boarding:12,kind:'carronade',era:'18 世纪后期',shot:'68 磅炮弹',description:'最重的卡隆炮之一，近距几乎能撕开同级船体，远距离则难以瞄准。'},
  {id:'long-42',name:'42 磅长炮',price:3100,firepower:42,range:'long',weight:5,ammoCost:1.4,boarding:0,kind:'long',era:'18 世纪',shot:'42 磅实心弹',description:'一级舰下层的超重长炮。火力顶点，只有最厚的炮架承重才装得下。'}
],'cannons');

export const SHIP_TYPES=keyed([
  ship('dinghy','港湾舢板','exploration',{rank:1,visual:'sloop',era:'15—18 世纪',role:'港湾摆渡 · 入门练手',maxGunWeight:1,defaultCannon:'swivel-1',price:1200,hull:48,sailors:14,speed:16,slots:4,batteries:1,description:'最小的入门帆船。甲板狭窄，只能装一门轻型旋回炮，适合熟悉操帆与补给节奏。'}),
  ship('shallop','浅水纵帆艇','exploration',{rank:2,visual:'sloop',era:'15—17 世纪',role:'浅滩探测 · 河口航行',maxGunWeight:1,defaultCannon:'robinet',price:1800,hull:62,sailors:16,speed:18,slots:4,batteries:1,description:'吃水极浅，可沿河口与沙洲探路。船体仍弱，遇到武装船只能掉头。'}),
  ship('smack','渔帆船','exploration',{rank:3,visual:'sloop',era:'16—18 世纪',role:'沿岸渔猎 · 短途补给',maxGunWeight:1,defaultCannon:'falconet',price:2400,hull:78,sailors:18,speed:19,slots:4,batteries:1,description:'从渔船改装的沿岸帆船，货舱很小，却是许多船长真正的第一艘船。'}),
  ship('pinnace','轻型长艇','exploration',{rank:4,visual:'sloop',era:'16—17 世纪',role:'随船侦察 · 港湾联络',maxGunWeight:1,defaultCannon:'swivel',price:3000,hull:90,sailors:20,speed:22,slots:5,batteries:1,description:'大船随行的轻型长艇独立出航时，就是一艘敏捷的侦察帆船。'}),
  ship('coastal-cutter','沿岸快艇','exploration',{rank:5,visual:'sloop',era:'18 世纪',role:'快速通信 · 近岸侦察',maxGunWeight:1,defaultCannon:'falcon',price:3600,hull:100,sailors:22,speed:29,slots:5,batteries:1,description:'单桅纵帆、艏三角帆，航速开始接近军用快艇，仍只能承担轻炮。'}),
  ship('yawl','尾桅纵帆艇','exploration',{rank:6,visual:'sloop',era:'18 世纪',role:'近海测量 · 灵活补给',maxGunWeight:2,defaultCannon:'long-3',price:4300,hull:112,sailors:24,speed:26,slots:5,batteries:1,description:'主桅加小型尾桅，操纵比单桅更稳，可换装 3 磅长炮作警告射击。'}),
  ship('ketch','双桅纵帆艇','exploration',{rank:7,visual:'brig',era:'17—18 世纪',role:'沿海勘探 · 轻装贸易',maxGunWeight:2,defaultCannon:'long-4',price:5100,hull:128,sailors:28,speed:25,slots:6,batteries:1,description:'两根纵帆桅使长途沿岸航行更轻松，是许多探险队的第二艘船。'}),
  ship('schooner','纵帆快船','exploration',{rank:8,visual:'sloop',era:'18 世纪',role:'快速探索 · 信风航行',maxGunWeight:2,defaultCannon:'long-6',price:5900,hull:142,sailors:32,speed:30,slots:6,batteries:1,description:'锐利的纵帆快船，逆风性能出色，适合在岛链间穿梭探路。'}),
  ship('felucca','三角帆快船','exploration',{rank:9,visual:'caravel',era:'16—18 世纪',role:'地中海侦察 · 沿岸信使',maxGunWeight:2,defaultCannon:'saker',price:6100,hull:138,sailors:30,speed:27,slots:6,batteries:1,description:'地中海三角帆快船，浅吃水、转向灵活，也常被私掠者借用。'}),
  ship('barca','巴尔卡沿岸船','exploration',{rank:10,visual:'caravel',era:'15—16 世纪',role:'早期沿岸 · 探路补给',maxGunWeight:2,defaultCannon:'culverin',price:6400,hull:152,sailors:34,speed:23,slots:6,batteries:1,description:'伊比利亚沿岸巴尔卡，卡拉维尔的近亲，开始具备真正的远航雏形。'}),
  ship('caravel','卡拉维尔轻快帆船','exploration',{rank:12,visual:'caravel',gunDecks:0,era:'15—16 世纪',role:'沿岸探索 · 灵活贸易',maxGunWeight:2,defaultCannon:'culverin',price:6500,hull:160,sailors:40,speed:24,slots:6,cabins:['cargo','cargo','supply','supply','cannon','kitchen'],description:'浅吃水与灵活帆装适合早期远航探索。两间货仓便于贸易，船体仅能承担轻型火炮。'}),
  ship('caravel-redonda','圆帆卡拉维尔','exploration',{rank:13,visual:'caravel',era:'15—16 世纪',role:'跨洋探索 · 混合帆装',maxGunWeight:2,defaultCannon:'culverin',price:7800,hull:178,sailors:44,speed:23,slots:7,batteries:1,description:'在三角帆之外加横帆，越洋时更稳，是卡拉维尔到 nao 的过渡。'}),
  ship('nao','nao 远航帆船','exploration',{rank:15,visual:'carrack',era:'15—16 世纪',role:'远洋探索 · 早期旗舰',maxGunWeight:3,defaultCannon:'culverin',price:9200,hull:205,sailors:52,speed:21,slots:7,batteries:1,description:'葡萄牙远航的工作马。比卡拉维尔更大、更耐浪，仍未进入后期评级。'}),
  ship('discovery-brig','探险双桅船','exploration',{rank:17,visual:'brig',era:'18 世纪',role:'海图测绘 · 武装探路',maxGunWeight:3,defaultCannon:'long-9',price:11200,hull:218,sailors:50,speed:27,slots:8,batteries:2,description:'把军用双桅的帆装用于探路，两门轻炮足够吓退小股海盗。'}),
  ship('snow','斯诺探险船','exploration',{rank:19,visual:'brig',era:'18 世纪',role:'长途勘探 · 科学航行',maxGunWeight:3,defaultCannon:'long-9',price:12800,hull:232,sailors:54,speed:26,slots:8,batteries:2,description:'在双桅后另设一根斜桁小桅，帆面更大，适合长时间离岸观测。'}),
  ship('bark','三桅巴可船','exploration',{rank:21,visual:'galleon',era:'17—18 世纪',role:'远洋科考 · 均衡续航',maxGunWeight:3,defaultCannon:'long-12',price:14800,hull:258,sailors:60,speed:24,slots:9,batteries:2,description:'三桅巴可帆装兼顾货舱与航程，是许多探索旗舰的前身。'}),
  ship('packet','邮包快船','exploration',{rank:23,visual:'sixth-rate',era:'18 世纪',role:'公文急送 · 快速补给',maxGunWeight:3,defaultCannon:'long-12',price:17000,hull:252,sailors:56,speed:29,slots:9,batteries:2,description:'为邮件和急件设计的快船，航速接近护卫舰，货舱与续航仍然优先。'}),
  ship('survey-brig','测绘双桅船','exploration',{rank:25,visual:'brig',era:'18 世纪',role:'海道测量 · 精密领航',maxGunWeight:3,defaultCannon:'long-18',price:19200,hull:272,sailors:62,speed:27,slots:9,batteries:2,description:'专为绘制海图改装，仪器舱挤占部分货位，火力足够自卫。'}),
  ship('discovery-frigate','探险巡航舰','exploration',{rank:28,visual:'frigate',era:'18 世纪',role:'远洋探索旗舰 · 武装测量',maxGunWeight:3,defaultCannon:'long-18',price:24500,hull:305,sailors:70,speed:28,slots:10,batteries:2,description:'以护卫舰船体承担探索任务，能护住一小队测量船穿越陌生海域。'}),
  ship('ice-bark','远洋科考帆船','exploration',{rank:32,visual:'galleon',era:'18 世纪',role:'高纬航行 · 持久补给',maxGunWeight:3,defaultCannon:'long-18',price:28500,hull:345,sailors:78,speed:22,slots:11,batteries:2,description:'加厚船壳与加大物资舱，为漫长的高纬或无人海岸航行准备。'}),
  ship('discovery-flagship','探险旗舰','exploration',{rank:38,visual:'fourth-rate',era:'18 世纪',role:'探索舰队核心 · 远洋指挥',maxGunWeight:4,defaultCannon:'long-24',price:36500,hull:410,sailors:88,speed:24,slots:12,batteries:3,description:'探索线的顶点：以小型双层舰的体量携带仪器、补给与自卫重炮。'}),

  ship('cog','柯克商船','merchant',{rank:2,visual:'carrack',era:'14—15 世纪',role:'北海短途 · 入门货运',maxGunWeight:1,defaultCannon:'falconet',price:2200,hull:92,sailors:18,speed:14,slots:5,batteries:1,description:'高舷圆船腹的早期北欧商船，航速慢，却是商路经营的第一课。'}),
  ship('hulk','赫尔克货船','merchant',{rank:4,visual:'carrack',era:'15 世纪',role:'河口仓储 · 笨重货运',maxGunWeight:1,defaultCannon:'swivel',price:3600,hull:125,sailors:26,speed:13,slots:6,batteries:1,description:'比柯克更宽的货船，几乎是一座会漂的仓库，转向笨拙。'}),
  ship('roundship','圆船','merchant',{rank:6,visual:'carrack',era:'15 世纪',role:'地中海货运 · 早期商队',maxGunWeight:2,defaultCannon:'minion',price:5200,hull:158,sailors:34,speed:15,slots:6,batteries:1,description:'地中海圆船，卡拉克的前身，货舱开始值得跨海计算利润。'}),
  ship('flyboat','飞艇货船','merchant',{rank:9,visual:'junk',era:'16—17 世纪',role:'浅水货运 · 快速周转',maxGunWeight:2,defaultCannon:'long-6',price:7000,hull:178,sailors:40,speed:22,slots:7,batteries:1,description:'荷兰浅吃水货船，船员少、周转快，是弗鲁特商船的小一号亲戚。'}),
  ship('trade-caravel','商用卡拉维尔','merchant',{rank:10,visual:'caravel',era:'15—16 世纪',role:'沿岸贸易 · 轻货快运',maxGunWeight:2,defaultCannon:'culverin',price:8200,hull:188,sailors:42,speed:23,slots:7,batteries:1,description:'把探索用卡拉维尔的货舱加大，牺牲一点灵活换来更稳的利润。'}),
  ship('dhow','阿拉伯商船','merchant',{rank:11,visual:'caravel',era:'16—18 世纪',role:'季风贸易 · 沿岸集散',maxGunWeight:2,defaultCannon:'saker',price:9000,hull:172,sailors:38,speed:25,slots:7,batteries:1,description:'三角帆季风船，在红海与印度洋沿岸送香料、咖啡和药材。'}),
  ship('pink','平克商船','merchant',{rank:14,visual:'carrack',era:'17—18 世纪',role:'窄尾货运 · 北海商路',maxGunWeight:2,defaultCannon:'long-9',price:10800,hull:205,sailors:46,speed:21,slots:8,batteries:1,description:'窄尾、宽腹的北欧商船，在风浪中比圆船更稳，自卫火力仍轻。'}),
  ship('carrack','卡拉克大型商船','merchant',{rank:16,visual:'carrack',era:'15—16 世纪',role:'远洋贸易 · 长途补给',maxGunWeight:3,defaultCannon:'culverin',price:12500,hull:260,sailors:65,speed:20,slots:8,gunDecks:1,cabins:['cargo','cargo','cargo','supply','supply','cannon','kitchen','infirmary'],description:'高艏艉楼与宽阔船腹是早期远洋商船的特征。货仓充裕，适合携带商品和补给。'}),
  ship('fluyt','弗鲁特商船','merchant',{rank:18,visual:'junk',era:'17 世纪',role:'低成本货运 · 远程周转',maxGunWeight:2,defaultCannon:'long-9',price:14200,hull:255,sailors:52,speed:24,slots:8,batteries:1,description:'荷兰弗鲁特：梨形剖面、船员极少、货舱极大，改变了北欧运费。'}),
  ship('baghlah','巴格拉商船','merchant',{rank:18,visual:'caravel',era:'17—18 世纪',role:'阿拉伯海贸易 · 远程季风',maxGunWeight:2,defaultCannon:'culverin',price:15200,hull:242,sailors:50,speed:24,slots:8,batteries:1,description:'大型阿拉伯商船，比普通单桅船更能扛开印度洋的长浪。'}),
  ship('junk','远洋福船','merchant',{rank:20,visual:'junk',era:'16—17 世纪',role:'东方贸易 · 均衡远航',maxGunWeight:3,defaultCannon:'culverin',price:16000,hull:280,sailors:60,speed:23,slots:9,gunDecks:1,cabins:['cargo','cargo','cargo','supply','supply','cannon','marine','kitchen','infirmary'],description:'东方海船的水密隔舱与带帆骨的帆装，兼顾货运、续航与护卫；不采用英国海军评级。'}),
  ship('polacre','波拉克商船','merchant',{rank:22,visual:'brig',era:'17—18 世纪',role:'地中海混装 · 中程贸易',maxGunWeight:3,defaultCannon:'long-12',price:17600,hull:268,sailors:56,speed:23,slots:9,batteries:1,description:'前桅三角帆、后桅横帆的地中海混装商船，风向多变时很讨巧。'}),
  ship('trade-galleon','商用盖伦','merchant',{rank:24,visual:'galleon',era:'16—17 世纪',role:'武装商队 · 贵重货运',maxGunWeight:4,defaultCannon:'demi-cannon',price:19800,hull:305,sailors:72,speed:18,slots:9,batteries:2,description:'降低战舰盖伦的炮位、加大货舱，是珍宝船队的常见编制。'}),
  ship('trade-snow','武装商用斯诺','merchant',{rank:26,visual:'brig',era:'18 世纪',role:'护货巡航 · 中型商路',maxGunWeight:3,defaultCannon:'long-12',price:21500,hull:292,sailors:64,speed:25,slots:9,batteries:2,description:'给商船加上接近双桅军舰的帆装与两门舷炮，适合海盗出没的航线。'}),
  ship('west-indiaman','西印度商船','merchant',{rank:27,visual:'galleon',era:'18 世纪',role:'大西洋贸易 · 热带货运',maxGunWeight:3,defaultCannon:'long-12',price:22500,hull:325,sailors:74,speed:20,slots:10,batteries:2,description:'为蔗糖、可可和金银设计的大西洋商船，货舱与续航明显加大。'}),
  ship('large-junk','广船','merchant',{rank:29,visual:'junk',era:'16—18 世纪',role:'远东大宗 · 水密货舱',maxGunWeight:3,defaultCannon:'hongyi',price:24500,hull:345,sailors:72,speed:22,slots:10,batteries:2,description:'更大的东方海船，水密隔舱可装瓷器与丝绸，并以红夷炮自卫。'}),
  ship('packet-ship','快速邮包商船','merchant',{rank:31,visual:'sixth-rate',era:'18 世纪',role:'急件货运 · 高价值快运',maxGunWeight:3,defaultCannon:'long-18',price:26500,hull:315,sailors:68,speed:27,slots:10,batteries:2,description:'邮件、汇票与高价值小宗货物的快船，航速接近轻型护卫舰。'}),
  ship('east-indiaman','东印度商船','merchant',{rank:34,visual:'galleon',era:'18 世纪',role:'欧亚长途 · 公司商船',maxGunWeight:3,defaultCannon:'long-18',price:28500,hull:385,sailors:92,speed:19,slots:11,batteries:2,description:'公司定期船：货舱巨大，武装接近六级舰，是商船线的中坚。'}),
  ship('tea-ship','茶叶快船','merchant',{rank:40,visual:'frigate',era:'18 世纪',role:'时鲜贸易 · 抢先入港',maxGunWeight:3,defaultCannon:'long-18',price:36000,hull:355,sailors:80,speed:28,slots:11,batteries:2,description:'为抢鲜茶叶市价而收细船体、加大帆面，是商船里少见的快船。'}),
  ship('armed-indiaman','武装印度商船','merchant',{rank:39,visual:'fourth-rate',era:'18 世纪',role:'自行护航 · 重武装贸易',maxGunWeight:4,defaultCannon:'long-24',price:34500,hull:430,sailors:105,speed:18,slots:12,batteries:3,description:'按小型战舰标准武装的公司船，可在没有护航时独自穿越危险海域。'}),
  ship('grand-indiaman','大型印度商船','merchant',{rank:44,visual:'third-rate',era:'18 世纪',role:'公司旗舰 · 大宗远洋',maxGunWeight:4,defaultCannon:'long-24',price:42500,hull:510,sailors:122,speed:17,slots:13,batteries:3,description:'商船线接近顶点：体量接近三级舰，货舱与水手都按长途公司船编制。'}),
  ship('treasure-galleon','珍宝船队盖伦','merchant',{rank:46,visual:'galleon',era:'16—17 世纪',role:'贵金属运输 · 重护航货舰',maxGunWeight:4,defaultCannon:'demi-cannon',price:48500,hull:565,sailors:132,speed:16,slots:14,batteries:3,description:'为金银与热带物产加厚的盖伦，航速慢，但货舱和船体都按旗舰标准打造。'}),

  ship('gunboat','港湾炮艇','war',{rank:3,visual:'sloop',era:'18 世纪',role:'港湾火力 · 浅水拦截',maxGunWeight:1,defaultCannon:'swivel',price:2000,hull:72,sailors:16,speed:18,slots:4,batteries:1,description:'几乎没有远航能力的浅水炮艇，却是战舰线的第一级台阶。'}),
  ship('armed-cutter','武装快艇','war',{rank:6,visual:'sloop',era:'18 世纪',role:'通信拦截 · 近岸追逐',maxGunWeight:1,defaultCannon:'falcon',price:3100,hull:92,sailors:22,speed:33,slots:5,batteries:1,description:'海军通信与缉私用的单桅快艇，航速极高，火力仅够警告。'}),
  ship('sloop','单桅巡逻帆船','war',{rank:8,visual:'sloop',era:'18 世纪',role:'快速侦察 · 近岸巡逻',maxGunWeight:2,defaultCannon:'swivel',price:4200,hull:115,sailors:28,speed:31,slots:5,gunDecks:1,cabins:['cargo','supply','supply','cannon','kitchen'],description:'本作取单桅小型巡逻帆船样式，造价与船员消耗低，航速较高。历史上的 sloop-of-war 是职务类别，帆装并不限于单桅。'}),
  ship('brigantine','双桅纵帆军舰','war',{rank:10,visual:'brig',era:'17—18 世纪',role:'私掠猎杀 · 轻装追击',maxGunWeight:2,defaultCannon:'long-6',price:7400,hull:162,sailors:38,speed:29,slots:6,batteries:1,description:'前桅横帆、主桅纵帆，比纯横帆双桅更灵活，是海盗与海军都爱用的过渡舰。'}),
  ship('brig','双桅横帆军舰','war',{rank:14,visual:'brig',era:'18 世纪',role:'海岸护航 · 轻装追击',maxGunWeight:3,defaultCannon:'long-9',price:10500,hull:205,sailors:48,speed:28,slots:7,gunDecks:1,cabins:['cargo','supply','supply','cannon','cannon','marine','kitchen'],description:'两根横帆桅杆易于辨认，是轻型护航与巡航的实用船型。可换装轻量卡隆炮强化近战。'}),
  ship('xebec','三桅快战船','war',{rank:15,visual:'caravel',era:'16—18 世纪',role:'地中海猎杀 · 三角帆突击',maxGunWeight:3,defaultCannon:'saker',price:12800,hull:210,sailors:48,speed:30,slots:7,batteries:2,description:'北非与奥斯曼常用的三桅快战船，逆风灵活，近战凶狠，不套用英国舰级。'}),
  ship('war-snow','斯诺军舰','war',{rank:16,visual:'brig',era:'18 世纪',role:'护航加强 · 轻型巡航',maxGunWeight:3,defaultCannon:'long-9',price:13400,hull:228,sailors:52,speed:27,slots:7,batteries:2,description:'在双桅军舰与轻巡航舰之间：多一根斜桁小桅，帆面与火力都更从容。'}),
  ship('corvette','轻型巡航舰','war',{rank:18,visual:'sixth-rate',era:'18 世纪',role:'外海侦察 · 快速护航',maxGunWeight:3,defaultCannon:'long-9',price:16000,hull:242,sailors:56,speed:30,slots:8,gunDecks:1,batteries:2,description:'尚未进入六级编制的轻巡航舰，速度接近单桅快船，火力开始像样。'}),
  ship('post-ship','20 炮邮务舰','war',{rank:19,visual:'sixth-rate',rate:6,ratedGuns:20,gunDecks:1,era:'18 世纪后期',role:'邮务巡航 · 小型护卫',maxGunWeight:3,defaultCannon:'long-9',price:17200,hull:248,sailors:58,speed:29,slots:8,batteries:2,description:'额定约 20 门炮的六级边缘舰，常跑公文与轻护航，是进入评级的第一级。'}),
  ship('sixth-24','六级 24 炮舰','war',{rank:20,visual:'sixth-rate',rate:6,ratedGuns:24,gunDecks:1,era:'18 世纪后期',role:'轻型护卫 · 商路巡逻',maxGunWeight:3,defaultCannon:'long-9',price:17800,hull:252,sailors:58,speed:29,slots:8,batteries:2,description:'24 炮六级舰，比 20 炮邮务舰多一层齐射密度，仍不是战列线成员。'}),
  ship('sixth-rate','六级护卫舰','war',{rank:21,visual:'sixth-rate',rate:6,ratedGuns:28,gunDecks:1,era:'18 世纪后期',role:'轻型巡航 · 商路护卫',maxGunWeight:3,defaultCannon:'long-9',price:18500,hull:255,sailors:60,speed:30,slots:8,cabins:['cargo','supply','supply','cannon','cannon','marine','kitchen','infirmary'],description:'以 28 炮小型护卫舰为代表，主炮布置在单层炮甲板。速度快、服役成本较低，承担巡逻而非战列线作战。'}),
  ship('atakebune','安宅船','war',{rank:22,visual:'junk',era:'16—17 世纪',role:'近海楼船 · 接舷堡垒',maxGunWeight:3,defaultCannon:'hongyi',price:20500,hull:310,sailors:80,speed:16,slots:9,batteries:2,description:'日本近海楼船，上层如堡垒，航速低，接舷与近战是它的语言。'}),
  ship('fifth-32','五级 32 炮护卫舰','war',{rank:23,visual:'frigate',rate:5,ratedGuns:32,gunDecks:1,era:'18 世纪后期',role:'标准巡航 · 商路护卫',maxGunWeight:3,defaultCannon:'long-12',price:22000,hull:272,sailors:64,speed:29,slots:8,batteries:2,description:'32 炮五级舰，开始以 12 磅长炮作为主炮，是护卫舰序列的下台阶。'}),
  ship('galleon','盖伦战舰','war',{rank:24,visual:'galleon',era:'16—17 世纪',role:'武装远航 · 重炮护航',maxGunWeight:4,defaultCannon:'demi-cannon',price:22000,hull:380,sailors:85,speed:18,slots:10,gunDecks:2,cabins:['cargo','cargo','supply','supply','supply','cannon','cannon','cannon','marine','kitchen'],description:'较低艏楼、细长船体和多层侧舷炮构成早期远洋战舰。属于评级体系普及前的船型，不等同后期一级舰。'}),
  ship('fifth-36','五级 36 炮护卫舰','war',{rank:25,visual:'frigate',rate:5,ratedGuns:36,gunDecks:1,era:'18 世纪后期',role:'巡航猎杀 · 快速截击',maxGunWeight:3,defaultCannon:'long-18',price:24800,hull:282,sailors:68,speed:29,slots:8,batteries:2,description:'36 炮五级舰，主炮升至 18 磅长炮，已能独立巡航并猎杀私掠船。'}),
  ship('frigate','五级护卫舰','war',{rank:26,visual:'frigate',rate:5,ratedGuns:38,gunDecks:1,era:'18 世纪后期',role:'远洋巡航 · 快速截击',maxGunWeight:3,defaultCannon:'long-18',price:27000,hull:290,sailors:70,speed:29,slots:8,cabins:['cargo','supply','supply','cannon','cannon','marine','kitchen','infirmary'],description:'以 38 炮护卫舰为代表，单层主炮甲板配备 18 磅长炮。用于舰队侦察、护航与独立巡航，不属于战列舰。'}),
  ship('heavy-frigate','44 炮重型护卫舰','war',{rank:29,visual:'frigate',rate:5,ratedGuns:44,gunDecks:1,era:'18 世纪后期',role:'重巡航 · 单舰猎杀',maxGunWeight:4,defaultCannon:'long-24',price:31500,hull:335,sailors:82,speed:27,slots:9,batteries:3,description:'44 炮重型护卫舰，可装 24 磅长炮，是护卫舰序列的顶点，仍不是战列舰。'}),
  ship('razee','削层巡航舰','war',{rank:31,visual:'fourth-rate',rate:4,ratedGuns:44,gunDecks:1,era:'18 世纪后期',role:'削层快舰 · 重炮巡航',maxGunWeight:4,defaultCannon:'long-24',price:33500,hull:385,sailors:90,speed:25,slots:9,batteries:3,description:'由双层舰削去一层而成，保留重炮、提高航速，用来追击大型护卫舰。'}),
  ship('fourth-rate','四级双层军舰','war',{rank:33,visual:'fourth-rate',rate:4,ratedGuns:50,gunDecks:2,era:'18 世纪后期',role:'远站旗舰 · 重型护航',maxGunWeight:4,defaultCannon:'long-24',price:35000,hull:440,sailors:105,speed:21,slots:10,cabins:['cargo','supply','supply','supply','cannon','cannon','cannon','marine','kitchen','infirmary'],description:'以 50 炮双层舰为代表。18 世纪末已不适合主力战列线，转任海外旗舰与护航；游戏中兼顾耐久、补给和重炮。'}),
  ship('fourth-60','四级 60 炮舰','war',{rank:35,visual:'fourth-rate',rate:4,ratedGuns:60,gunDecks:2,era:'18 世纪',role:'小型战列 · 海外旗舰',maxGunWeight:4,defaultCannon:'long-24',price:41500,hull:505,sailors:118,speed:22,slots:11,batteries:3,description:'60 炮双层舰，是四级到三级之间的台阶，海外舰队常拿它当旗舰。'}),
  ship('third-64','三级 64 炮舰','war',{rank:37,visual:'third-rate',rate:3,ratedGuns:64,gunDecks:2,era:'18 世纪后期',role:'小型战列线 · 远洋主力',maxGunWeight:5,defaultCannon:'long-32',price:45500,hull:545,sailors:128,speed:21,slots:11,batteries:3,description:'64 炮三级舰，开始支持 32 磅长炮，是进入战列线的第一级真正重舰。'}),
  ship('third-70','三级 70 炮舰','war',{rank:38,visual:'third-rate',rate:3,ratedGuns:70,gunDecks:2,era:'18 世纪',role:'战列线 · 过渡主力',maxGunWeight:5,defaultCannon:'long-32',price:49000,hull:575,sailors:138,speed:20,slots:12,batteries:4,description:'70 炮双层舰，火力与水手编制向 74 炮标准靠拢。'}),
  ship('third-rate','三级战列舰','war',{rank:40,visual:'third-rate',rate:3,ratedGuns:74,gunDecks:2,era:'18 世纪后期',role:'战列线主力 · 全能重舰',maxGunWeight:5,defaultCannon:'long-32',price:52000,hull:600,sailors:145,speed:20,slots:12,cabins:['cargo','supply','supply','supply','cannon','cannon','cannon','cannon','marine','marine','kitchen','infirmary'],description:'74 炮双层舰是后期帆船战列线的主力，在火力、造价与航行性能之间取得平衡。支持全部炮型与灵活混装。'}),
  ship('third-80','三级 80 炮舰','war',{rank:43,visual:'third-rate',rate:3,ratedGuns:80,gunDecks:2,era:'18 世纪后期',role:'加强战列 · 分队旗舰',maxGunWeight:5,defaultCannon:'long-32',price:60500,hull:665,sailors:155,speed:19,slots:13,batteries:4,description:'80 炮三级舰，比 74 炮更厚重，常作分舰队旗舰，仍未到三层甲板。'}),
  ship('second-90','二级 90 炮舰','war',{rank:45,visual:'second-rate',rate:2,ratedGuns:90,gunDecks:3,era:'18 世纪后期',role:'三层战列 · 海外旗舰',maxGunWeight:5,defaultCannon:'long-32',price:66500,hull:715,sailors:162,speed:17,slots:13,batteries:5,description:'90 炮三层舰，二级序列的下台阶，已经是一座缓慢的海上堡垒。'}),
  ship('second-rate','二级战列舰','war',{rank:47,visual:'second-rate',rate:2,ratedGuns:98,gunDecks:3,era:'18 世纪后期',role:'海外旗舰 · 持久炮战',maxGunWeight:5,defaultCannon:'long-32',price:72000,hull:760,sailors:170,speed:16,slots:14,cabins:['cargo','supply','supply','supply','supply','cannon','cannon','cannon','cannon','cannon','marine','marine','kitchen','infirmary'],description:'以 98 炮三层舰为代表，比一级舰便宜，适合作海外旗舰。厚重船体与大补给舱换来较低的航速。'}),
  ship('first-rate','一级战列舰','war',{rank:50,visual:'first-rate',rate:1,ratedGuns:100,gunDecks:3,era:'18 世纪后期',role:'舰队旗舰 · 火力核心',maxGunWeight:5,defaultCannon:'long-32',price:98000,hull:920,sailors:195,speed:17,slots:16,cabins:['cargo','supply','supply','supply','supply','cannon','cannon','cannon','cannon','cannon','cannon','marine','marine','marine','kitchen','infirmary'],description:'以胜利号式 100 炮三层旗舰为代表，拥有高耐久和充足的改装空间。一级也包括更多炮数的舰型；本作水手人数经过缩编。'}),
  ship('first-110','一级 110 炮舰','war',{rank:54,visual:'first-rate',rate:1,ratedGuns:110,gunDecks:3,era:'18 世纪后期',role:'超重旗舰 · 舰队核心',maxGunWeight:5,defaultCannon:'long-36',price:108000,hull:980,sailors:205,speed:16,slots:16,batteries:6,description:'110 炮一级舰，下层可换 36 磅长炮，是 100 炮旗舰向上的平滑台阶。'}),
  ship('first-120','一级 120 炮舰','war',{rank:58,visual:'first-rate',rate:1,ratedGuns:120,gunDecks:3,era:'18—19 世纪',role:'海上堡垒 · 终极旗舰',maxGunWeight:5,defaultCannon:'long-42',price:120000,hull:1060,sailors:220,speed:15,slots:16,batteries:7,description:'120 炮三层旗舰，本作战舰线的顶点。航速最低，齐射最重，只有最厚的炮架才装得下 42 磅长炮。'})
],'ships');

for (const type of Object.values(SHIP_TYPES)) {
  if (type.cabins.length!==type.slots) throw new Error(`slots ${type.id}`);
  if (type.sailors<8) throw new Error(`sailors ${type.id}`);
  if (!PROFILE[type.id]||!type.masts||!type.rig) throw new Error(`profile ${type.id}`);
  if (type.asset!==`assets/ships/${type.id}.svg`) throw new Error(`asset ${type.id}`);
  if (type.batterySlots!==type.cabins.filter(cabin=>cabin==='cannon').length) throw new Error(`batteries ${type.id}`);
  const cannon=CANNONS[type.defaultCannon];
  if (!cannon) throw new Error(`default ${type.id}`);
  if (cannon.weight>type.maxGunWeight) throw new Error(`weight ${type.id}`);
}
for (const cannon of Object.values(CANNONS)) {
  if (cannon.asset!==`assets/cannons/${cannon.id}.svg`) throw new Error(`cannon asset ${cannon.id}`);
}

export const NAVAL_NOTES='本作跨 14—19 世纪收录船炮，并允许跨时代混装。舰船分为探险、商船、战舰三条线，从港湾舢板平滑过渡到一级战列舰；同阶段舰型会在货运、航速、耐久和火力之间取舍。舰级采用英国海军晚 18 世纪代表制式。额定炮数是史实名义数量，每个炮台槽代表抽象炮组，不与实炮一一对应。独立舰型插画按照桅数、帆装和主炮甲板绘制，炮门与船体尺度均为示意。磅数表示炮弹重量，并非炮口直径。承重、火力、价格与缩编船员均为游戏数值。港口驻军、巡航分队与海盗船队使用同一套舰型目录。';
