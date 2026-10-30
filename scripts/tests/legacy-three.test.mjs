import test from 'node:test';import a from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {prepare,sha} from '../apply-reviewed.mjs';
const pins=[{"id": 84, "before": {"text": "9ホール・パー27のショートコース。6ホールに照明を完備。", "url": "https://dynamic-golf.jp/", "checked": "2026-10-22〜23", "basis": "既存掲載情報を項目別に確認"}}, {"id": 85, "before": {"text": "パー4を2ホール含む全12ホールのミッドコース。", "url": "https://dynamic-golf.jp/", "checked": "2026-10-22〜23", "basis": "既存掲載情報を項目別に確認"}}, {"id": 86, "before": {"text": "9ホール・パー27のショートコース。全ホールに照明を完備。", "url": "https://dynamic-golf.jp/", "checked": "2026-10-22〜23", "basis": "既存掲載情報を項目別に確認"}}];
const head='1'.repeat(40),today='2026-10-30';
const c={window:{},URL};vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('../../access.js',import.meta.url),'utf8'),c);const render=f=>c.window.gutsEvidenceSegmentsHtml(f);
function patch(pin){const old={...pin.before,sourceType:'legacy_unclassified'},fresh={text:'新段落のテスト。',url:'https://dynamic-golf.jp/test/',checked:today,sourceType:'official',basis:'synthetic only'};return {id:pin.id,field:'play',before:structuredClone(pin.before),after:{text:old.text+' '+fresh.text,url:old.url,checked:old.checked,basis:'文別',sourceType:'mixed',evidenceSegments:[old,fresh]},reviewStatus:'supported',sourceEvidence:{fixture:true}}}
function gate(p,opts={}){const raw='const DATA='+JSON.stringify({courses:[{id:p.id,comparison:{[p.field]:opts.before??p.before}}]})+';';return prepare(raw,{baseSha:head,inputSha256:sha(raw),allowedIds:[p.id],patchSetId:'test',patches:[p]},{currentHead:head,today:opts.today??today});}
function sync(p){p.after.text=p.after.evidenceSegments.map(x=>x.text).join(' ')}
for(const pin of pins){
 test(pin.id+' exact old tuple supported',()=>{const p=patch(pin);a.equal(gate(p).changed,1);const h=render(p.after);a.match(h,/既存掲載情報・出典分類未確認/);a.match(h,/2026-10-22〜23/);a.match(h,/2026-10-30/);a(!h.includes('finder-unconfirmed'));});
 for(const k of ['text','url','checked','basis'])test(pin.id+' reject changed '+k,()=>{const p=patch(pin);p.after.evidenceSegments[0][k]+='x';sync(p);a.throws(()=>gate(p));a.match(render(p.after),/finder-unconfirmed/)});
 for(const [name,mut] of [
 ['unregistered ID',p=>p.id=999],['wrong field',p=>p.field='stay'],['price field',p=>p.field='budget'],
 ['before extra key',p=>p.before.extra=true],['segment extra key',p=>p.after.evidenceSegments[0].extra=true],
 ['before classified',p=>p.before.sourceType='official'],['official promotion',p=>p.after.evidenceSegments[0].sourceType='official'],
 ['missing legacy type',p=>delete p.after.evidenceSegments[0].sourceType],['not first',p=>p.after.evidenceSegments.reverse()],
 ['fallback date',p=>p.after.checked=today],['fallback URL',p=>p.after.url='https://example.test/'],
 ['new range',p=>p.after.evidenceSegments[1].checked=pin.before.checked],['new future',p=>p.after.evidenceSegments[1].checked='2099-01-01'],
 ['new invalid date',p=>p.after.evidenceSegments[1].checked='2026-02-30'],['new reversed range',p=>p.after.evidenceSegments[1].checked='2026-10-23〜22'],
 ['checked-only duplication',p=>p.after.evidenceSegments[1].text=pin.before.text],['mixed price',p=>p.after.priceVerified=true],['mixed conditions',p=>p.after.conditions={}],
 ['tuple exchange',p=>{p.after.evidenceSegments[0]={...pins.find(x=>x.id!==pin.id).before,sourceType:'legacy_unclassified'}}]
 ])test(pin.id+' '+name+' rejected',()=>{const p=patch(pin);mut(p);sync(p);a.throws(()=>gate(p))});
 test(pin.id+' old date not reached',()=>a.throws(()=>gate(patch(pin),{today:'2026-10-22'})));
 test(pin.id+' exact source actual before mismatch',()=>{const p=patch(pin);a.throws(()=>gate(p,{before:{...pin.before,text:'wrong'}}))});
}
