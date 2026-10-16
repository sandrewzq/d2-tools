import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const w=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const cats=w.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyItemCategoryDefinition`).all().map(r=>JSON.parse(r.j));
console.log('=== 分类名含异域 ===');
for(const c of cats){
  const t=c.displayProperties.name+' '+c.identifier;
  if(/异域|exotic/i.test(t)) console.log(' ',c.hash,c.identifier,'|',c.displayProperties.name,'|',(c.displayProperties.description||'').replace(/\n/g,' '));
}
const slots=w.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyEquipmentSlotDefinition`).all().map(r=>JSON.parse(r.j));
console.log('\n=== 槽位表（含 description） ===');
for(const s of slots) console.log(' ', s.hash, s.displayProperties.name, '|', (s.displayProperties.description||'').replace(/\n/g,' ').slice(0,60));
