import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const psRaw=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyPlugSetDefinition`).all().map(r=>JSON.parse(r.j));
const byHash=new Map(items.map(i=>[i.hash,i]));
const nm=h=>byHash.get(h)||{};
const name=h=>nm(h).displayProperties?nm(h).displayProperties.name:'?';
const isEnh=h=>/强化/.test(nm(h).itemTypeDisplayName||'');
function setItems(p){const out=[];for(const r of p.reusablePlugItems||[]) if(r.plugItemHash) out.push(r.plugItemHash);for(const r of p.reusablePlugEntries||[]) for(const h of r.plugItemHashes||[]) out.push(h);return out;}
const ps=new Map(psRaw.map(p=>[p.hash,setItems(p)]));
for(const hid of [1801007332,3181377148]){
  const w=items.find(i=>i.hash===hid);
  console.log('\n########',w.displayProperties.name,'#'+hid);
  const ents=w.sockets.socketEntries;
  const labels={'1':'枪管','2':'弹匣','3':'特性位 1','4':'特性位 2'};
  for(const i of [0,1,2,3,4]){
    const s=ents[i]; const h=s.randomizedPlugSetHash||s.reusablePlugSetHash; const list=(h&&ps.get(h))||[];
    const base=list.filter(x=>!isEnh(x));
    const uniq=[...new Set(base.map(name))];
    console.log('  ['+i+'] '+(labels[i]||'框架')+' 全部 '+list.length+' | 非强化 '+base.length+' | 去重名 '+uniq.length+(i===0?'  → '+uniq.join('、'):''));
    if(i>0) console.log('        名单: '+uniq.join('、'));
  }
  // 武器模组插槽
  for(let i=5;i<ents.length;i++){
    const s=ents[i]; const h=s.randomizedPlugSetHash||s.reusablePlugSetHash; const list=(h&&ps.get(h))||[];
    const uniq=[...new Set(list.map(name))];
    if(uniq.includes('备用弹匣')){ console.log('  ['+i+'] 武器模组 全部 '+list.length+' | 非强化 '+list.filter(x=>!isEnh(x)).length+' | 去重名 '+uniq.length); console.log('        名单: '+uniq.join('、')); }
  }
}
