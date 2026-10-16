import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const tables=db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().map(r=>r.name);
const pats=[/异域[^"」]{0,14}一件/,/一件[^"」]{0,10}异域/,/只能装备/,/同时装备/];
let n=0;
for(const t of tables){
  let rows;
  try{ rows=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM "${t}"`).all(); }catch(e){ continue; }
  for(const r of rows){
    const j=r.j; if(!j) continue;
    for(const p of pats){
      const m=j.match(p);
      if(m){ n++; if(n<40) console.log('['+t+'] …'+j.slice(Math.max(0,j.indexOf(m[0])-90),j.indexOf(m[0])+110).replace(/\s+/g,' ')+'…'); break; }
    }
  }
}
console.log('\n命中总数',n);
