import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const psRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>JSON.parse(r.j));
const byHash=new Map(items.map(i=>[i.hash,i]));
const name=h=>byHash.get(h)?byHash.get(h).displayProperties.name:('#'+h);
function setItems(p){const out=[];for(const r of p.reusablePlugItems||[]) if(r.plugItemHash) out.push(r.plugItemHash);for(const r of p.reusablePlugEntries||[]) for(const h of r.plugItemHashes||[]) out.push(h);return out;}
const ps=new Map(psRaw.map(p=>[p.hash,setItems(p)]));
const l=ps.get(2876301943)||[];
console.log('大师杰作位池 '+l.length+' 项，去重名 '+new Set(l.map(name)).size);
console.log([...new Set(l.map(name))].join('、'));
// 属性位池
const a=ps.get(731468111)||[];
console.log('\n属性位池 '+a.length+' 项，去重名 '+new Set(a.map(name)).size);
console.log([...new Set(a.map(name))].join('、'));
// 通用位池去重名
const g=ps.get(2037229815)||[];
console.log('\n通用位池 '+g.length+' 项，去重名 '+new Set(g.map(name)).size);
