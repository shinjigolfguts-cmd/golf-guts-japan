import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export const EXPECTED = Object.freeze({1081:18,555:18,1159:27,238:36,522:36,1136:27,1799:27});
// Deliberately parse JSON, never evaluate data.js or accept trailing executable code.
export function parseData(source) {
  const m = /^\s*const\s+DATA\s*=\s*([\s\S]*?)\s*;?\s*$/.exec(source);
  if (!m) throw new Error('Expected const DATA = JSON; only');
  return JSON.parse(m[1]);
}
function strings(value, path='$', out=[]) {
  if (typeof value === 'string') out.push([path,value]);
  else if (value && typeof value === 'object') for (const [k,v] of Object.entries(value)) strings(v,`${path}.${k}`,out);
  return out;
}
export function check(data) {
  if (!data || !Array.isArray(data.courses)) throw new Error('courses must be an array');
  const errors=[];
  for (const [id,total] of Object.entries(EXPECTED)) {
    const matches=data.courses.filter(r=>r && String(r.id)===id);
    if (matches.length!==1 || matches[0].id!==Number(id)) { errors.push(`${id}: missing, duplicate, or non-numeric ID`); continue; }
    const r=matches[0];
    for (const field of ['play', ...(['1159','1799'].includes(id)?['feature']:[])]) {
      const text=field==='play'?r.comparison?.play?.text:r.feature;
      // This is a scoped regression invariant, not a generic language/total inference engine.
      if (typeof text!=='string' || !new RegExp(`計${total}ホール`).test(text)) errors.push(`${id}.${field}: reviewed explicit total ${total} missing; human review required`);
      const stated=[...String(text).matchAll(/計(\d+)ホール/g)].map(m=>Number(m[1]));
      if(stated.some(n=>n!==total)) errors.push(`${id}.${field}: conflicting explicit total`);
    }
    for (const [path,text] of strings(r)) if (/(?<![0-9０-９])9ホールのコース。/.test(text)) errors.push(`${id}${path}: obsolete total-9 sentence remains`);
  }
  return {ok:errors.length===0,scope:'7 reviewed IDs only; 7 play + 2 feature totals',errors};
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if(process.argv.length!==3) throw new Error('Usage: node check-hole-counts.mjs /path/to/data.js');
    const result=check(parseData(readFileSync(process.argv[2],'utf8')));
    process.stdout.write(JSON.stringify(result,null,2)+'\n'); process.exitCode=result.ok?0:1;
  } catch(e) { process.stderr.write(`ERROR: ${e.message}\n`); process.exitCode=1; }
}
