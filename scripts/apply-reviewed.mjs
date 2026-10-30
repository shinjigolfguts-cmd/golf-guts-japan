// Local-only draft. No network, git mutation, scheduling or publication.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {isDeepStrictEqual as eq} from 'node:util';
import {pathToFileURL} from 'node:url';
const fields=new Set(['play','car','rail','scenery','dining','budget','stay','note','officialUrl']);
const states=new Set(['supported','supported_with_required_conditions_applied']);
const fail=m=>{throw new Error(m)};
export const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function date(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s)||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s)fail('invalid date');return s}
function url(s){let u;try{u=new URL(s)}catch{fail('invalid URL')}if(!['https:','http:'].includes(u.protocol)||u.username||u.password)fail('unsafe URL');}
export function parseData(raw){const m=raw.match(/^\s*const DATA\s*=\s*([\s\S]*?)\s*;?\s*$/);if(!m)fail('unsupported data wrapper');return JSON.parse(m[1]);}

const legacy48={text:'遠方の九十九里を望むコース。詳しい起伏やレイアウトの比較情報は未確認。',url:'https://www.mannacc.com/restaurant/gp-grill',checked:'2026-10-22〜23',basis:'既存掲載情報を項目別に確認'};
const legacyTuples=[{id:48,before:legacy48},{"id":84,"before":{"text":"9ホール・パー27のショートコース。6ホールに照明を完備。","url":"https://dynamic-golf.jp/","checked":"2026-10-22〜23","basis":"既存掲載情報を項目別に確認"}},{"id":85,"before":{"text":"パー4を2ホール含む全12ホールのミッドコース。","url":"https://dynamic-golf.jp/","checked":"2026-10-22〜23","basis":"既存掲載情報を項目別に確認"}},{"id":86,"before":{"text":"9ホール・パー27のショートコース。全ホールに照明を完備。","url":"https://dynamic-golf.jp/","checked":"2026-10-22〜23","basis":"既存掲載情報を項目別に確認"}}];
const sameLegacy=e=>e&&Object.keys(e).length===5&&e.sourceType==='legacy_unclassified'&&legacyTuples.some(({before})=>Object.keys(before).every(k=>e[k]===before[k]));
const nexco=e=>{try{const u=new URL(e.url);return u.protocol==='https:'&&u.hostname==='corp.w-nexco.co.jp'&&!u.port&&!u.username&&!u.password&&/NEXCO西日本/.test(e.text)}catch{return false}};

function validateLegacy(p,today){
 const a=p.after,e=a?.evidenceSegments?.[0],pinned=legacyTuples.find(x=>x.id===p.id)?.before;
 if(a?.sourceType!=='mixed'||!pinned||p.field!=='play'||!eq(p.before,pinned)||!sameLegacy(e)||!eq(e,{...pinned,sourceType:'legacy_unclassified'})||Object.keys(e).length!==5||a.checked!==pinned.checked||a.url!==pinned.url||today<'2026-10-23')fail('unapproved legacy range');
 if(a.evidenceSegments.slice(1).some(s=>s?.text?.trim()===pinned.text.trim()))fail('legacy checked-only duplicate');
}
function validateAfter(p,today){
 if(p.validFrom||p.validThrough){date(p.validFrom);date(p.validThrough);if(p.validFrom>p.validThrough||today<p.validFrom||today>p.validThrough)fail('patch outside validity');}
 if(p.field==='officialUrl'){url(p.after);return;}
 if(p.field==='note'){if(typeof p.after!=='string'||!p.after.trim())fail('invalid note');return;}
 const a=p.after;if(!a||typeof a!=='object'||Array.isArray(a)||typeof a.text!=='string'||!a.text.trim())fail('invalid fact');
 url(a.url);if(a.checked===legacy48.checked)validateLegacy(p,today);else date(a.checked);if(a.checked>today)fail('future checked');
 if(!['official','tourism','booking','review','mixed'].includes(a.sourceType))fail('invalid source type');
 if(a.sourceType==='tourism'&&!/(観光|協会|自治体|市の|県の)/.test(a.text))fail('visible attribution missing');
 if(a.sourceType==='mixed'){
 const es=a.evidenceSegments;if(!Array.isArray(es)||es.length<2)fail('mixed segments missing');
 if(a.priceVerified===true||a.conditions)fail('mixed price or unscoped conditions unsupported');
 for(const [i,e] of es.entries()){if(!e||typeof e.text!=='string'||!e.text.trim()||typeof e.basis!=='string'||!e.basis.trim())fail('mixed statement evidence missing');url(e.url);if(e.checked===legacy48.checked){validateLegacy(p,today);if(i!==0)fail('legacy position');}else date(e.checked);if(e.checked>today)fail('mixed future checked');if(!['official','tourism','booking','review','legacy_unclassified','nexco_west'].includes(e.sourceType))fail('mixed source type');if(e.sourceType==='legacy_unclassified'){validateLegacy(p,today);if(i!==0)fail('legacy position');}if(e.sourceType==='nexco_west'&&!nexco(e))fail('NEXCO provenance');if(e.sourceType==='official'&&new URL(e.url).hostname==='corp.w-nexco.co.jp')fail('road source mislabeled facility');if(e.sourceType==='tourism'&&!/(観光|協会|自治体|市の|県の)/.test(e.text))fail('mixed tourism attribution missing');}
 if(es.map(e=>e.text).join(' ')!==a.text)fail('mixed text scope mismatch');
 if(a.url!==es[0].url||a.checked!==es[0].checked)fail('mixed fallback source mismatch');
 }

 if(a.priceVerified===true){
 const v=p.priceValidation;if(!v||!v.independentlyReviewed)fail('price review missing');
 for(const k of ['weekdays','holesOrRound','style','groupSize','meal','taxes','cart','surcharges'])if(typeof v[k]!=='string'||!v[k].trim())fail('price condition missing: '+k);
 date(v.validFrom);date(v.validThrough);if(v.validFrom>v.validThrough||today<v.validFrom||today>v.validThrough)fail('price outside validity');
 if(!a.conditions||!a.priceLabel)fail('price display conditions missing');
 }
}
export function prepare(raw,m,{currentHead,today}){
 date(today);if(!m||m.baseSha!==currentHead||! /^[0-9a-f]{40}$/.test(currentHead))fail('HEAD conflict');
 if(sha(raw)!==m.inputSha256)fail('input hash conflict');
 if(!Array.isArray(m.allowedIds)||!m.allowedIds.every(Number.isSafeInteger)||new Set(m.allowedIds).size!==m.allowedIds.length)fail('invalid allowed IDs');
 if(!Array.isArray(m.patches)||typeof m.patchSetId!=='string'||!m.patchSetId)fail('invalid manifest');
 const data=parseData(raw), out=structuredClone(data);if(!Array.isArray(data.courses))fail('courses missing');
 const map=new Map();for(const c of out.courses){if(!Number.isSafeInteger(c.id)||map.has(c.id))fail('duplicate/invalid data ID');map.set(c.id,c);}
 const seen=new Set();let changed=0,already=0;
 for(const p of m.patches){
 if(!Number.isSafeInteger(p.id)||!m.allowedIds.includes(p.id)||!map.has(p.id))fail('ID outside allowlist');
 if(!fields.has(p.field))fail('field not allowed');
 const key=p.id+':'+p.field;if(seen.has(key))fail('duplicate field conflict');seen.add(key);
 if(!states.has(p.reviewStatus)||!p.sourceEvidence||typeof p.sourceEvidence!=='object'||!Object.keys(p.sourceEvidence).length)fail('not reviewed');
 if(p.baseSha&&p.baseSha!==m.baseSha)fail('patch base conflict');
 validateAfter(p,today);
 const c=map.get(p.id),top=['note','officialUrl'].includes(p.field),v=top?(c[p.field]??null):(c.comparison?.[p.field]??null);
 if(eq(v,p.after)){already++;continue;}
 if(p.beforeExists!==undefined&&Object.prototype.hasOwnProperty.call(top?c:c.comparison,p.field)!==p.beforeExists)fail('before existence conflict '+key);
 if(!eq(v,p.before))fail('before conflict '+key);
 if(!top){
 if(typeof p.after.basis!=='string'||!p.after.basis.trim())fail('basis missing');
 if(v&&typeof v==='object'&&v.checked!==p.after.checked){
 const omitChecked=x=>Object.fromEntries(Object.entries(x).filter(([k])=>k!=='checked'));
 if(eq(omitChecked(v),omitChecked(p.after)))fail('checked-only refresh forbidden');
 // Metadata edits must not launder a URL check into a fresh factual confirmation.
 const substantive=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!['checked','basis','sourceLabel'].includes(k)));
 if(eq(substantive(v),substantive(p.after)))fail('metadata-only checked refresh forbidden');
 }
 }
 if(top)c[p.field]=p.after;else{if(!c.comparison||typeof c.comparison!=='object')fail('comparison missing');c.comparison[p.field]=p.after;}
 changed++;
 }
 // Patch targets above are the only mutations; IDs/order/untargeted fields retained.
 const text=changed?'const DATA='+JSON.stringify(out)+';\n':raw;
 return {status:changed?'candidate':'no-op',changed,already,output:text,outputSha256:sha(text),patchSetId:m.patchSetId};
}
export function applyLocal({input,manifest,output,headFile,today}){
 // Consumer supplies a freshly verified head marker; this script does not prove remote HEAD.
 const paths=[input,manifest,output,headFile].map(p=>path.resolve(p));
 if(new Set(paths).size!==paths.length)fail('paths must be distinct');
 for(const p of [input,manifest,headFile])if(fs.lstatSync(p).isSymbolicLink())fail('symlink input');
 const head=fs.readFileSync(headFile,'utf8').trim(),raw=fs.readFileSync(input,'utf8');
 const m=JSON.parse(fs.readFileSync(manifest,'utf8'));const r=prepare(raw,m,{currentHead:head,today});
 if(r.status==='no-op')return {...r,output:undefined};
 // Recheck all read inputs before local candidate write. Never overwrite source or old output.
 if(fs.readFileSync(headFile,'utf8').trim()!==head||fs.readFileSync(input,'utf8')!==raw||!eq(JSON.parse(fs.readFileSync(manifest,'utf8')),m))fail('concurrent input conflict');
 const temp=output+'.tmp-'+crypto.randomUUID();let fd;
 try{fd=fs.openSync(temp,'wx',0o600);fs.writeFileSync(fd,r.output);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
 // Same-directory hard link publishes complete local bytes, fails if output exists.
 fs.linkSync(temp,output);
 }finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temp))fs.unlinkSync(temp);}
 return {...r,output:undefined};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,manifest,output,headFile,today,...extra]=process.argv.slice(2);
 try{if(!today||extra.length)fail('usage: node apply-reviewed.mjs INPUT MANIFEST NEW_OUTPUT HEAD_FILE YYYY-MM-DD');console.log(JSON.stringify(applyLocal({input,manifest,output,headFile,today})));}catch(e){console.error(e.message);process.exitCode=1;}
}
