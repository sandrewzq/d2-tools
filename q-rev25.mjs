import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const psRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>JSON.parse(r.j));
const stRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinySocketTypeDefinition`).all().map(r=>JSON.parse(r.j));
const stByHash=new Map(stRaw.map(s=>[s.hash,s]));
const byHash=new Map(items.map(i=>[i.hash,i]));
const nm=h=>byHash.get(h)&&byHash.get(h).displayProperties.name;
function setItems(p){const out=[];for(const r of p.reusablePlugItems||[]) if(r.plugItemHash) out.push(r.plugItemHash);for(const r of p.reusablePlugEntries||[]) for(const h of r.plugItemHashes||[]) out.push(h);return out;}
const ps=new Map(psRaw.map(p=>[p.hash,setItems(p)]));
const modernMod=(it)=>{for(const s of it.sockets?sockets(it):[]){} return true;};
function sockets(it){return it.sockets.socketEntries;}
// 用插槽类型的 plugWhitelist 判现代
const v2=new Set(); for(const s of stRaw) for(const w of s.plugWhitelist||[]) if(/^enhancements\.v2/.test(w.categoryIdentifier||'')) v2.add(s.hash);
const exoArmor=items.filter(i=>i.inventory&&i.inventory.tierType===6&&['头盔','臂铠','胸甲','腿甲','职业物品'].includes(i.itemTypeDisplayName||'')&&i.sockets&&i.sockets.socketEntries.some(s=>v2.has(s.socketTypeHash)));
console.log('现代异域护甲件数',exoArmor.length);
const e=exoArmor[0];
console.log('\n样本:',e.displayProperties.name,'#'+e.hash,e.itemTypeDisplayName,'| 插槽数',e.sockets.socketEntries.length);
e.sockets.socketEntries.forEach((s,i)=>{const st=stByHash.get(s.socketTypeHash);const h=s.randomizedPlugSetHash||s.reusablePlugSetHash;const l=(h&&ps.get(h))||[];
 const wl=(st&&st.plugWhitelist||[]).map(x=>x.categoryIdentifier).filter(Boolean).slice(0,3).join(',');
 console.log('  ['+i+'] 白名单['+wl+'] 池 '+l.length+' → '+l.slice(0,3).map(nm).join('、'));});
// 传说头盔对照
const leg=items.filter(i=>i.itemTypeDisplayName==='头盔'&&i.inventory&&i.inventory.tierType===5&&!i.redacted&&i.sockets&&i.sockets.socketEntries.length>10)[0];
console.log('\n传说对照:',leg.displayProperties.name,'# 插槽数',leg.sockets.socketEntries.length);
leg.sockets.socketEntries.forEach((s,i)=>{const st=stByHash.get(s.socketTypeHash);const wl=(st&&st.plugWhitelist||[]).map(x=>x.categoryIdentifier).filter(Boolean).slice(0,3).join(',');
 console.log('  ['+i+'] 白名单['+wl+']');});
