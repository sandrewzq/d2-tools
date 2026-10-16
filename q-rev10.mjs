import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const st=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinySocketTypeDefinition`).all().map(r=>JSON.parse(r.j));
const ps=new Map(db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>[JSON.parse(r.j).hash,JSON.parse(r.j)]));
const byHash=new Map(items.map(i=>[i.hash,i]));
const stByHash=new Map(st.map(s=>[s.hash,s]));
function info(item){
  const out=[];
  (item.sockets&&item.sockets.socketEntries||[]).forEach((s,i)=>{
    const stDef=stByHash.get(s.socketTypeHash);
    let n=0,names=[],why='-';
    if(s.randomizedPlugSetHash&&ps.has(s.randomizedPlugSetHash)){const list=(ps.get(s.randomizedPlugSetHash).reusablePlugItems||[]).map(x=>x.plugItemHash);n=list.length;names=list.map(h=>byHash.get(h)&&byHash.get(h).displayProperties.name);why='R';}
    else if(s.reusablePlugSetHash&&ps.has(s.reusablePlugSetHash)){const list=(ps.get(s.reusablePlugSetHash).reusablePlugItems||[]).map(x=>x.plugItemHash);n=list.length;names=list.map(h=>byHash.get(h)&&byHash.get(h).displayProperties.name);why='U';}
    if(!n&&stDef){for(const w of stDef.plugWhitelist||[]){if((w.allowedPlugHashes||[]).length){n=w.allowedPlugHashes.length;names=w.allowedPlugHashes.map(h=>byHash.get(h)&&byHash.get(h).displayProperties.name);why='W:'+(w.categoryIdentifier||'');break;}}}
    out.push({i,cat:(stDef&&stDef.displayProperties&&stDef.displayProperties.name)||'?',n,why,sample:names.slice(0,5).filter(Boolean)});
  });
  return out;
}
const AR=items.filter(i=>i.itemTypeDisplayName==='自动步枪'&&i.inventory&&i.inventory.tierType===5&&!i.redacted);
// 找名字里有「医治」特性的
const withPerk=AR.filter(w=>JSON.stringify(w.sockets||{}).length&&(!w.sockets||true));
// 直接统计所有传说自动步枪的各插槽池子大小的分布
const dist={};
for(const w of AR){ const p=info(w).map(x=>x.n); const k=p.join(','); dist[k]=(dist[k]||0)+1; }
console.log('池子组合分布（前 12）:');
Object.entries(dist).sort((a,b)=>b[1]-a[1]).slice(0,12).forEach(([k,v])=>console.log('  ',k,'×',v));
const sample=AR.find(w=>{const p=info(w).map(x=>x.n);return p.includes(11)&&p.includes(13)&&p.includes(10)&&p.includes(11);})||AR[0];
console.log('\n样例:',sample.displayProperties.name,'#'+sample.hash);
for(const x of info(sample)) console.log('  ['+x.i+']',x.cat,'=',x.n,x.why,'|',JSON.stringify(x.sample));
