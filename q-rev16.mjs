import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const psRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>JSON.parse(r.j));
const byHash=new Map(items.map(i=>[i.hash,i]));
const name=h=>byHash.get(h)?byHash.get(h).displayProperties.name:('#'+h);
function setItems(p){const out=[];for(const r of p.reusablePlugItems||[]) if(r.plugItemHash) out.push(r.plugItemHash);for(const r of p.reusablePlugEntries||[]) for(const h of r.plugItemHashes||[]) out.push(h);return out;}
const ps=new Map(psRaw.map(p=>[p.hash,setItems(p)]));
const AR=items.filter(i=>i.itemTypeDisplayName==='自动步枪'&&i.inventory&&i.inventory.tierType===5&&!i.redacted&&i.sockets);
const want1=['医治','维持生计','爆破专家'], want2=['辉耀炽热','狂乱','腹背受敌'];
let n=0;
for(const w of AR){
  const ents=w.sockets.socketEntries; if(ents.length<7) continue;
  const g=i=>{const h=ents[i]&&(ents[i].randomizedPlugSetHash||ents[i].reusablePlugSetHash);return h&&ps.get(h)?ps.get(h).map(name):[];};
  const t1=g(3),t2=g(4);
  const ok1=want1.every(x=>t1.includes(x)), ok2=want2.every(x=>t2.includes(x));
  if(ok1||ok2){ n++; if(n<=8) console.log(w.displayProperties.name+' #'+w.hash+' | t1('+t1.length+') 含三项=' +ok1+' | t2('+t2.length+') 含三项='+ok2+' | 枪管 '+g(1).length+' 弹匣 '+g(2).length); }
}
console.log('命中',n);
