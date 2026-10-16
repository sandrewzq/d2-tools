import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const st=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinySocketTypeDefinition`).all().map(r=>JSON.parse(r.j));
const ps=new Map(db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>[JSON.parse(r.j).hash,JSON.parse(r.j)]));
const byHash=new Map(items.map(i=>[i.hash,i]));
const stByHash=new Map(st.map(s=>[s.hash,s]));
// 找 支援框架 自动步枪
const frames=items.filter(i=>/框架$|热量武器$/.test(i.displayProperties.name||'')&&/自动步枪/.test((i.itemTypeDisplayName||'')));
console.log('自动步枪框架条目:',frames.map(f=>f.displayProperties.name+'#'+f.hash).join(' | ').slice(0,300));
const AR=items.filter(i=>i.itemTypeDisplayName==='自动步枪'&&i.inventory&&i.inventory.tierType===5&&!i.redacted);
console.log('传说自动步枪数',AR.length);
// 对每把，算各插槽池子大小
function poolInfo(item){
  const out=[];
  for(const s of item.sockets&&item.sockets.socketEntries||[]){
    const stDef=stByHash.get(s.socketTypeHash);
    let n=0,names=[],why='';
    if(s.reusablePlugSetHash&&ps.has(s.reusablePlugSetHash)){const p=ps.get(s.reusablePlugSetHash);
      const list=(p.reusablePlugItems||[]).map(x=>x.plugItemHash);n=list.length;names=list.map(h=>byHash.get(h)&&byHash.get(h).displayProperties.name).filter(Boolean);why='plugset';}
    if(s.randomizedPlugSetHash&&ps.has(s.randomizedPlugSetHash)){const p=ps.get(s.randomizedPlugSetHash);
      const list=(p.reusablePlugItems||[]).map(x=>x.plugItemHash);n=list.length;names=list.map(h=>byHash.get(h)&&byHash.get(h).displayProperties.name).filter(Boolean);why='random';}
    if(!n&&stDef){ for(const w of stDef.plugWhitelist||[]){ if((w.allowedPlugHashes||[]).length){n=w.allowedPlugHashes.length;names=w.allowedPlugHashes.map(h=>byHash.get(h)&&byHash.get(h).displayProperties.name).filter(Boolean);why='white:'+(w.categoryIdentifier||'');break;} } }
    out.push({cat:(stDef&&stDef.displayProperties&&stDef.displayProperties.name)||'?',n,why,sample:names.slice(0,4)});
  }
  return out;
}
// 找池子 11/13/10/11 的
const target=[11,13,10,11];
let found=[];
for(const w of AR){
  const p=poolInfo(w).map(x=>x.n);
  if(target.every((t,i)=>p[i]===t)) found.push(w);
}
console.log('\n匹配 11/13/10/11 的枪:',found.length);
for(const f of found.slice(0,6)){
  console.log('\n### '+f.displayProperties.name+' #'+f.hash);
  for(const x of poolInfo(f)) console.log('   ',x.cat,'=',x.n,x.why,JSON.stringify(x.sample));
}
