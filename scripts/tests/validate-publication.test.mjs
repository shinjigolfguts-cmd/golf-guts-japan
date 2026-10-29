import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validate,blobSha,parseData} from '../validate-publication.mjs';
const ROOT='https://shinjigolfguts-cmd.github.io/golf-guts-japan/';
const minimalData={courses:Array.from({length:1800},(_,id)=>({id,name:`Course ${id}`})),categories:[{id:'a',courseIds:[0,1]},{id:'b',courseIds:[2,3]}]};
const dataBytes=Buffer.from('const DATA='+JSON.stringify(minimalData)+';');
const hash=blobSha(dataBytes);
const synthetic={
 'data.js':dataBytes,
 'index.html':`<!doctype html><html><head><link rel="canonical" href="${ROOT}"></head><body><script src="data.js?v=${hash}"></script></body></html>`,
 'find.html':`<!doctype html><html><head><link rel="canonical" href="${ROOT}find.html"></head><body><script src="data.js?v=${hash}"></script></body></html>`,
 'sitemap.xml':`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${ROOT}</loc></url><url><loc>${ROOT}find.html</loc></url></urlset>`
};
const files=['data.js','index.html','find.html','sitemap.xml'];
function fixture(t){const d=mkdtempSync(join(tmpdir(),'publication-gate-'));t.after(()=>rmSync(d,{recursive:true,force:true}));for(const [name,content] of Object.entries(synthetic))writeFileSync(join(d,name),content);writeFileSync(join(d,'baseline.js'),dataBytes);return d;}
function edit(d,f,fn){writeFileSync(join(d,f),fn(readFileSync(join(d,f),'utf8')));}
function snapshot(d){return files.map(f=>readFileSync(join(d,f)).toString('base64'));}
function rejected(t,mutate,pattern){const d=fixture(t);mutate(d);const before=snapshot(d);assert.throws(()=>validate(d),pattern);assert.deepEqual(snapshot(d),before);}
function rewriteData(d,fn){const x=parseData(readFileSync(join(d,'data.js')));fn(x);writeFileSync(join(d,'data.js'),'const DATA='+JSON.stringify(x)+';');}
function syncHashes(d){const hash=blobSha(readFileSync(join(d,'data.js')));for(const f of ['index.html','find.html'])edit(d,f,s=>s.replace(/data\.js\?v=[a-f0-9]+/g,'data.js?v='+hash));}
test('valid synthetic fixture; no mutation; baseline gate',t=>{const d=fixture(t),before=snapshot(d);const r=validate(d,{baseline:join(d,'baseline.js')});assert.equal(r.courses,1800);assert.equal(r.orderingGate,'passed');assert.deepEqual(snapshot(d),before);});
test('old hashes in both HTML fail',t=>rejected(t,d=>{for(const f of ['index.html','find.html'])edit(d,f,s=>s.replace(/data\.js\?v=[a-f0-9]+/g,'data.js?v='+'0'.repeat(40)));},/Git-blob/));
test('one missed HTML hash fails',t=>rejected(t,d=>edit(d,'find.html',s=>s.replace(/data\.js\?v=[a-f0-9]+/g,'data.js?v='+'0'.repeat(40))),/find.html/));
test('multiple data script src fails',t=>rejected(t,d=>edit(d,'index.html',s=>s+'<script src="data.js?v=x"></script>'),/unique/));
test('duplicate IDs fail',t=>rejected(t,d=>rewriteData(d,x=>{x.courses[1].id=x.courses[0].id;}),/duplicate ID/));
test('missing course fails',t=>rejected(t,d=>rewriteData(d,x=>x.courses.pop()),/1800/));
test('JS executable suffix not evaluated',t=>rejected(t,d=>edit(d,'data.js',s=>s+'globalThis.TEST_SENTINEL=1;'),/JSON literal/));
test('duplicate canonical fails',t=>rejected(t,d=>edit(d,'find.html',s=>s+'<link rel="canonical" href="https://example.com/">'),/canonical/));
test('wrong canonical fails',t=>rejected(t,d=>edit(d,'index.html',s=>s.replace('rel="canonical" href="https://shinjigolfguts-cmd.github.io/golf-guts-japan/"','rel="canonical" href="https://example.com/"')),/canonical/));
test('additional sitemap URL fails',t=>rejected(t,d=>edit(d,'sitemap.xml',s=>s.replace('</urlset>','<url><loc>https://example.com/</loc></url></urlset>')),/two existing/));
test('sitemap malformed closing tag fails',t=>rejected(t,d=>edit(d,'sitemap.xml',s=>s.replace('</urlset>','</urlsetX>')),/envelope/));
test('ID order is separate optional gate',t=>{const d=fixture(t);rewriteData(d,x=>{[x.courses[0],x.courses[1]]=[x.courses[1],x.courses[0]];});syncHashes(d);assert.equal(validate(d).ok,true);assert.throws(()=>validate(d,{baseline:join(d,'baseline.js')}),/ID order/);});
test('global categories is separate optional gate',t=>{const d=fixture(t);rewriteData(d,x=>{x.categories.reverse();});syncHashes(d);assert.equal(validate(d).ok,true);assert.throws(()=>validate(d,{baseline:join(d,'baseline.js')}),/ranking/);});
test('CLI rejects and leaves inputs unchanged',t=>{const d=fixture(t);edit(d,'find.html',s=>s.replace(/data\.js\?v=[a-f0-9]+/,'data.js?v=old'));const before=snapshot(d);const r=spawnSync(process.execPath,[fileURLToPath(new URL('../validate-publication.mjs',import.meta.url)),d],{encoding:'utf8'});assert.equal(r.status,1);assert.deepEqual(snapshot(d),before);});
