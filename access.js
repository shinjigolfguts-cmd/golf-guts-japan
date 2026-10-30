(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));


const legacy48={text:'遠方の九十九里を望むコース。詳しい起伏やレイアウトの比較情報は未確認。',url:'https://www.mannacc.com/restaurant/gp-grill',checked:'2026-10-22〜23',basis:'既存掲載情報を項目別に確認'};
const legacyTuples=[{id:48,before:legacy48},{"id":84,"before":{"text":"9ホール・パー27のショートコース。6ホールに照明を完備。","url":"https://dynamic-golf.jp/","checked":"2026-10-22〜23","basis":"既存掲載情報を項目別に確認"}},{"id":85,"before":{"text":"パー4を2ホール含む全12ホールのミッドコース。","url":"https://dynamic-golf.jp/","checked":"2026-10-22〜23","basis":"既存掲載情報を項目別に確認"}},{"id":86,"before":{"text":"9ホール・パー27のショートコース。全ホールに照明を完備。","url":"https://dynamic-golf.jp/","checked":"2026-10-22〜23","basis":"既存掲載情報を項目別に確認"}}];
const sameLegacy=e=>e&&Object.keys(e).length===5&&e.sourceType==='legacy_unclassified'&&legacyTuples.some(({before})=>Object.keys(before).every(k=>e[k]===before[k]));
const nexco=e=>{try{const u=new URL(e.url);return u.protocol==='https:'&&u.hostname==='corp.w-nexco.co.jp'&&!u.port&&!u.username&&!u.password&&/NEXCO西日本/.test(e.text)}catch{return false}};

 // Each statement retains its own source and checked date; never a shared fresh date.
 window.gutsEvidenceSegmentsHtml=f=>{
  const labels={official:'施設公式',booking:'予約サイト',tourism:'観光案内',review:'口コミ',legacy_unclassified:'既存掲載情報・出典分類未確認',nexco_west:'道路管理者公式・NEXCO西日本'};
  const safe=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}};
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  const a=f?.evidenceSegments;
  if(f?.conditions||f?.priceVerified===true||!Array.isArray(a)||a.length<2||a.some((x,i)=>!x||typeof x.text!=='string'||!x.text.trim()||!Object.prototype.hasOwnProperty.call(labels,x.sourceType)||!(validDate(x.checked)||i===0&&sameLegacy(x)&&f.checked===x.checked&&f.url===x.url)||!safe(x.url)||x.sourceType==='legacy_unclassified'&&!(i===0&&sameLegacy(x))||x.sourceType==='nexco_west'&&!nexco(x)||x.sourceType==='official'&&new URL(x.url).hostname==='corp.w-nexco.co.jp')||a.map(x=>x.text).join(' ')!==f.text||sameLegacy(a[0])&&a.slice(1).some(x=>x.text.trim()===a[0].text.trim()))return '<p class="unknown finder-unconfirmed">項目別の根拠を確認できません。公式情報をご確認ください。</p>';
  return a.map(x=>`<p>${esc(x.text)}</p><p><a class="finder-source" href="${esc(safe(x.url))}" target="_blank" rel="noopener noreferrer">この記述の根拠（${labels[x.sourceType]}） ↗</a></p><p class="fact-date finder-note">この記述の確認：${esc(x.checked)}</p>`).join('');
 };
 window.gutsAccessHtml=course=>`<div class="course-access">${[['car','車でのアクセス'],['rail','電車で · 駅から']].map(([key,label])=>{const f=course.comparison?.[key];return `<div class="course-access-row"><p class="course-access-label">${label}</p>${f?.sourceType==='mixed'?window.gutsEvidenceSegmentsHtml(f):`<p>${esc(f?.text||(key==='car'?'ICからの経路・時間は不明です。':'駅からの経路・送迎条件は不明です。'))}</p><a class="finder-source" href="${esc(f?.url||course.officialUrl||course.url)}" target="_blank" rel="noopener noreferrer">アクセス情報の確認先 ↗</a>${f?.checked?`<p class="finder-note">情報確認：${esc(f.checked)}</p>`:''}`}</div>`}).join('')}<p class="course-access-footnote">所要時間は公表時の目安で、交通状況・ダイヤによって変わります。</p></div>`;
})();
