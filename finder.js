/* Preserve the requested prefecture; rank other preferences and disclose mismatches. */
(()=>{'use strict';
const root=document.getElementById('course-finder');
const questions=[
 {key:'area',title:'どのあたりへ？',hint:'行きたいエリアを、ひとつ。',options:[['','全国おまかせ'],...REGIONS.flatMap(r=>r[1].map(([name])=>[name,name]))]},
 {key:'travel',title:'どうやって行く？',hint:'移動手段を、おすすめ順に反映します。',options:[['car','車で'],['train','電車で'],['either','どちらでも']]},
 {key:'style',title:'どんな一日に？',hint:'今の気分に近いコースを優先します。',options:[['beginner','はじめてのラウンド'],['casual','短時間・夜も楽しむ'],['relax','泊まりも楽しむ'],['challenge','腕を試す']]},
 {key:'priority',title:'大切にしたいのは？',hint:'いちばん惹かれるものを、ひとつ。',options:[['scenery','景色'],['food','食事'],['budget','予算'],['access','行きやすさ']]}
];
const memberships=DATA.categories.map(c=>new Set(c.ids));
const styleCategory={beginner:0,casual:8,relax:7,challenge:9};
const priorityCategory={scenery:6,food:2,budget:1,access:4};
const answers={};let step=0,chosen=null,results=[],advanceTimer=null,view="welcome",revision=0;
const stateKey='guts-japan-finder-progress-v1';
function persist(){try{sessionStorage.setItem(stateKey,JSON.stringify({answers,step,view}))}catch{}}
function cancelAdvance(){clearTimeout(advanceTimer);advanceTimer=null;revision++;}
function advance(){cancelAdvance();if(answers[questions[step].key]===undefined)return;if(step<3){step++;showQuestion()}else{showResults()}}
const welcome=root.querySelector('.finder-welcome'),quiz=root.querySelector('.finder-quiz'),result=root.querySelector('.finder-results');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=s=>/^https?:\/\//i.test(s||'')?esc(s):'#';
function scrollTo(e){e.scrollIntoView({behavior:'instant',block:'start'})}
function label(key){return questions.find(q=>q.key===key).options.find(o=>o[0]===answers[key])?.[1]||''}
function categoryReason(cat,id){const i=DATA.categories[cat].ids.indexOf(id);return i<0?'':DATA.categories[cat].reasons?.[i]||DATA.courses.find(x=>x.id===id)?.feature||''}
function selectCourses(a){
 const sc=styleCategory[a.style],pc=a.priority==='access'&&a.travel==='train'?5:priorityCategory[a.priority];
 return DATA.courses.filter(x=>!x.unavailable&&(!a.area||x.area.startsWith(a.area))).map(x=>{
  const primary=memberships[pc].has(x.id),style=memberships[sc].has(x.id),rail=memberships[5].has(x.id);
  const priced=x.comparison?.budget?.priceVerified===true;
  const detailKey={budget:'budget',food:'dining',scenery:'scenery',access:a.travel==='train'?'rail':'car'}[a.priority];
  const detail=x.comparison?.[detailKey];
  const detailed=a.priority==='budget'?priced:!!(detail?.text&&detail?.url)&&(a.priority!=='food'||!!(detail.dish||detail.sourceType==='review')); 
  const completeness=['play','car','rail','scenery','dining','budget','stay'].filter(k=>x.comparison?.[k]?.text).length;
  const gaps=[];
  if(a.travel==='train'&&!rail)gaps.push('駅からの車・タクシー移動も含めてご確認ください。');
  if(!style)gaps.push({beginner:'初心者向けの掲載カテゴリには含まれていません。',casual:'短時間・夜間プランの有無は公式案内をご確認ください。',relax:'宿泊付きで楽しめるかは公式案内をご確認ください。',challenge:'本格コースの掲載カテゴリには含まれていません。'}[a.style]);
  if(!primary&&!detailed)gaps.push('「'+{scenery:'景色',food:'食事',budget:'予算',access:'行きやすさ'}[a.priority]+'」の掲載カテゴリ以外からも候補を選んでいます。');
  const score=(detailed?1000:0)+completeness*20+(a.travel==='train'&&rail?200:0)+(style?(a.style==='beginner'?150:60):0)+(primary?100:0)+(primary?Math.max(0,20-DATA.categories[pc].ids.indexOf(x.id)):0);
  return {course:x,primary,style,rail,priced,detailed,gaps,score};
 }).sort((a,b)=>b.score-a.score||a.course.id-b.course.id).slice(0,4);
}
// Keep question controls mounted: no removal of a focused radio during a touch event.
function areaOptions(){return `<div class="finder-region-picker"><button type="button" class="finder-option" data-answer="" aria-pressed="false"><span>全国おまかせ</span></button>${REGIONS.map(([name])=>`<button type="button" class="finder-option" data-region="${esc(name)}"><span>${esc(name)} →</span></button>`).join('')}</div><div class="finder-pref-picker" hidden><button type="button" class="finder-secondary" data-region-back>地方を選び直す</button>${REGIONS.map(([name,prefs])=>`<div data-pref-region="${esc(name)}" hidden><p class="finder-label">${esc(name)}</p><div class="finder-options">${prefs.map(([p])=>`<button type="button" class="finder-option" data-answer="${esc(p)}" aria-pressed="false"><span>${esc(p)}</span></button>`).join('')}</div></div>`).join('')}</div>`}
function mountQuestions(){
 quiz.innerHTML=questions.map((q,n)=>`<section data-question="${n}" hidden><div class="finder-stepbar"><span>QUESTION ${String(n+1).padStart(2,'0')} / 04</span><div class="finder-progress" aria-hidden="true">${questions.map((_,i)=>`<span class="${i<=n?'complete':''}"></span>`).join('')}</div></div><fieldset><legend tabindex="-1">${q.title}</legend><p class="finder-hint">${q.hint}</p>${n===0?areaOptions():`<div class="finder-options">${q.options.map(([v,t])=>`<button type="button" class="finder-option" data-answer="${esc(v)}" aria-pressed="false"><span>${t}</span></button>`).join('')}</div>`}</fieldset><div class="finder-actions"><button class="finder-secondary" type="button" data-back>${n?'ひとつ戻る':'閉じる'}</button><button class="finder-primary" type="button" data-next disabled>${n===3?'４コースを見る ↗':'次へ →'}</button></div></section>`).join('');
 quiz.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button||view!=='quiz')return;
  const panel=button.closest('[data-question]');if(!panel||Number(panel.dataset.question)!==step)return;
  if(button.hasAttribute('data-region')){cancelAdvance();delete answers.area;persist();updateSelection(panel);panel.querySelector('.finder-region-picker').hidden=true;panel.querySelector('.finder-pref-picker').hidden=false;panel.querySelectorAll('[data-pref-region]').forEach(e=>e.hidden=e.dataset.prefRegion!==button.dataset.region);return;}
  if(button.hasAttribute('data-region-back')){cancelAdvance();delete answers.area;persist();updateSelection(panel);panel.querySelector('.finder-region-picker').hidden=false;panel.querySelector('.finder-pref-picker').hidden=true;return;}
  if(button.hasAttribute('data-answer')){
   answers[questions[step].key]=button.dataset.answer;persist();updateSelection(panel);
   cancelAdvance();const token=revision,selectedStep=step;
   if(document.getElementById('auto-advance')?.checked===false)return;
   advanceTimer=setTimeout(()=>{if(token===revision&&step===selectedStep&&view==='quiz')advance()},350);
  }else if(button.hasAttribute('data-back')){
   cancelAdvance();if(step){step--;showQuestion()}else{view='welcome';persist();quiz.hidden=true;welcome.hidden=false;root.classList.remove('finder-active')}
  }else if(button.hasAttribute('data-next'))advance();
 });
}
function updateSelection(panel){panel.querySelectorAll('[data-answer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.answer===answers[questions[step].key])));panel.querySelector('[data-next]').disabled=answers[questions[step].key]===undefined;}
function showQuestion(){
 cancelAdvance();view='quiz';persist();root.classList.add('finder-active');welcome.hidden=true;quiz.hidden=false;result.hidden=true;
 quiz.querySelectorAll('[data-question]').forEach(panel=>{panel.hidden=Number(panel.dataset.question)!==step;if(!panel.hidden)updateSelection(panel)});
 // Reserve the largest question height so later steps do not move the page.
 quiz.style.minHeight=step===0?'':Math.max(400,quiz.getBoundingClientRect().height)+'px';
}
mountQuestions();
const autoControl=document.getElementById('auto-advance');
if(autoControl){try{autoControl.checked=sessionStorage.getItem('guts-japan-finder-auto')!=='off'}catch{}autoControl.onchange=()=>{cancelAdvance();try{sessionStorage.setItem('guts-japan-finder-auto',autoControl.checked?'on':'off')}catch{}}}

function mini(x,i){return `<div class="finder-cell-top"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(x.name)}</span></div>`}
function fit(r){const bits=[];if(r.primary)bits.push(label('priority'));else if(r.detailed)bits.push({budget:'予算目安あり',food:'食事情報あり',scenery:'景色を楽しむ',access:'アクセス情報あり'}[answers.priority]);if(r.style)bits.push(label('style'));if(answers.travel==='train'&&r.rail)bits.push('電車で');return bits.join(' · ')||'エリアから選んだ候補'}
function fact(x,key){return x.comparison?.[key]||null}
const missing={scenery:'景観の具体的な情報は不明です。公式コースガイドをご確認ください。',play:'プレーの特徴は未確認です。コースの起伏・距離・レイアウトは公式ガイドでご確認ください。',car:'車での経路は公式アクセス案内をご覧ください。',rail:'駅からの経路は公式アクセス案内をご覧ください。',dining:'現在のメニュー・提供条件は不明です。公式サイトでご確認ください。',stay:'宿泊・お風呂の利用条件は不明です。公式施設案内をご確認ください。',budget:'現在の適用料金は不明です。日程やプランによって変わるため、予約先でご確認ください。'};
function fieldSourceLabel(f,key){if(f.sourceType==='review')return '口コミを見る';if(f.sourceType==='booking'||/booking\.gora\.golf\.rakuten\.co\.jp/.test(f.url||''))return '予約サイトの施設案内を見る';return key==='dining'?(f.dish?'公式メニューを見る':'食事の案内を見る'):key==='scenery'?'コース紹介を見る':'根拠の案内'}
function field(x,key){const f=fact(x,key);if(f?.sourceType==='mixed')return window.gutsEvidenceSegmentsHtml(f);return f?`<p>${esc(f.text)}</p><a class="finder-source" href="${safeUrl(f.url)}" target="_blank" rel="noopener noreferrer">${fieldSourceLabel(f,key)} ↗</a>${key==='dining'&&(f.dish||f.sourceType==='review')?`<p class="finder-note">${f.sourceType==='review'?'楽天GORA利用者の感想です。':'掲載メニューは一例です。提供内容は日程により変わります。'}</p>`:''}<p class="finder-note">情報確認：${esc(f.checked)}</p>`:`<p class="finder-unconfirmed">${missing[key]}</p>${key==='dining'||key==='stay'||key==='scenery'||key==='budget'?`<a class="finder-official finder-source" href="${safeUrl(x.officialUrl||x.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(x.name)}の確認先を見る">${x.officialUrl?'公式サイトを見る':'掲載元で確認'} ↗</a>`:''}`}
function reason(r){const x=r.course;if(answers.priority==='food'&&fact(x,'dining'))return fact(x,'dining').text;if(answers.priority==='budget'&&fact(x,'budget')?.priceVerified)return fact(x,'budget').text;if(answers.priority==='scenery'&&fact(x,'scenery'))return fact(x,'scenery').text;if(answers.priority==='access'){const preferred=answers.travel==='train'?'rail':'car';return [fact(x,preferred)?.text,fact(x,preferred==='car'?'rail':'car')?.text].filter(Boolean).join(' ');}if(r.primary){if(answers.priority==='food')return fact(x,'dining')?.text||'食事カテゴリの掲載コース。最新のメニューは公式案内で確認。';if(answers.priority==='budget')return fact(x,'budget')?.text||'予算カテゴリの掲載コース。予約日の具体的な料金は未確認。';return categoryReason(6,x.id)}if(!r.style)return '希望のエリア内で比較できるコース。条件に合う点と確認したい点を見比べてください。';if(answers.style==='relax')return fact(x,'stay')?.text||'宿泊カテゴリの掲載コース。';if(answers.style==='challenge')return fact(x,'play')?.text||'コースの特徴は未確認です。';return categoryReason(styleCategory[answers.style],x.id)||'楽しみ方のカテゴリを参考にした候補です。'}
function budgetSummary(x){const f=fact(x,'budget');return f?.sourceType==='mixed'?window.gutsEvidenceSegmentsHtml(f):f?.priceVerified?`<div class="finder-budget"><p class="finder-budget-label">１名あたりの掲載料金</p><p class="finder-budget-amount">${esc(f.priceLabel)}</p><p>${esc(f.conditions||f.text)}</p><p class="finder-note">日程やプランによって料金が変わります。詳しくはリンク先の料金・プランをご覧ください。</p><p class="finder-note">情報確認：${esc(f.checked)}</p><a class="finder-source" href="${safeUrl(f.url)}" target="_blank" rel="noopener noreferrer">${f.sourceType==='booking'?'掲載料金・プランを見る':'公式料金・プランを見る'} ↗</a></div>`:''}
function section(title,content){return `<section class="finder-compare"><h3>${title}</h3>${title==='景色・ロケーション'?'<p class="finder-note">ゴルフ場・自治体の紹介や予約サイトの施設案内をもとに掲載。眺望や花・紅葉の見頃は、天候・季節によって変わります。</p>':''}<div class="finder-cells">${results.map((r,i)=>`<div class="finder-cell">${mini(r.course,i)}${content(r,i)}</div>`).join('')}</div></section>`}
function showResults(){cancelAdvance();view="results";persist();root.classList.remove('finder-active');results=selectCourses(answers);chosen=null;welcome.hidden=true;quiz.hidden=true;result.hidden=false;
 const title=results.length===4?'希望から選ぶ、４つのコース。':results.length?`今回の候補は、${results.length}コース。`:'条件を、少し変えてみませんか。';
 result.innerHTML=`<div class="finder-results-head"><div><p class="finder-label">YOUR COURSE SELECTION</p><h2 tabindex="-1">${title}</h2></div><div class="finder-result-actions"><button class="finder-secondary" data-last>ひとつ戻る</button><button class="finder-secondary" data-edit>条件を変える</button></div></div><div class="finder-chips">${questions.map(q=>`<span class="finder-chip">${esc(label(q.key))}</span>`).join('')}</div>`;
 result.querySelector('[data-last]').onclick=()=>{step=3;showQuestion();scrollTo(root)};
 result.querySelector('[data-edit]').onclick=()=>{step=0;showQuestion();scrollTo(root)};
 if(!results.length){result.insertAdjacentHTML('beforeend',`<div class="finder-empty"><p>掲載情報から、この条件に合うコースを選びきれませんでした。<br>エリアや移動手段を広げて、もう一度。</p>${answers.area?'<button class="finder-primary" data-widen-area>全国で探す</button>':''}${answers.travel==='train'?'<button class="finder-secondary" data-widen-travel>移動手段を広げる</button>':''}<p class="finder-note">掲載のないコースや、未確認の条件は候補に含めていません。</p></div>`);result.querySelector('[data-widen-area]')?.addEventListener('click',()=>{answers.area='';showResults()});result.querySelector('[data-widen-travel]')?.addEventListener('click',()=>{answers.travel='either';showResults()});scrollTo(root);return;}
 const someMiss=results.some(r=>r.gaps.length);
 if(answers.priority==='budget')result.insertAdjacentHTML('beforeend','<p class="finder-note">料金の目安を確認できるコースを優先しています。掲載金額は確認時の例で、予約日の料金ではありません。ホール数・食事・人数条件もあわせてご覧ください。</p>');
 result.insertAdjacentHTML('beforeend',`<div class="finder-overview">${results.map((r,i)=>`<article class="finder-card"><span class="finder-number">${String(i+1).padStart(2,'0')}</span><small>${esc(r.course.area)}</small><h3>${esc(r.course.name)}</h3><p class="finder-fit">${esc(fit(r))}</p>${answers.priority==='budget'&&r.priced?budgetSummary(r.course):`<p>${esc(reason(r))}</p>`}${r.gaps.length?`<p class="finder-note">${r.gaps.map(esc).join('<br>')}</p>`:''}${r.course.serviceNotice?`<p class="finder-note">${esc(r.course.serviceNotice)}</p>`:''}${r.course.aspiration?`<p class="finder-note"><strong>${esc(r.course.aspiration.accessLabel)}</strong><br>${esc(r.course.aspiration.accessNote)}</p>`:''}${r.course.badge?`<p>${esc(r.course.badge)}</p>`:''}${/紹介|会員|不可|休業|閉鎖|改修/.test(r.course.note||'')?`<p class="finder-note">ご利用条件：${esc(r.course.note)}</p>`:''}<a href="#finder-comparison">下へ進んで比較 ↓</a></article>`).join('')}</div><p class="finder-explainer">${results.length<4?'条件に合う掲載コースが４件未満のため、確認できる候補だけを表示しています。 ':''}${someMiss?'すべての希望が一致するとは限らないため、各コースの確認ポイントもご覧ください。 ':''}掲載カテゴリと紹介情報に基づく編集提案です。数字は比較のための目印で、公式順位ではありません。実際の難易度・混雑・当日の料金を保証するものではありません。</p><h3 class="finder-compare-title" id="finder-comparison">違いを、ゆっくり見比べる。</h3><p class="finder-note">同じ番号・同じ位置のコースを、下へスクロールして比較できます。</p>`);
 result.insertAdjacentHTML('beforeend',section('選ぶ理由',(r)=>`${answers.priority==='budget'&&r.priced?budgetSummary(r.course):`<p>${esc(reason(r))}</p>`}<p class="finder-note">${(r.primary||r.detailed||(answers.priority==='scenery'&&fact(r.course,'scenery'))||answers.priority==='access'||(answers.priority==='budget'&&r.priced))?'希望の「'+esc(label('priority'))+'」を比較する候補。':'「'+esc(label('priority'))+'」の情報は限られるため、楽しみ方から選んだ候補。'}</p>`));
 result.insertAdjacentHTML('beforeend',section('景色・ロケーション',r=>field(r.course,'scenery')));
 result.insertAdjacentHTML('beforeend',section('プレーの特徴',r=>field(r.course,'play')+(r.course.badge?`<p class="finder-note">${esc(r.course.badge)}</p>`:'')));
 result.insertAdjacentHTML('beforeend',section('行きやすさ',r=>`<p>${esc(r.course.area)}</p>${window.gutsAccessHtml(r.course)}`));
 result.insertAdjacentHTML('beforeend',section('食事',r=>field(r.course,'dining')));
 result.insertAdjacentHTML('beforeend',section('宿泊・お風呂',r=>field(r.course,'stay')));
 result.insertAdjacentHTML('beforeend',section('予算の目安',r=>(fact(r.course,'budget')?.priceVerified?budgetSummary(r.course):field(r.course,'budget'))));
 result.insertAdjacentHTML('beforeend',section('予約前に',r=>`<p>${esc(r.course.note)}</p>${r.course.serviceNotice?`<p class="finder-note">${esc(r.course.serviceNotice)}</p>`:''}${r.course.aspiration?`<p><strong>${esc(r.course.aspiration.accessLabel)}</strong><br>${esc(r.course.aspiration.accessNote)}</p>`:''}${(r.course.sources||[]).map(s=>`<a class="finder-source" href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>`).join('')}`));
 result.insertAdjacentHTML('beforeend',section('どのコースにする？',(r,i)=>`<p>${esc(reason(r))}</p><button class="finder-primary" data-choose="${i}">このコースにする ↗</button><button class="finder-save" data-finder-save="${r.course.id}" aria-pressed="${saved.includes(r.course.id)}">${saved.includes(r.course.id)?'♥ 保存済み':'♡ 保存する'}</button>`)+`<div class="finder-final" hidden tabindex="-1"></div>`);
 result.querySelectorAll('[data-choose]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.choose)));
 result.querySelectorAll('[data-finder-save]').forEach(b=>b.onclick=()=>{let id=Number(b.dataset.finderSave);saved=saved.includes(id)?saved.filter(v=>v!==id):[...saved,id];try{localStorage.setItem('guts-japan-course-saved',JSON.stringify(saved))}catch{}render();syncSaveButtons()});
 scrollTo(root);
}
function syncSaveButtons(){result.querySelectorAll('[data-finder-save]').forEach(b=>{let v=saved.includes(Number(b.dataset.finderSave));b.setAttribute('aria-pressed',v);b.textContent=v?'♥ 保存済み':'♡ 保存する'})}
function choose(i){chosen=results[i].course;const final=result.querySelector('.finder-final');final.hidden=false;final.innerHTML=`<p class="finder-label">YOUR NEXT ROUND</p><h3>${esc(chosen.name)}</h3><p>${esc(chosen.area)}</p><p>あとは、日程とプランを確認。<br>この選択だけでは予約は完了しません。</p><a class="finder-primary" href="${safeUrl(chosen.officialUrl||chosen.bookingUrl||chosen.url)}" target="_blank" rel="noopener noreferrer">${chosen.officialUrl?'公式サイトで確認する':chosen.bookingUrl?'予約サイトで確認する':'掲載元で確認する'} ↗</a><button class="finder-secondary" data-return>もう一度見比べる</button>`;final.querySelector('[data-return]').onclick=()=>scrollTo(result.querySelector('#finder-comparison'));scrollTo(final)}
function startFresh(){
 cancelAdvance();quiz.querySelector('.finder-region-picker').hidden=false;quiz.querySelector('.finder-pref-picker').hidden=true;for(const key of Object.keys(answers))delete answers[key];step=0;chosen=null;results=[];result.innerHTML='';quiz.style.minHeight='';showQuestion();
}
root.querySelector('[data-start]').onclick=()=>{startFresh();scrollTo(root)};
// A new visit is a new search. Keep in-page back/next, but never restore old results.
try{sessionStorage.removeItem(stateKey)}catch{}
if(root.hasAttribute('data-autostart'))startFresh();
window.addEventListener('pageshow',e=>{if(e.persisted){startFresh();scrollTo(root)}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')cancelAdvance()});
window.addEventListener('pagehide',cancelAdvance);
document.addEventListener('click',e=>{if(e.target.closest('.save'))queueMicrotask(syncSaveButtons)});
})();
