const point = (lon, lat) => [(lon + 180) / 360 * 1200, (85 - lat) / 170 * 660];
const regions = [
  ['north','北海','北辰罗盘','europe',1],['mediterranean','地中海','蔚蓝星盘','europe',1],
  ['africa','非洲','黄金太阳轮','africa',2],['arabia','阿拉伯海','月牙航海石','arabia',2],
  ['india','印度洋','珊瑚宝冠','india',2],['asia','东亚','苍龙玉印','asia',3],
  ['caribbean','加勒比海','翡翠羽蛇','caribbean',2]
];
export const REGIONS = Object.fromEntries(regions.map(([id,name,relic,scenario,danger]) => [id,{id,name,relic,scenario,danger,requiredVisits:2,requiredInfluence:30,asset:`assets/ports/${scenario}.svg`}]));
const ports = [
  ['lisbon','里斯本','mediterranean',-9.2,38.7,['wine','olive'],'远征的起点。白石码头连起旧大陆与未知海洋。'],
  ['seville','塞维利亚','mediterranean',-6.3,36.6,['wine','grain'],'瓜达尔基维尔河口的商船在此交换消息与橄榄油。'],
  ['genoa','热那亚','mediterranean',8.9,44.4,['cloth','olive'],'银行家与船匠的港湾，精纺织物销往四海。'],
  ['venice','威尼斯','mediterranean',12.3,45.4,['cloth','medicine'],'潟湖上的钟楼俯瞰着满载丝绸的船队。'],
  ['istanbul','伊斯坦布尔','mediterranean',28.9,41,['cloth','iron'],'海峡两岸交汇着商队、香料与古老的星图。'],
  ['alexandria','亚历山大','mediterranean',29.9,31.2,['grain','medicine'],'灯塔的故事仍在流传，沙漠遗迹等待新的探访者。'],
  ['london','伦敦','north',0.2,51.5,['cloth','iron'],'潮汐把北海的船只带入繁忙河港。'],
  ['amsterdam','阿姆斯特丹','north',4.5,52.4,['cloth','wood'],'运河、仓库与公开报价成就了这座商都。'],
  ['stockholm','斯德哥尔摩','north',18.2,59.3,['wood','iron'],'北方群岛间的深水港，优质木材是造船的根基。'],
  ['capetown','开普敦','africa',18.3,-34.1,['wine','wood'],'越过风暴海角后，印度洋将在船首展开。'],
  ['elmina','埃尔米纳','africa',-1.4,5,['gold','ivory'],'海风吹过黄金海岸，内陆商队带来稀有货物。'],
  ['capeverde','佛得角','africa',-23.5,14.9,['sugar','grain'],'横渡大西洋前的最后一处淡水与风帆。'],
  ['aden','亚丁','arabia',45,12.7,['coffee','spice'],'红海入口的火山港湾，咖啡香气随风而来。'],
  ['muscat','马斯喀特','arabia',58.6,23.6,['coffee','medicine'],'沙色山岭保护着海湾，领航员熟识季风的节律。'],
  ['basra','巴士拉','arabia',48.7,29.4,['cloth','spice'],'沿着河口水道，东西方货品汇入广阔市场。'],
  ['goa','果阿','india',73.8,15.4,['spice','cloth'],'季风贸易的十字路口，船厂日夜回响着木槌声。'],
  ['calicut','卡利卡特','india',75.7,11.2,['spice','ivory'],'胡椒堆成小山，远洋商人竞相签订合约。'],
  ['ceylon','锡兰','india',79.8,6.9,['tea','spice'],'棕榈环抱的宝石岛，内陆古寺记载着远古航线。'],
  ['malacca','马六甲','asia',102.2,2.2,['spice','wood'],'狭长海峡连接两片海洋，每面风帆都带着不同的故事。'],
  ['jakarta','雅加达','asia',106.8,-6.1,['spice','sugar'],'群岛间的香料集散地，雨林遗迹藏在河口深处。'],
  ['macau','澳门','asia',113.5,22.2,['silk','porcelain'],'渔舟与远洋船相遇的港湾，瓷器与丝绸声名远播。'],
  ['nagasaki','长崎','asia',129.8,32.7,['silk','tea'],'群山守护的天然港湾，铸剑师与茶商迎接远客。'],
  ['havana','哈瓦那','caribbean',-82.4,23.2,['sugar','cocoa'],'明亮海湾和丰厚的热带物产吸引着商人与海盗。'],
  ['veracruz','韦拉克鲁斯','caribbean',-96.1,19.2,['gold','cocoa'],'高原古城的货物从此出海，羽蛇传说仍鲜活如初。']
];
export const PORTS = Object.fromEntries(ports.map(([id,name,region,lon,lat,goods,description]) => {
  const [x,y] = point(lon,lat);
  return [id,{id,name,region,lon,lat,x,y,goods,description,scenario:REGIONS[region].scenario,asset:REGIONS[region].asset}];
}));
const routes = [
  ['lisbon','seville',[[-10,37],[-9,36],[-7,36]]],
  ['lisbon','london',[[-12,42],[-10,47],[-6,49],[-2,50],[1,51]]],
  ['london','amsterdam',[[1.5,52],[3,53]]],
  ['amsterdam','stockholm',[[3,55],[7,58],[10,58],[12,56],[13,54.5],[16,55],[20,57],[20,59]]],
  ['seville','genoa',[[-6,35.8],[-4,36],[0,37],[4,39],[8,41],[9,43]]],
  ['genoa','venice',[[9,43],[10.3,42],[11,40],[13.5,38],[16,36.5],[18,38],[19,40],[16,43],[13.5,45]]],
  ['venice','istanbul',[[14,44],[17,41.5],[19,40],[20,37],[23,35],[26,36],[26,39],[27,40],[29,40.7]]],
  ['istanbul','alexandria',[[29,40.5],[27,40],[26,39],[26,36],[28,34]]],
  ['genoa','alexandria',[[9,43],[10,41],[11,38],[13,35],[19,34],[25,33]]],
  ['lisbon','capeverde',[[-13,32],[-20,25],[-25,18]]],
  ['capeverde','elmina',[[-22,10],[-14,3],[-5,2]]],
  ['elmina','capetown',[[3,0],[7,-6],[10,-15],[12,-25],[15,-32],[17,-35]]],
  ['capetown','aden',[[19,-36],[28,-36],[38,-30],[43,-20],[48,-10],[52,2],[51,11],[47,12]]],
  ['aden','muscat',[[50,12],[56,15],[60,20],[60,23]]],
  ['muscat','basra',[[59,25],[57,26.5],[56,26.5],[54,26.5],[51,28],[49,29]]],
  ['muscat','goa',[[62,22],[68,19],[72,16]]],
  ['goa','calicut',[[73,14],[74.5,12]]],
  ['calicut','ceylon',[[76,8],[77.5,6],[79,6]]],
  ['ceylon','malacca',[[83,5],[89,6],[94,6.5],[97,6],[99,4],[101,2.5]]],
  ['malacca','jakarta',[[103,1],[104.5,-1],[106,-4],[106.5,-5.5]]],
  ['malacca','macau',[[103,1],[105,2],[108,7],[110,13],[112,18]]],
  ['macau','nagasaki',[[115,21],[119,23],[123,26],[126,29],[129,31]]],
  ['capeverde','havana',[[-35,17],[-48,20],[-60,23],[-70,25],[-79,25],[-82,24]]],
  ['havana','veracruz',[[-86,24],[-90,23],[-94,21]]]
];
export const SEA_ROUTES = routes.map(([from,to,via]) => ({from,to,points:[[PORTS[from].x,PORTS[from].y],...via.map(([lon,lat]) => point(lon,lat)),[PORTS[to].x,PORTS[to].y]]}));
