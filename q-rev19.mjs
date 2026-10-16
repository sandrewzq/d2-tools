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
const w=items.find(i=>i.hash===1801007332);
const ents=w.sockets.socketEntries;
const lab={1:'枪管',2:'弹匣',3:'特性位 1',4:'特性位 2'};
for(const i of [1,2,3,4]){
  const s=ents[i]; const list=ps.get(s.randomizedPlugSetHash)||[];
  const rows=list.map(h=>({h,n:name(h),e:isEnh(h)}));
  const base=rows.filter(r=>!r.e);
  const dup={}; base.forEach(r=>dup[r.n]=(dup[r.n]||0)+1);
  const uniq=[...new Set(base.map(r=>r.n))];
  const real=uniq.filter(n=>!/^空.*插槽$/.test(n));
  console.log('\n['+i+'] '+lab[i]+'  非强化条目 '+base.length+' | 去重名 '+uniq.length+' | 去占位 '+real.length);
  console.log('   重复名:',Object.entries(dup).filter(([k,v])=>v>1).map(([k,v])=>k+'×'+v).join('、')||'无');
  console.log('   名单:',uniq.join('、'));
  console.log('   强化版名单:',[...new Set(rows.filter(r=>r.e).map(r=>r.n))].join('、'));
}
for(let i=5;i<ents.length;i++){
  const s=ents[i]; const h=s.randomizedPlugSetHash||s.reusablePlugSetHash; const list=(h&&ps.get(h))||[];
  const rows=list.map(x=>({n:name(x),e:isEnh(x)}));
  if(!rows.some(r=>r.n==='备用弹匣')) continue;
  const base=rows.filter(r=>!r.e); const uniq=[...new Set(base.map(r=>r.n))];
  console.log('\n['+i+'] 武器模组  全部 '+list.length+' | 非强化 '+base.length+' | 去重名 '+uniq.length+' | 去占位 '+uniq.filter(n=>!/^空.*插槽$/.test(n)).length);
  console.log('   名单:',uniq.join('、'));
}
