import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const sbp=new Map(db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinySandboxPerkDefinition`).all().map(r=>{const x=JSON.parse(r.j);return [x.hash,x];}));
const sets=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyEquipableItemSetDefinition`).all().map(r=>JSON.parse(r.j));
for(const nm of ['兴旺幸存者','第七炽天使','野木','凯旋圣歌']){
  const s=sets.find(x=>x.displayProperties.name===nm); if(!s){console.log(nm,'找不到');continue;}
  console.log('\n### '+nm);
  for(const p of s.setPerks||[]){const sp=sbp.get(p.sandboxPerkHash);
    console.log('  '+p.requiredSetCount+' 件 → '+((sp&&sp.displayProperties.name)||'?')+' : '+((sp&&sp.displayProperties.description)||'').replace(/\n/g,' '));}
}
// 异域护甲插槽
const psRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>JSON.parse(r.j));
const stRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinySocketTypeDefinition`).all().map(r=>JSON.parse(r.j));
const stByHash=new Map(stRaw.map(s=>[s.hash,s]));
function setItems(p){const out=[];for(const r of p.reusablePlugItems||[]) if(r.plugItemHash) out.push(r.plugItemHash);for(const r of p.reusablePlugEntries||[]) for(const h of r.plugItemHashes||[]) out.push(h);return out;}
const ps=new Map(psRaw.map(p=>[p.hash,setItems(p)]));
const byHash=new Map(items.map(i=>[i.hash,i]));
const nm=h=>byHash.get(h)&&byHash.get(h).displayProperties.name;
const exo=items.filter(i=>i.itemTypeDisplayName==='头盔'&&i.inventory&&i.inventory.tierType===6&&!i.redacted&&i.sockets&&JSON.stringify(i.sockets).includes('enhancements.v2'));
console.log('\n现代异域头盔数',exo.length);
const e=exo[0]; console.log('样本:',e.displayProperties.name,'#'+e.hash,'插槽数',e.sockets.socketEntries.length);
e.sockets.socketEntries.forEach((s,i)=>{const h=s.randomizedPlugSetHash||s.reusablePlugSetHash;const l=(h&&ps.get(h))||[];
 console.log('  ['+i+'] 池 '+l.length+' → '+l.slice(0,3).map(nm).join('、'));});
