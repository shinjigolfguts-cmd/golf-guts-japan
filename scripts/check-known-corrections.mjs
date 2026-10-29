import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const requireThat=(ok,msg)=>{if(!ok)throw new Error(msg);};
export function parseData(s){const m=/^\s*const\s+DATA\s*=\s*([\s\S]*?)\s*;?\s*$/.exec(s);requireThat(m,'Expected const DATA JSON');return JSON.parse(m[1]);}
const norm=s=>String(s??'').normalize('NFKC').replace(/\s+/g,'').replace(/ヤード/gi,'yd');
export function checkKnownCorrections(data){
 const get=id=>{const a=data.courses.filter(c=>c.id===id);requireThat(a.length===1,`ID ${id} must exist once`);return a[0];};
 const c571=get(571);
 for(const [name,s] of [['feature',c571.feature],['detail',c571.comparison?.play?.text]]){
  const t=norm(s);requireThat(/250yd/i.test(t)&&/17打席/.test(t),`571 ${name}: require250yd17stalls`);
  requireThat(!/300yd|14打席/i.test(t),`571 ${name}: stale range value`);
 }
 const car=get(383).comparison?.car;requireThat(car?.sourceType==='mixed','383 requires mixed attribution');
 const segs=car.evidenceSegments??[];
 const old=segs.filter(s=>norm(s.text).includes('黒石IC')&&/45km/i.test(norm(s.text)));
 const latest=segs.filter(s=>norm(s.text).includes('黒石IC')&&/60分/.test(norm(s.text)));
 requireThat(old.length===1&&old[0].sourceType==='booking'&&old[0].checked==='2026-10-25'&&old[0].url==='https://reserve.golfdigest.co.jp/golf-course/215102/','383 old distance source/date mismatch');
 requireThat(latest.length===1&&latest[0].sourceType==='official'&&latest[0].checked==='2026-10-29'&&latest[0].url==='https://towadako-gc.net/','383 official time source/date mismatch');
 requireThat(old[0]!==latest[0],'383 needs separate source segments');
 requireThat(norm(car.text)===norm(segs.map(s=>s.text).join(' ')),'383 aggregate text and visible segments disagree');
 requireThat([car.text,...segs.map(s=>s.text)].every(s=>!/45分/.test(norm(s))),'383 stale45min in displayed assertion');
 return {ok:true,ids:[571,383],scope:'Fixed regression assertions only; dates are intentional historical source dates, not a general factual validation.'};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{if(process.argv.length!==3)throw Error('usage: node check-known-corrections.mjs DATA_JS');console.log(JSON.stringify(checkKnownCorrections(parseData(readFileSync(process.argv[2],'utf8'))),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
