import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT='https://shinjigolfguts-cmd.github.io/golf-guts-japan/';
const fail=m=>{throw new Error(m)};
export function parseData(bytes){
 const s=bytes.toString('utf8');
 const m=/^\s*const\s+DATA\s*=\s*([\s\S]*?)\s*;?\s*$/.exec(s);
 if(!m) fail('data.js must contain only const DATA = JSON');
 let d;try{d=JSON.parse(m[1]);}catch{fail('data.js is not a single JSON literal');}
 if(!d||!Array.isArray(d.courses)||d.courses.length!==1800)fail('expected 1800 courses');
 const ids=d.courses.map(x=>x?.id);
 if(ids.some(x=>!Number.isSafeInteger(x)||x<0)||new Set(ids).size!==ids.length)fail('invalid/duplicate ID');
 return d;
}
export function blobSha(b){return createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');}
// Deliberately restricted to current static HTML, not a browser DOM/security sanitizer.
function tags(html,name){
 const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b([^>]*?)>[\s\S]*?<\/script\s*>/gi,'<script$1></script>');
 const re=new RegExp(`<${name}\\b(?:[^>"']|"[^"]*"|'[^']*')*>`,'gi');
 return [...clean.matchAll(re)].map(m=>{
  const a={};const body=m[0].replace(new RegExp(`^<${name}\\b`,'i'),'').replace(/>$/,'');
  const ar=/([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for(const v of body.matchAll(ar)){const k=v[1].toLowerCase();if(k in a)fail(`duplicate ${k} attribute`);a[k]=v[2]??v[3]??v[4]??'';}return a;
 });
}
export function validate(dir,{baseline}={}){
 const bytes=readFileSync(join(dir,'data.js'));const d=parseData(bytes);const hash=blobSha(bytes);
 for(const page of ['index.html','find.html']){
  const html=readFileSync(join(dir,page),'utf8');
  const sources=tags(html,'script').filter(a=>a.src&&/data\.js(?:[?#]|$)/i.test(a.src));
  if(sources.length!==1||sources[0].src!==`data.js?v=${hash}`)fail(`${page}: unique data.js?v=Git-blob-SHA required`);
  const canon=tags(html,'link').filter(a=>a.rel?.toLowerCase().split(/\s+/).includes('canonical'));
  const expected=ROOT+(page==='index.html'?'':'find.html');
  if(canon.length!==1||canon[0].href!==expected)fail(`${page}: canonical mismatch/duplicate`);
 }
 const xml=readFileSync(join(dir,'sitemap.xml'),'utf8');
 // Strict accepted sitemap grammar: only existing two url/loc nodes; no DTD/entities/extensions.
 const body=xml.replace(/^\s*<\?xml\s+[^?]+\?>\s*/,'').trim();
 const match=/^<urlset\s+xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">([\s\S]*)<\/urlset>$/.exec(body);
 if(!match)fail('invalid sitemap envelope');
 const urls=[...match[1].matchAll(/<url>\s*<loc>([^<>&]+)<\/loc>\s*<\/url>/g)].map(m=>m[1]);
 const residue=match[1].replace(/<url>\s*<loc>([^<>&]+)<\/loc>\s*<\/url>/g,'').trim();
 if(residue||urls.length!==2||new Set(urls).size!==2||!urls.includes(ROOT)||!urls.includes(ROOT+'find.html'))fail('sitemap must contain only the two existing URLs');
 let orderingGate='not_requested';
 if(baseline){
  const old=parseData(readFileSync(baseline));
  if(JSON.stringify(old.courses.map(c=>c.id))!==JSON.stringify(d.courses.map(c=>c.id)))fail('baseline ID order changed');
  // Global ranking structure is categories in this schema. Also protect explicit ranking/rank fields if present.
  const ranked=x=>Object.fromEntries(Object.entries(x).filter(([k])=>k==='categories'||/rank|ranking/i.test(k)));
  if(JSON.stringify(ranked(old))!==JSON.stringify(ranked(d)))fail('global ranking/categories changed');
  for(let i=0;i<d.courses.length;i++)if(JSON.stringify(ranked(old.courses[i]))!==JSON.stringify(ranked(d.courses[i])))fail('course rank changed');
  orderingGate='passed';
 }
 return {ok:true,courses:1800,dataGitBlobSha:hash,pages:['index.html','find.html'],sitemapUrls:urls,orderingGate};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);if(!args.length||!(args.length===1||(args.length===3&&args[1]==='--baseline')))fail('usage: node validate-publication.mjs DIR [--baseline OLD_DATA_JS]');
  console.log(JSON.stringify(validate(resolve(args[0]),{baseline:args[2]}),null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
