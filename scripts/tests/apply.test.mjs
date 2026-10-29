import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {prepare,applyLocal,sha,parseData} from '../apply-reviewed.mjs';
const head='1'.repeat(40),today='2026-10-29';
const raw='const DATA='+JSON.stringify({courses:[{id:1,name:'保持',comparison:{rail:null},note:'保持'}]})+';';
const fact={text:'駅から車10分。',url:'https://example.com/access',checked:today,sourceType:'official',basis:'independently reviewed fixture'};
function manifest(){return{baseSha:head,inputSha256:sha(raw),patchSetId:'test1',allowedIds:[1],patches:[{id:1,field:'rail',before:null,after:{...fact},reviewStatus:'supported',sourceEvidence:{record:'reviewed fixture'}}]}}
function run(m=manifest(),r=raw){return prepare(r,m,{currentHead:head,today})}
test('valid change preserves non-target content and source bytes',()=>{const r=run();assert.equal(r.changed,1);const d=parseData(r.output);assert.equal(d.courses[0].name,'保持');assert.equal(d.courses[0].note,'保持');assert.deepEqual(d.courses[0].comparison.rail,fact)});
test('empty no-op leaves exact bytes',()=>{const m=manifest();m.patches=[];assert.equal(run(m).output,raw)});
test('idempotent after-equal no-op',()=>{const r=run();const m=manifest();m.inputSha256=sha(r.output);assert.equal(run(m,r.output).status,'no-op')});
for(const [name,mutate] of [
 ['different before',m=>m.patches[0].before={text:'stale'}],['HEAD conflict',m=>m.baseSha='2'.repeat(40)],['hash conflict',m=>m.inputSha256='bad'],['unknown ID',m=>m.patches[0].id=2],['unpermitted field',m=>m.patches[0].field='__proto__'],['held',m=>m.patches[0].reviewStatus='hold'],['missing evidence',m=>m.patches[0].sourceEvidence={}],['duplicate conflicting target',m=>m.patches.push({...m.patches[0],after:{...fact,text:'different'}})],['unsafe URL',m=>m.patches[0].after={...fact,url:'javascript:alert(1)'}],['future checked',m=>m.patches[0].after={...fact,checked:'2026-10-30'}],['tourism invisible',m=>m.patches[0].after={...fact,sourceType:'tourism'}],['expired note',m=>{m.patches[0]={...m.patches[0],field:'note',before:'保持',after:'変更',validFrom:'2026-10-01',validThrough:'2026-10-28'}}],
 ])test(name+' fails',()=>{let m=manifest();mutate(m);assert.throws(()=>run(m))});
function price(){let m=manifest();m.patches[0].field='budget';m.patches[0].after={...fact,priceVerified:true,priceLabel:'例',conditions:'条件'};m.patches[0].priceValidation={independentlyReviewed:true,validFrom:'2026-10-01',validThrough:'2026-10-31',weekdays:'平日',holesOrRound:'1R',style:'セルフ',groupSize:'4B',meal:'昼食付',taxes:'両税込',cart:'込',surcharges:'2B1100'};return m}
test('complete scoped price accepted',()=>assert.equal(run(price()).changed,1));
test('missing price surcharge rejected',()=>{let m=price();delete m.patches[0].priceValidation.surcharges;assert.throws(()=>run(m))});
test('expired price rejected',()=>{let m=price();m.patches[0].priceValidation.validThrough='2026-10-28';assert.throws(()=>run(m))});
test('future rate rejected',()=>{let m=price();m.patches[0].priceValidation.validFrom='2026-11-01';m.patches[0].priceValidation.validThrough='2026-11-30';assert.throws(()=>run(m))});
test('local failure/no-op never creates output; source unchanged; output collision unchanged',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'safe-patch-'));const input=path.join(dir,'data.js'),mf=path.join(dir,'manifest.json'),out=path.join(dir,'candidate.js'),hf=path.join(dir,'HEAD');fs.writeFileSync(input,raw);fs.writeFileSync(hf,head);
 const invoke=m=>{fs.writeFileSync(mf,JSON.stringify(m));return applyLocal({input,manifest:mf,output:out,headFile:hf,today})};
 let m=manifest();m.patches[0].before='wrong';assert.throws(()=>invoke(m));assert.ok(!fs.existsSync(out));
 m=manifest();m.patches=[];assert.equal(invoke(m).status,'no-op');assert.ok(!fs.existsSync(out));
 invoke(manifest());const candidate=fs.readFileSync(out,'utf8');assert.throws(()=>invoke(manifest()));assert.equal(fs.readFileSync(out,'utf8'),candidate);assert.equal(fs.readFileSync(input,'utf8'),raw);fs.rmSync(dir,{recursive:true});
});

test('changed fact needs nonempty basis',()=>{const m=manifest();delete m.patches[0].after.basis;assert.throws(()=>run(m));m.patches[0].after={...fact,basis:' '};assert.throws(()=>run(m))});
test('checked-only and metadata-disguised refresh rejected',()=>{
 const before={...fact,checked:'2026-10-28',basis:'prior review'};
 const r='const DATA='+JSON.stringify({courses:[{id:1,comparison:{rail:before}}]})+';';
 for(const a of [{...before,checked:today},{...before,checked:today,basis:'URL200'}]){
 const m=manifest();m.inputSha256=sha(r);m.patches[0].before=before;m.patches[0].after=a;assert.throws(()=>run(m,r));
 }
});
function mixed(){const m=manifest(),s1={...fact,text:'旧予約情報。',checked:'2026-10-25',sourceType:'booking',url:'https://example.com/old'},s2={...fact,text:'新公式情報。'};m.patches[0].after={...s1,sourceType:'mixed',text:s1.text+' '+s2.text,evidenceSegments:[s1,s2],basis:'文単位の別出典'};return m;}
test('mixed statements preserve distinct sources and dates',()=>assert.equal(run(mixed()).changed,1));
for(const [n,mut] of [['missing',m=>delete m.patches[0].after.evidenceSegments],['scope mismatch',m=>m.patches[0].after.text='all newly verified'],['unsafe segment',m=>m.patches[0].after.evidenceSegments[1].url='javascript:alert(1)'],['future segment',m=>m.patches[0].after.evidenceSegments[1].checked='2026-10-30'],['no segment basis',m=>delete m.patches[0].after.evidenceSegments[1].basis],['misleading fallback date',m=>m.patches[0].after.checked='2026-10-29'],['unscoped condition',m=>m.patches[0].after.conditions='hidden scope'],['verified mixed price',m=>m.patches[0].after.priceVerified=true]])test('mixed rejects '+n,()=>{let m=mixed();mut(m);assert.throws(()=>run(m));});
test('missing property differs from explicit null preimage when declared',()=>{let m=manifest();m.patches[0].beforeExists=false;assert.throws(()=>run(m));m.patches[0].beforeExists=true;assert.equal(run(m).changed,1);});
