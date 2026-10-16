import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const byHash=new Map(items.map(i=>[i.hash,i]));
const sets=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyEquipableItemSetDefinition`).all().map(r=>JSON.parse(r.j));
console.log('套装数',sets.length);
const th=new Set(), cnt=new Set(), tiers=new Set(); let exotic=0;
for(const s of sets){
  (s.setPerks||[]).forEach(p=>th.add(p.requiredSetCount));
  cnt.add((s.setItems||[]).length);
  for(const h of s.setItems||[]){const it=byHash.get(h); if(it){tiers.add(it.inventory&&it.inventory.tierType); if(it.inventory&&it.inventory.tierType===6) exotic++;}}
}
console.log('门槛集合',[...th].sort(),'| 每套件数集合',[...cnt],'| 成员分级',[...tiers].sort(),'| 异域成员数',exotic);
// 抽查一套
const s=sets.find(x=>x.displayProperties.name==='兴旺幸存者')||sets[0];
console.log('\n套装',s.displayProperties.name,'setPerks=',JSON.stringify(s.setPerks),'件数',(s.setItems||[]).length);
for(const p of s.setPerks||[]) console.log('   '+p.requiredSetCount+' 件 → '+p.displayProperties.name+' : '+(p.displayProperties.description||'').replace(/\n/g,' ').slice(0,160));
// 异域护甲插槽 vs 传说护甲插槽
const psRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>JSON.parse(r.j));
function setItems(p){const out=[];for(const r of p.reusablePlugItems||[]) if(r.plugItemHash) out.push(r.plugItemHash);for(const r of p.reusablePlugEntries||[]) for(const h of r.plugItemHashes||[]) out.push(h);return out;}
const ps=new Map(psRaw.map(p=>[p.hash,setItems(p)]));
function prof(it){return it.sockets.socketEntries.map(s=>{const h=s.randomizedPlugSetHash||s.reusablePlugSetHash;const l=(h&&ps.get(h))||[];return l.length;});}
const exo=items.filter(i=>i.itemTypeDisplayName==='头盔'&&i.inventory&&i.inventory.tierType===6&&!i.redacted&&i.sockets&&JSON.stringify(i.sockets).includes('enhancements'));
const leg=items.filter(i=>i.itemTypeDisplayName==='头盔'&&i.inventory&&i.inventory.tierType===5&&!i.redacted&&i.sockets&&i.sockets.socketEntries.length>10);
console.log('\n现代异域头盔',exo.length,'| 传说头盔',leg.length);
console.log('异域样本',exo[0]&&exo[0].displayProperties.name,'插槽池=',prof(exo[0]).join('/'));
console.log('传说样本',leg[0].displayProperties.name,'插槽池=',prof(leg[0]).join('/'));
