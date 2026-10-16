import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const psRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>JSON.parse(r.j));
const stRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinySocketTypeDefinition`).all().map(r=>JSON.parse(r.j));
const byHash=new Map(items.map(i=>[i.hash,i]));
const nm=h=>byHash.get(h)||{};
const name=h=>nm(h).displayProperties?nm(h).displayProperties.name:('#'+h);
const isEnh=h=>/强化/.test(nm(h).itemTypeDisplayName||'');
function setItems(p){const out=[];for(const r of p.reusablePlugItems||[]) if(r.plugItemHash) out.push(r.plugItemHash);for(const r of p.reusablePlugEntries||[]) for(const h of r.plugItemHashes||[]) out.push(h);return out;}
const ps=new Map(psRaw.map(p=>[p.hash,setItems(p)]));
const stByHash=new Map(stRaw.map(s=>[s.hash,s]));
const w=items.find(i=>i.hash===1801007332);
console.log('武器:',w.displayProperties.name,'|',w.itemTypeDisplayName,'| 插槽',w.sockets.socketEntries.length);
w.sockets.socketEntries.forEach((s,i)=>{
  const h=s.randomizedPlugSetHash||s.reusablePlugSetHash;
  const list=(h&&ps.get(h))||[];
  const base=list.filter(x=>!isEnh(x)), enh=list.filter(x=>isEnh(x));
  const st=stByHash.get(s.socketTypeHash);
  const shown=list.slice(0,14).map(x=>name(x)+(isEnh(x)?'(强化)':''));
  console.log('\n ['+i+'] 插槽名='+((st&&st.displayProperties&&st.displayProperties.name)||'?')+'  总'+list.length+' = 非强化'+base.length+' + 强化'+enh.length);
  console.log('     ',shown.join('、'));
});
