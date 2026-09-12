import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SHIP_TYPES, CANNONS, RIG_LABELS, CANNON_RANGE_FACTORS } from '../src/data/naval.js';
import { generate } from './generate-naval-assets.js';

const root=new URL('../',import.meta.url);
const decode=text=>text.replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const positive=(value,message)=>assert.ok(Number.isFinite(value)&&value>0,message);
const ships=Object.values(SHIP_TYPES),cannons=Object.values(CANNONS);
assert.ok(ships.length>=60,'At least sixty distinct ships');
assert.ok(cannons.length>=60,'At least sixty distinct cannons');

function checkArt(row,folder) {
  assert.equal(row.visual,row.id);
  assert.equal(row.asset,`assets/${folder}/${row.id}.svg`);
  const svg=readFileSync(new URL(row.asset,root),'utf8');
  assert.ok(svg.includes(`data-catalog-id="${row.id}"`),row.id);
  assert.match(svg,/<svg\b[^>]*viewBox="0 0 \d+ \d+"/);
  assert.ok(svg.includes('role="img" aria-labelledby="title desc"'),row.id);
  assert.equal(decode(svg.match(/<title id="title">([\s\S]*?)<\/title>/)?.[1]||''),row.name);
  assert.doesNotMatch(svg,/(?:NaN|Infinity|undefined|<script\b|<image\b)/,row.id);
  const meta=JSON.parse(decode(svg.match(/<metadata id="naval-spec">([\s\S]*?)<\/metadata>/)?.[1]||'null'));
  assert.equal(meta?.id,row.id);
  for(const [key,value] of Object.entries(meta))assert.equal(value,row[key],`${row.id}.${key}`);
  const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,`${row.id} duplicate SVG ids`);
  for(const match of svg.matchAll(/url\(#([^)]*)\)/g))assert.ok(ids.includes(match[1]),`${row.id} missing paint server ${match[1]}`);
  // Metadata, titles and colors alone cannot make an illustration unique.
  const geometry=[...svg.matchAll(/<(?:path|rect|ellipse|circle|polygon|line)\b[^>]*>/g)].map(match=>match[0].replace(/\s(?:fill|stroke|opacity)="[^"]*"/g,'')).join('');
  assert.ok(geometry.length>300,`${row.id} contains actual vector geometry`);
  return createHash('sha256').update(geometry).digest('hex');
}

for(const [rows,folder] of [[ships,'ships'],[cannons,'cannons']]){
  const assets=new Set(),shapes=new Set();
  for(const row of rows){
    const shape=checkArt(row,folder);
    assert.ok(!assets.has(row.asset),`${row.id} repeats an asset`);
    assert.ok(!shapes.has(shape),`${row.id} repeats another illustration's geometry`);
    assets.add(row.asset);shapes.add(shape);
  }
}

for(const type of ships){
  assert.ok(['exploration','merchant','war'].includes(type.family),type.id);
  for(const field of ['price','hull','sailors','speed','slots','maxGunWeight','rank','masts'])positive(type[field],`${type.id}.${field}`);
  assert.ok(type.masts<=3&&RIG_LABELS[type.rig],type.id);
  assert.ok(Number.isInteger(type.gunDecks)&&type.gunDecks>=0&&type.gunDecks<=3,type.id);
  assert.equal(type.cabins.length,type.slots,type.id);
  assert.equal(type.cabins.filter(id=>id==='cannon').length,type.batterySlots,type.id);
  assert.ok(type.batterySlots>0,type.id);
  for(const required of ['cargo','supply','kitchen'])assert.ok(type.cabins.includes(required),`${type.id} needs ${required}`);
  assert.ok(type.cabins.every(id=>['cargo','supply','cannon','marine','kitchen','infirmary'].includes(id)),type.id);
  assert.ok(CANNONS[type.defaultCannon].weight<=type.maxGunWeight,type.id);
  if(type.rate){assert.equal(type.family,'war');assert.ok(type.ratedGuns>=20);}
}

for(const family of ['exploration','merchant','war']){
  const branch=ships.filter(type=>type.family===family).sort((a,b)=>a.rank-b.rank||a.price-b.price);
  assert.ok(branch.length>=20,`${family} has a complete progression`);
  for(let i=1;i<branch.length;i++){
    assert.ok(branch[i].price>=branch[i-1].price,`${family} rank reverses purchase price at ${branch[i].id}`);
    assert.ok(branch[i].rank-branch[i-1].rank<=6,`${family} has an unexplained progression gap`);
  }
}
for(const cannon of cannons){
  for(const field of ['price','firepower','weight','ammoCost'])positive(cannon[field],`${cannon.id}.${field}`);
  assert.ok(Number.isInteger(cannon.weight)&&cannon.weight<=5,cannon.id);
  assert.ok(cannon.boarding>=0&&Number.isFinite(cannon.boarding),cannon.id);
  assert.ok(CANNON_RANGE_FACTORS[cannon.range],cannon.id);
  assert.ok(['light','long','early','carronade','mortar'].includes(cannon.kind),cannon.id);
  assert.ok(cannon.era&&cannon.shot&&cannon.description,cannon.id);
  assert.ok(ships.some(type=>type.maxGunWeight>=cannon.weight),`${cannon.id} has a compatible hull`);
}
for(const range of ['long','medium','close']){
  const band=cannons.filter(c=>c.range===range).sort((a,b)=>a.firepower-b.firepower);
  for(let i=1;i<band.length;i++)assert.ok(band[i].firepower-band[i-1].firepower<=7,`${range} firepower progression gap`);
}
assert.equal(generate({check:true}),0,'Checked-in artwork must match the reproducible generator');
console.log(`✓ ${ships.length} ships / ${cannons.length} cannons: unique SVG geometry, matching metadata, complete parameters, loadouts and three progression branches`);
