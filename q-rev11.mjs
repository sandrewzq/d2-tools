import { DatabaseSync } from 'node:sqlite';
const dir='/Users/longhuadmin/Library/Application Support/d2-tools/manifest/sqlite/zh-chs/active/';
const db=new DatabaseSync(dir+'world.sqlite',{readOnly:true});
const items=db.prepare(`SELECT CAST(json AS TEXT) AS j FROM DestinyInventoryItemDefinition`).all().map(r=>JSON.parse(r.j));
const names=['支援框架','箭头制退器','螺旋膛线','槽化枪管','精确弹药','附加弹匣','战术弹匣','医治','维持生计','爆破专家','辉耀炽热','狂乱','腹背受敌','备用弹匣','徒手握把','雷达调谐器'];
for(const n of names){
  const l=items.filter(i=>i.displayProperties.name===n);
  console.log(n+'  ×'+l.length+(l.length?'  →  '+l.map(i=>(i.itemTypeDisplayName||'?')+'/'+((i.plug&&i.plug.plugCategoryIdentifier)||'-')).slice(0,4).join(' ; '):'   ★不存在'));
}
