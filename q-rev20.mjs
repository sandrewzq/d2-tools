import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const psRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>JSON.parse(r.j));
const stRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinySocketTypeDefinition`).all().map(r=>JSON.parse(r.j));
const byHash=new Map(items.map(i=>[i.hash,i]));
const nm=h=>byHash.get(h)||{};
const name=h=>nm(h).displayProperties?nm(h).displayProperties.name:'?';
const isEnh=h=>/强化/.test(nm(h).itemTypeDisplayName||'');
function setItems(p){const out=[];for(const r of p.reusablePlugItems||[]) if(r.plugItemHash) out.push(r.plugItemHash);for(const r of p.reusablePlugEntries||[]) for(const h of r.plugItemHashes||[]) out.push(h);return out;}
const ps=new Map(psRaw.map(p=>[p.hash,setItems(p)]));
// 找现代传说头盔
const H=items.filter(i=>i.itemTypeDisplayName==='头盔'&&i.inventory&&i.inventory.tierType===5&&!i.redacted&&i.sockets&&i.sockets.socketEntries.length>10);
console.log('现代传说头盔样本数',H.length);
const w=H[0];
console.log('样本:',w.displayProperties.name,'#'+w.hash);
const stByHash=new Map(stRaw.map(s=>[s.hash,s]));
w.sockets.socketEntries.forEach((s,i)=>{
  const st=stByHash.get(s.socketTypeHash);
  const wl=(st&&st.plugWhitelist||[]).map(x=>(x.categoryIdentifier||'')+'('+(x.allowedPlugHashes||[]).length+')').join(' ');
  const h=s.randomizedPlugSetHash||s.reusablePlugSetHash;
  const list=(h&&ps.get(h))||[];
  const base=list.filter(x=>!isEnh(x));
  console.log('  ['+i+'] stName='+((st&&st.displayProperties&&st.displayProperties.name)||'-')+' | plugSet '+h+' n='+list.length+' 非强化'+base.length+' | 白名单: '+wl);
  if(i<=3&&list.length) console.log('        前8: '+list.slice(0,8).map(name).join('、'));
});
