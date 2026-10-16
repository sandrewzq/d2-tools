import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const psRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>JSON.parse(r.j));
const byHash=new Map(items.map(i=>[i.hash,i]));
const name=h=>byHash.get(h)?byHash.get(h).displayProperties.name:('#'+h);
const cat=h=>{const i=byHash.get(h);return i&&i.plug?i.plug.plugCategoryIdentifier:'?';};
function setItems(p){const out=[];for(const r of p.reusablePlugItems||[]) if(r.plugItemHash) out.push(r.plugItemHash);for(const r of p.reusablePlugEntries||[]) for(const h of r.plugItemHashes||[]) out.push(h);return out;}
const ps=new Map(psRaw.map(p=>[p.hash,setItems(p)]));
const AR=items.filter(i=>i.itemTypeDisplayName==='自动步枪'&&i.inventory&&i.inventory.tierType===5&&!i.redacted&&i.sockets);
const dist={};
const rows=[];
for(const w of AR){
  const ents=w.sockets.socketEntries;
  if(ents.length<7) continue;
  const g=i=>{const h=ents[i]&&(ents[i].randomizedPlugSetHash||ents[i].reusablePlugSetHash);return h&&ps.get(h)?ps.get(h):[];};
  const barrel=g(1),mag=g(2),t1=g(3),t2=g(4);
  // 武器模组：找含 备用弹匣 的插槽
  let mod=[];
  for(let i=5;i<ents.length;i++){const l=g(i);if(l.some(h=>name(h)==='备用弹匣')){mod=l;break;}}
  if(!barrel.length||!t1.length) continue;
  const key=[barrel.length,mag.length,t1.length,t2.length,mod.length].join('/');
  dist[key]=(dist[key]||0)+1;
  rows.push({w,key,barrel,mag,t1,t2,mod});
}
console.log('池子组合分布:');
Object.entries(dist).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([k,v])=>console.log('  ',k,'×',v));
const hit=rows.find(r=>r.key==='11/13/10/11/23');
console.log('\n精确匹配 11/13/10/11/23:',hit?hit.w.displayProperties.name+' #'+hit.w.hash:'（无）');
if(hit){console.log('  枪管:',hit.barrel.map(name).join('、'));console.log('  弹匣:',hit.mag.map(name).join('、'));console.log('  特性1:',hit.t1.map(name).join('、'));console.log('  特性2:',hit.t2.map(name).join('、'));console.log('  武器模组:',hit.mod.map(name).join('、'));}
