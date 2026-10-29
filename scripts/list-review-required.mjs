import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const normalize=s=>s.normalize('NFKC').replace(/\s+/g,'').replace(/ヤード/g,'yd');
function visible(v){if(typeof v==='string')return v;if(!v)return '';return ['text','conditions','priceLabel','dish'].map(k=>typeof v[k]==='string'?v[k]:'').filter(Boolean).join('。');}
const pattern=/\d+(?:\.\d+)?(?:km|キロ|yd|打席|分|円|名|人|時(?::\d+)?|日|月)|タクシー|送迎(?:バス|車)?|クラブバス|徒歩|予約|無料|有料|運休|定員|同伴|会員|土日祝|土日|日祝|平日|土曜|日曜|月曜|火曜|水曜|木曜|金曜|祝日|現金|前払|精算|追加料金|税込|税別|利用不可|利用できません|浴場|シャワー|朝食|昼食|夕食/gi;
export function reviewRequired(changes){
 if(!Array.isArray(changes))throw Error('Expected normalized before/after array');
 return changes.flatMap((c,index)=>{
  if(!Object.hasOwn(c,'before')||!Object.hasOwn(c,'after')||!Number.isInteger(c.id)||typeof c.field!=='string')throw Error(`Malformed normalized change ${index}`);
  const before=visible(c.before),after=visible(c.after);const b=normalize(before),a=normalize(after);if(!b||b===a)return [];
  const all=[...new Set(b.match(pattern)??[])];if(!all.length)return [];
  const removedTokens=all.filter(t=>!a.includes(t));
  // Also flag retained tokens in rewritten assertions: same 10km elsewhere is not proof of same origin/condition.
  const oldClauses=b.split(/[。;；]/).filter(Boolean);
  const changedAssertionTokens=[...new Set(oldClauses.filter(s=>!a.includes(s)).flatMap(s=>s.match(pattern)??[]))];
  if(!removedTokens.length&&!changedAssertionTokens.length)return [];
  return [{id:c.id,field:c.field,index,reviewRequired:true,removedTokens,changedAssertionTokens,before,after,decision:null,reason:'Lexical candidate only. Reviewer must match facility/origin/mode/date/plan/party size and old/new source scope. Not an automatic error verdict.'}];
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{if(process.argv.length!==3)throw Error('usage: node list-review-required.mjs NORMALIZED_CHANGES_JSON');const records=reviewRequired(JSON.parse(readFileSync(process.argv[2],'utf8')));console.log(JSON.stringify({reviewRequiredCount:records.length,records},null,2));if(records.length)process.exitCode=2;}catch(e){console.error(e.message);process.exitCode=1;}}
