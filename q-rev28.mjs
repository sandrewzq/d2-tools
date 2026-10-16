import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
for(const i of items.filter(x=>x.displayProperties.name==='丢弃型弹匣')) console.log('丢弃型弹匣 hash',i.hash,'| redacted',i.redacted,'| tier',i.inventory&&i.inventory.tierType,'| type',i.itemTypeDisplayName);
// 弹匣池原样输出
const psRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>JSON.parse(r.j));
const byHash=new Map(items.map(i=>[i.hash,i]));
const nm=h=>byHash.get(h)||{};
const isEnh=h=>/强化/.test(nm(h).itemTypeDisplayName||'');
function setItems(p){const out=[];for(const r of p.reusablePlugItems||[]) if(r.plugItemHash) out.push(r.plugItemHash);for(const r of p.reusablePlugEntries||[]) for(const h of r.plugItemHashes||[]) out.push(h);return out;}
const ps=new Map(psRaw.map(p=>[p.hash,setItems(p)]));
const w=items.find(i=>i.hash===1801007332);
const mag=(ps.get(w.sockets.socketEntries[2].randomizedPlugSetHash)||[]).filter(h=>!isEnh(h));
console.log('\n弹匣非强化条目 '+mag.length);
for(const h of mag) console.log('  ',h,nm(h).displayProperties.name,'| redacted',nm(h).redacted);
