import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SHIP_TYPES, CANNONS, RIG_LABELS } from '../src/data/naval.js';

// The original detailed artwork remains the master for these entries. New
// variants are drawn from their own catalog parameters, never by relabeling it.
const DRAWN_SHIPS = new Set(['sloop','brig','carrack','junk','galleon','sixth-rate','frigate','fourth-rate','third-rate','second-rate','first-rate']);
const DRAWN_CANNONS = new Set(['swivel','culverin','demi-cannon','long-9','long-18','long-24','long-32','carronade-32']);
const root = new URL('../', import.meta.url);
const xml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const n = value => Number(value.toFixed(2));
const path = (d, fill='none', stroke='#33413c', width=1, extra='') => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
const rect = (x,y,w,h,fill,extra='') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}" ${extra}/>`;
const ellipse = (x,y,rx,ry,fill,extra='') => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" ${extra}/>`;
const FAMILIES = {exploration:'探险船',merchant:'商船',war:'战舰'};
const RANGES = {close:'近距',medium:'中距',long:'远距'};
const KINDS = {light:'轻型炮',long:'舰用长短炮',early:'早期火炮',carronade:'卡隆炮',mortar:'臼炮与榴弹炮'};

function metadata(row, ship) {
  return ship
    ? {id:row.id,name:row.name,family:row.family,rank:row.rank,masts:row.masts,rig:row.rig,gunDecks:row.gunDecks,ratedGuns:row.ratedGuns,batterySlots:row.batterySlots,defaultCannon:row.defaultCannon,maxGunWeight:row.maxGunWeight}
    : {id:row.id,name:row.name,kind:row.kind,range:row.range,weight:row.weight,shot:row.shot,firepower:row.firepower,ammoCost:row.ammoCost,boarding:row.boarding};
}

function annotate(svg, row, ship) {
  const data = metadata(row,ship);
  const description = ship
    ? `${FAMILIES[row.family]}；${row.masts} 桅${RIG_LABELS[row.rig]}；${row.gunDecks} 层主炮甲板；${row.batterySlots} 个游戏炮组${row.ratedGuns?`；名义 ${row.ratedGuns} 炮`:''}。${row.role}。原创矢量侧面示意，炮门数量与尺度不代表逐炮复原。`
    : `${KINDS[row.kind]}；${row.shot}；${RANGES[row.range]}；炮架承重等级 ${row.weight}；火力 ${row.firepower}；每炮组弹耗系数 ${row.ammoCost}。${row.description} 原创结构示意，不是比例工程图。`;
  const tags = `<title id="title">${xml(row.name)}</title>\n<desc id="desc">${xml(description)}</desc>\n<metadata id="naval-spec">${xml(JSON.stringify(data))}</metadata>`;
  return svg.replace(/<title\b[^>]*>[\s\S]*?<\/title>/g,'')
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>/g,'')
    .replace(/<metadata id="naval-spec">[\s\S]*?<\/metadata>/g,'')
    .replace(/<svg\b[^>]*>\s*/, tag => tag.trimEnd().replace(/\s(?:role|aria-labelledby|data-catalog-id|data-family|data-kind|data-rig|data-masts|data-gun-decks)="[^"]*"/g,'').replace(/>$/,` role="img" aria-labelledby="title desc" data-catalog-id="${row.id}" ${ship?`data-family="${row.family}" data-rig="${row.rig}" data-masts="${row.masts}" data-gun-decks="${row.gunDecks}"`:`data-kind="${row.kind}"`}>\n${tags}\n`))
    .replace(/\n{3,}/g,'\n\n');
}

const shipDefs = `<defs>
  <linearGradient id="canvas" x2=".7" y2="1"><stop stop-color="#fff6d8"/><stop offset=".45" stop-color="#e4d1a4"/><stop offset="1" stop-color="#b2976d"/></linearGradient>
  <linearGradient id="hull" x2=".15" y2="1"><stop stop-color="#a7774c"/><stop offset=".6" stop-color="#654732"/><stop offset="1" stop-color="#283c3d"/></linearGradient>
  <linearGradient id="copper" x2="0" y2="1"><stop stop-color="#b98555"/><stop offset="1" stop-color="#48625b"/></linearGradient>
  <linearGradient id="glass" x2="1" y2="1"><stop stop-color="#adccbf"/><stop offset="1" stop-color="#28474c"/></linearGradient>
  <linearGradient id="spar"><stop stop-color="#d4b17a"/><stop offset=".45" stop-color="#977046"/><stop offset="1" stop-color="#493b2a"/></linearGradient>
</defs>`;

function squareSail(x,y,w,h) {
  const left=n(x-w/2),right=n(x+w/2),bottom=n(y+h);
  let art=path(`M${left} ${y}Q${x} ${y+6} ${right} ${y}Q${right-9} ${y+h/2} ${right+5} ${bottom}Q${x} ${bottom-12} ${left-5} ${bottom}Q${left+10} ${y+h/2} ${left} ${y}Z`,'url(#canvas)','#88734f',1.2);
  art+=path(`M${left-6} ${y-1}H${right+7}`,'none','#5f4a31',4);
  art+=path(`M${left-5} ${y-2}H${right+6}`,'none','#d7b87e',1);
  for(let seam=1;seam<5;seam++){
    const sx=n(left+w*seam/5);
    art+=path(`M${sx} ${y+4}Q${sx+7} ${y+h/2} ${sx-2} ${bottom-8}`,'none','#a49068',.8);
  }
  return art;
}

function foreAftSail(rig,x,top,deck,width) {
  let art='';
  if(rig==='lateen'||rig==='xebec'){
    const tip=n(x+width*.6),back=n(x-width*.6),foot=n(x-width*.4);
    art+=path(`M${back} ${top+25}L${tip} ${top+65}L${foot} ${deck-17}Q${x-width*.12} ${top+107} ${back} ${top+25}Z`,'url(#canvas)','#8c7653',1.2);
    art+=path(`M${back-5} ${top+23}L${tip+5} ${top+67}`,'none','#6e5236',4);
    for(let i=1;i<5;i++)art+=path(`M${n(back+width*1.2*i/5)} ${n(top+25+40*i/5)}L${n(foot+5*i)} ${deck-24}`,'none','#a28d62',.7);
  }else if(rig==='junk'){
    const left=n(x-width*.52),right=n(x+width*.48),bottom=deck-18;
    art+=path(`M${x-12} ${top+8}L${right-16} ${top+22}Q${right+12} ${top+74} ${right} ${bottom}L${left} ${bottom-6}L${left+7} ${top+32}Z`,'url(#canvas)','#89714e',1.4);
    for(let i=0;i<7;i++){
      const y=n(top+35+(bottom-top-40)*i/6);
      art+=path(`M${left+5} ${y}Q${x} ${y-5} ${right+1} ${y+4}`,'none','#6b573e',2.3);
      art+=path(`M${right} ${y+4}L${x-8} ${bottom+5}`,'none','#a18e69',.7);
    }
  }else if(rig==='lug'){
    art+=path(`M${x-width*.65} ${top+39}L${x+width*.4} ${top+12}L${x+width*.5} ${deck-30}Q${x} ${deck-18} ${x-width*.62} ${deck-25}Z`,'url(#canvas)','#89744f',1.2);
    art+=path(`M${x-width*.69} ${top+40}L${x+width*.45} ${top+10}`,'none','#755535',4);
    for(let i=1;i<5;i++)art+=path(`M${n(x-width*.58+width*i/5)} ${n(top+38-i*5)}L${n(x-width*.58+width*i/5)} ${deck-30}`,'none','#a18c64',.8);
  }else{
    art+=path(`M${x-4} ${top+41}L${x-width} ${top+70}Q${x-width+14} ${deck-72} ${x-width-5} ${deck-20}L${x-4} ${deck-22}Z`,'url(#canvas)','#89744f',1.2);
    art+=path(`M${x-3} ${top+39}L${x-width-6} ${top+71}M${x-3} ${deck-20}L${x-width-10} ${deck-19}`,'none','#735434',3.5);
    for(let i=1;i<5;i++)art+=path(`M${n(x-width*i/5)} ${n(top+42+29*i/5)}L${n(x-width*i/5-2)} ${deck-26}`,'none','#a18c64',.8);
  }
  return art;
}

export function renderShip(row) {
  const scale=Math.min(1,Math.sqrt(row.hull/1060));
  const length=n(300+210*scale),left=n(320-length/2),right=n(320+length/2);
  const depth=n(27+44*scale+(row.family==='merchant'?10:0)),deck=n(365-depth);
  const trim={exploration:'#467b75',merchant:'#8f6542',war:'#243f4b'}[row.family];
  const mastXs=row.masts===1?[n(left+length*.52)]:row.masts===2?[n(left+length*.32),n(left+length*.67)]:[n(left+length*.23),n(left+length*.49),n(left+length*.75)];
  const bowspritX=Math.min(619,right+37),bowspritY=n(deck-57);
  let art=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 440">\n${shipDefs}\n<g stroke-linecap="round" stroke-linejoin="round">\n`;
  art+=ellipse(320,377,length*.53,8,'#568783','opacity=".12"');
  art+=path(`M${left-10} 377Q220 368 331 377T${right+20} 374M${left+20} 391Q270 384 ${right-18} 389`,'none','#9db8a5',1.3);
  art+=path(`M${right-23} ${deck+8}L${bowspritX} ${bowspritY}`,'none','#674b33',4);
  const mastTops=mastXs.map((x,i)=>{
    let height=180+80*scale;
    if(row.masts===3&&i!==1)height*=i===0?.77:.91;
    if(row.masts===2&&i===0)height*=row.id==='yawl'?.48:row.id==='ketch'?.72:row.id==='schooner'?1:.9;
    if(row.id==='schooner'&&i===1)height*=.88;
    if(row.id==='atakebune')height*=.72;
    return n(deck-height);
  });
  mastXs.forEach((x,i)=>{
    const top=mastTops[i];
    art+=path(`M${x} ${top+6}L${left+26} ${deck}M${x} ${top+6}L${right-28} ${deck}`,'none','#9b9878',.9);
    for(let k=0;k<5;k++)art+=path(`M${x} ${top+40}L${n(x-30+k*15)} ${deck}`,'none','#9f9270',.7);
    for(let y=top+70;y<deck-8;y+=13){const half=n((y-top-40)/(deck-top-40)*30);art+=path(`M${x-half} ${n(y)}H${x+half}`,'none','#9f9270',.65);}
  });
  mastXs.forEach((x,i)=>{
    const top=mastTops[i];
    const gap=length/(row.masts+1),width=n(Math.min(row.masts===1?204:171,gap*1.32));
    let rig=row.rig;
    if(rig==='mixed')rig=row.id==='polacre'?(i===row.masts-1?'lateen':'square'):(i===row.masts-1?'square':row.id==='caravel-redonda'?'lateen':'gaff');
    if(rig==='barque')rig=i===0?'gaff':'square';
    art+=`<g data-mast="${i+1}" data-sail-rig="${rig}">`;
    art+=path(`M${x-3} ${deck+8}L${x-1} ${top}H${x+1}L${x+4} ${deck+8}Z`,'url(#spar)','#514332',1);
    if(rig==='square'){
      const levels=row.rank>=35?4:row.rank>=12?3:2;
      const available=deck-top-28;
      for(let level=0;level<levels;level++){
        const h=n(available/levels-8),y=n(top+16+(available/levels)*level),w=n(width*(.57+.43*(level+1)/levels));
        art+=squareSail(x,y,w,h);
      }
    }else art+=foreAftSail(rig,x,top,deck,width);
    art+=path(`M${x+1} ${top+3}Q${x+20} ${top-5} ${x+36} ${top+3}L${x+28} ${top+11}L${x+37} ${top+17}Q${x+20} ${top+10} ${x+1} ${top+18}Z`,trim,'#74634b',.7);
    if(row.family==='exploration'&&i===row.masts-1)art+=path(`M${x+15} ${top+5}V${top+13}M${x+11} ${top+9}H${x+19}`,'none','#f4d691',1.4);
    art+='</g>\n';
  });
  if(!['lug','junk','xebec','lateen'].includes(row.rig)){
    const fx=mastXs.at(-1),fy=mastTops.at(-1)+68;
    art+=path(`M${fx+10} ${fy}L${bowspritX-4} ${bowspritY}L${fx+38} ${deck-14}Q${fx+23} ${deck-59} ${fx+10} ${fy}Z`,'url(#canvas)','#8d7854',1);
    art+=path(`M${fx} ${mastTops.at(-1)+23}L${bowspritX} ${bowspritY}`,'none','#aaa080',.8);
  }
  const sternRise=n(row.castle*9+(row.id==='atakebune'?20:0)),bowRise=n(row.castle>1?11:0);
  const hull=`M${left} ${deck-sternRise}L${left+42} ${deck-sternRise}L${left+58} ${deck}L${right-48} ${deck}L${right-25} ${deck-bowRise}L${right} ${deck-bowRise-5}Q${right-8} 348 ${right-50} 363Q320 376 ${left+41} 364Q${left+9} 346 ${left} ${deck-sternRise}Z`;
  art+=`<g data-hull="${row.id}">`+path(hull,'url(#hull)','#263d3d',2);
  art+=path(`M${left+28} 349Q320 370 ${right-25} 343L${right-50} 363Q320 376 ${left+41} 364Z`,'url(#copper)','#7d6548',.7);
  art+=path(`M${left+6} ${deck-sternRise+7}H${left+42}L${left+58} ${deck+7}H${right-46}L${right-19} ${deck-bowRise+1}`,'none',trim,9);
  for(let plank=0;plank<4;plank++){
    const y=n(deck+13+(depth-22)*plank/4);
    art+=path(`M${left+16+plank*5} ${y}Q320 ${y+11} ${right-16-plank*5} ${y-1}`,'none','#c39b67',.65);
  }
  for(let d=0;d<row.gunDecks;d++){
    const y=n(deck+14+d*Math.min(15,(depth-24)/Math.max(1,row.gunDecks))),ports=row.ratedGuns?Math.max(5,Math.round(row.ratedGuns/(row.gunDecks*3))):Math.max(3,row.batterySlots*2);
    const pw=Math.min(12,(length-125)/(ports*1.65)),step=(length-115)/ports;
    art+=`<g data-gun-deck="${d+1}">`;
    art+=path(`M${left+35} ${y+3}Q320 ${y+9} ${right-40} ${y+2}`,'none','#d7b475',11);
    for(let port=0;port<ports;port++){
      const x=n(left+49+step*port),sag=n(Math.sin(Math.PI*port/ports)*3);
      art+=rect(x,y+sag-2,pw,8,'#172c33','rx="1" stroke="#745137" stroke-width=".8"');
      art+=path(`M${x+2} ${y+sag+1}H${x+pw+3}`,'none','#1b3236',2.2);
    }
    art+='</g>';
  }
  if(row.castle){
    art+=path(`M${left+3} ${deck-sternRise}H${left+44}L${left+55} ${deck-1}H${left+8}Z`,trim,'#675439',1.2);
    const windows=row.castle+2;
    for(let w=0;w<windows;w++)art+=rect(left+10+w*8,deck-sternRise+3,5,Math.max(5,sternRise-9),'url(#glass)','stroke="#caa465" stroke-width="1"');
    art+=path(`M${left} ${deck-sternRise-2}H${left+45}`,'none','#deb979',2.3);
  }
  if(row.id==='atakebune'){
    art+=rect(left+81,deck-32,length-163,30,'#7d6548','stroke="#2c3a35" stroke-width="2"');
    art+=path(`M${left+71} ${deck-31}L${left+96} ${deck-50}H${right-96}L${right-70} ${deck-31}Z`,'#334e4a','#c4a778',1.4);
    for(let x=left+93;x<right-90;x+=23)art+=rect(x,deck-23,9,12,'#223c3e','stroke="#c3a579" stroke-width="1"');
  }else if(row.family==='merchant'){
    for(let c=0;c<Math.min(3,row.cabins.filter(id=>id==='cargo').length);c++){
      const x=n(left+66+c*30);
      art+=rect(x,deck-11,23,10,'#83613f','stroke="#d5b482" stroke-width="1"');
      art+=path(`M${x+4} ${deck-10}L${x+19} ${deck-2}M${x+19} ${deck-10}L${x+4} ${deck-2}`,'none','#b99968',.8);
    }
  }else if(row.family==='exploration'&&row.rank>=17){
    art+=path(`M${left+70} ${deck-16}L${left+119} ${deck-16}L${left+109} ${deck-7}H${left+78}Z`,'#ae8757','#483f30',1);
    art+=path(`M${left+75} ${deck-18}H${left+114}`,'none','#d9bb83',1.5);
  }
  // The lightest craft use exposed swivel mounts, not a fictitious gun deck.
  if(!row.gunDecks)for(let b=0;b<row.batterySlots;b++)art+=path(`M${n(left+length*.55+b*16)} ${deck-2}v-10l12 -3`,'none','#334b4a',3);
  art+=path(`M${left+56} ${deck-5}H${right-47}`,'none','#d1b482',1.4);
  for(let x=left+59;x<right-44;x+=14)art+=path(`M${n(x)} ${deck-5}v-6`,'none','#b99b6c',.8);
  art+=path(`M${right-36} ${deck+8}v14m-7-5q7 14 14 0m-10-14h6`,'none','#293f40',2);
  art+='</g></g>\n</svg>\n';
  return annotate(art,row,true);
}

const cannonDefs = `<defs>
  <linearGradient id="iron" x2="0" y2="1"><stop stop-color="#233943"/><stop offset=".23" stop-color="#afb8ad"/><stop offset=".5" stop-color="#5a7071"/><stop offset="1" stop-color="#1c333e"/></linearGradient>
  <linearGradient id="bronze" x2="0" y2="1"><stop stop-color="#78633e"/><stop offset=".23" stop-color="#e9cb84"/><stop offset=".57" stop-color="#a18445"/><stop offset="1" stop-color="#4d5a49"/></linearGradient>
  <linearGradient id="wood" x2=".15" y2="1"><stop stop-color="#d9b074"/><stop offset=".5" stop-color="#a97a45"/><stop offset="1" stop-color="#634c35"/></linearGradient>
  <radialGradient id="shot" cx=".3" cy=".2"><stop stop-color="#9ba89e"/><stop offset="1" stop-color="#213e45"/></radialGradient>
</defs>`;

function wheel(x,y,r) {
  return ellipse(x,y,r,r,'url(#wood)','stroke="#33433c" stroke-width="2"')+ellipse(x,y,r*.64,r*.64,'none','stroke="#765b39" stroke-width="1.5"')+ellipse(x,y,3,3,'#45605d');
}

function barrel(row,x,y,length,radius) {
  const rear=x+length,metal=row.kind==='early'||['robinet','falconet','falcon'].includes(row.id)?'url(#bronze)':'url(#iron)';
  let art=path(`M${x} ${y-radius*.82}L${x+16} ${y-radius*.8}Q${x+length*.57} ${y-radius*.64} ${rear-16} ${y-radius}Q${rear+15} ${y-radius} ${rear+17} ${y}Q${rear+15} ${y+radius} ${rear-16} ${y+radius}Q${x+length*.57} ${y+radius*.64} ${x+16} ${y+radius*.8}H${x}Z`,metal,'#253c40',2);
  art+=ellipse(rear+22,y,9,7,metal,'stroke="#33413b" stroke-width="1.5"');
  for(const t of [0,.1,.55,.89]){
    const bx=n(x+length*t),br=n(radius*(.8+.2*t));
    art+=rect(bx,y-br-2,5,br*2+4,metal,'rx="2" stroke="#4a584b" stroke-width="1"');
  }
  art+=path(`M${x+13} ${y-radius*.52}Q${x+length*.6} ${y-radius*.52} ${rear-3} ${y-radius*.7}`,'none','#d3d4bd',1.8);
  art+=ellipse(x,y,Math.max(5,radius*.26),radius*.9,metal,'stroke="#233a3e" stroke-width="1.8"');
  art+=ellipse(x-1,y,Math.max(2,radius*.14),radius*.55,'#102831','stroke="#839385" stroke-width="1"');
  if(row.kind==='early'){
    art+=path(`M${n(x+length*.7)} ${y-radius*.72}q12 -18 23 0M${n(x+length*.68)} ${y-radius*.71}q14 -25 27 0`,'none','#bca068',2.3);
    art+=path(`M${n(x+length*.8)} ${y-5}l5 -5l5 5l-5 5Z`,'#d6bb7d','#7b673e',.8);
  }
  return art;
}

export function renderCannon(row) {
  let art=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280">\n${cannonDefs}\n<g stroke-linecap="round" stroke-linejoin="round">`;
  art+=ellipse(249,245,177,8,'#274d51','opacity=".14"');
  const swivel=row.id.startsWith('swivel')||row.id==='robinet';
  const mortar=row.kind==='mortar'&&!row.id.startsWith('shell')&&!['pedrero','perrier'].includes(row.id);
  const sled=row.kind==='carronade';
  const stone=['pedrero','perrier'].includes(row.id);
  const radius=n(11+row.weight*3+row.firepower*.21);
  let length=n(220+row.firepower*1.35),angle=0,mount='truck';
  if(row.id.startsWith('short'))length=n(145+row.firepower*1.35);
  if(row.id.startsWith('medium'))length=n(186+row.firepower*1.35);
  if(row.id.startsWith('chase'))length=n(240+row.firepower*1.4);
  if(row.kind==='early')length=n((row.range==='long'?231:151)+row.firepower*1.5);
  if(sled)length=n(113+row.firepower*1.75);
  if(mortar)length=n(77+row.firepower*1.28);
  if(stone)length=n(115+row.firepower*1.5);
  if(swivel)length=n(137+row.firepower*5);
  if(row.id==='wall-gun'){
    mount='gunstock';
    art+=path('M206 119L302 128L385 162L415 159L411 201L382 194L331 158L264 147L191 138Z','url(#wood)','#2b3f3b',2);
    art+=path('M387 165L383 191M404 164L401 194','none','#596955',5);
    art+=rect(46,108,273,13,'url(#iron)','rx="3" stroke="#243e43" stroke-width="2"');
    art+=rect(55,107,6,16,'#929e87');art+=rect(181,107,7,22,'#929e87');art+=rect(260,111,31,21,'url(#iron)','rx="5"');
    art+=path('M278 119l-6-17l13-8m-10 12l13 3M292 144q-16 32-38 1M270 145l-2 9','none','#435b53',3);
    art+=path('M219 142V229M203 130q16 30 32 0','none','#536958',6);
    art+=path('M189 234h63','none','#8f734d',8);
  }else{
    if(swivel){
      mount='swivel';angle=5;
      art+=path('M266 151V226M248 127Q267 174 289 126','none','#293f40',9);
      art+=path('M266 154V223M250 128Q267 170 287 127','none','#a7a88a',3);
      art+=rect(227,217,80,17,'url(#wood)','rx="3" stroke="#38483d" stroke-width="2"');
      art+=path('M249 220V233M282 220V233','none','#55614c',4);
    }else if(mortar){
      mount='mortar-bed';angle=row.id==='howitzer-8'?27:row.id==='bombard'?41:50;
      art+=rect(189,215,180,20,'url(#wood)','rx="2" stroke="#30483f" stroke-width="2"');
      art+=path('M209 215L239 148H298L339 215Z','url(#wood)','#30453d',2);
      art+=path('M236 166L222 212M307 180L323 212M195 221H363','none','#d4b276',2);
      art+=path('M231 162L215 218M313 185L328 218','none','#4c6558',8);
    }else if(sled){
      mount='slide';
      art+=path('M165 190H366L379 212H152Z','url(#wood)','#30463e',2);
      art+=rect(171,174,175,17,'url(#wood)','stroke="#314740" stroke-width="2"');
      art+=path('M191 176V162H309V176M160 212H373M200 215V232M350 215V232','none','#4a635b',7);
      art+=path('M308 168v-33m-9 6h18','none','#516a60',4);
      art+=ellipse(185,215,7,8,'url(#iron)');art+=ellipse(359,215,7,8,'url(#iron)');
    }else{
      mount=stone?'stone-thrower-truck':'truck';angle=row.id.startsWith('shell')?11:stone?15:0;
      const carriageWidth=n(154+row.weight*15+row.ammoCost*13),cx=n(268-carriageWidth/2);
      art+=wheel(cx+33,202,16);art+=wheel(cx+carriageWidth-22,202,14);
      art+=path(`M${cx} 148H278L299 172H${cx+carriageWidth-25}V188H${cx+carriageWidth}V211H${cx}Z`,'url(#wood)','#2e443c',2);
      art+=path(`M${cx+6} 153H272L293 177H${cx+carriageWidth-31}M${cx+6} 198H${cx+carriageWidth-5}`,'none','#e2bd83',1.6);
      for(let i=0;i<4;i++)art+=path(`M${cx+9} ${164+i*9}Q${cx+40} ${159+i*9} ${cx+71} ${165+i*9}`,'none','#806241',.8);
      art+=rect(cx+11,154,10,54,'url(#iron)');art+=rect(cx+carriageWidth-17,188,10,23,'url(#iron)');
      art+=wheel(cx+27,213,n(17+row.weight*.7));art+=wheel(cx+carriageWidth-19,213,n(15+row.weight*.5));
      art+=path(`M311 148l37 -14v22h-37Z`,'#89663d','#35473d',1.4);
    }
    const rear=swivel?327:mortar?297:337,y=swivel?115:137,x=n(rear-length);
    art+=`<g data-barrel="${row.id}" transform="rotate(${angle} 269 ${y})">`+barrel(row,x,y,length,radius)+'</g>';
    art+=ellipse(268,153,mortar?14:10,mortar?14:10,'url(#iron)','stroke="#29423e" stroke-width="2"');
    art+=ellipse(268,153,5,5,'#bfc3a6');
    if(!swivel&&!mortar)art+=path('M250 148Q268 124 285 148M251 155V169M282 155V169','none','#3c544d',5);
  }
  const shotSize=n(5+row.firepower*.18),shotFill=stone?'#b1a68b':'url(#shot)';
  for(let i=0;i<3;i++)art+=ellipse(n(91+(i%2)*shotSize*2.1),n(234-Math.floor(i/2)*shotSize*1.5),shotSize,shotSize,shotFill,'stroke="#405650" stroke-width="1"');
  if(mortar||row.id.startsWith('shell'))art+=path(`M91 ${n(234-shotSize)}q-3 -9 6 -13`,'none','#b7975f',2);
  art+='</g>\n</svg>\n';
  return annotate(art.replace('<g stroke-linecap=',`<g data-mount="${mount}" stroke-linecap=`),row,false);
}

export function generate({check=false}={}) {
  let changed=0;
  for(const [catalog,drawn,render,ship] of [[SHIP_TYPES,DRAWN_SHIPS,renderShip,true],[CANNONS,DRAWN_CANNONS,renderCannon,false]]){
    for(const row of Object.values(catalog)){
      const file=new URL(row.asset,root);
      let original='';
      try{original=readFileSync(file,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
      const svg=drawn.has(row.id)?annotate(original,row,ship):render(row);
      if(!svg.includes('<svg'))throw new Error(`Missing original artwork: ${row.asset}`);
      if(original!==svg){
        changed++;
        if(!check)writeFileSync(file,svg);
        else console.error(`Stale or missing: ${row.asset}`);
      }
    }
  }
  if(check&&changed)throw new Error(`${changed} naval assets need regeneration`);
  return changed;
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const check=process.argv.includes('--check');
  console.log(`${check?'Verified':'Generated'} ${Object.keys(SHIP_TYPES).length} ship and ${Object.keys(CANNONS).length} cannon illustrations; ${generate({check})} changed.`);
}
