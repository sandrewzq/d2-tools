import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const psRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>JSON.parse(r.j));
const stRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinySocketTypeDefinition`).all().map(r=>JSON.parse(r.j));
const byHash=new Map(items.map(i=>[i.hash,i]));
const name=h=>byHash.get(h)?byHash.get(h).displayProperties.name:('#'+h);
function setItems(p){const out=[];for(const r of p.reusablePlugItems||[]) if(r.plugItemHash) out.push(r.plugItemHash);for(const r of p.reusablePlugEntries||[]) for(const h of r.plugItemHashes||[]) out.push(h);return out;}
const ps=new Map(psRaw.map(p=>[p.hash,setItems(p)]));
const stByHash=new Map(stRaw.map(s=>[s.hash,s]));
const AR=items.filter(i=>i.itemTypeDisplayName==='自动步枪'&&i.inventory&&i.inventory.tierType===5&&!i.redacted&&i.sockets&&i.sockets.socketEntries.length>=6);
for(const w of AR.slice(0,3)){
  console.log('\n### '+w.displayProperties.name+' #'+w.hash+' 插槽数 '+w.sockets.socketEntries.length);
  w.sockets.socketEntries.forEach((s,i)=>{
    const h=s.randomizedPlugSetHash||s.reusablePlugSetHash;
    const list=h&&ps.get(h)?ps.get(h):[];
    const st=stByHash.get(s.socketTypeHash);
    console.log('  ['+i+'] stName='+((st&&st.displayProperties&&st.displayProperties.name)||'?')+' random='+s.randomizedPlugSetHash+' reusable='+s.reusablePlugSetHash+' n='+list.length+' → '+list.slice(0,4).map(name).join('、'));
  });
}
