(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 // Each statement retains its own source and checked date; never a shared fresh date.
 window.gutsEvidenceSegmentsHtml=f=>{
  const labels={official:'施設公式',booking:'予約サイト',tourism:'観光案内',review:'口コミ'};
  const safe=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}};
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  const a=f?.evidenceSegments;
  if(f?.conditions||f?.priceVerified===true||!Array.isArray(a)||a.length<2||a.some(x=>!x||typeof x.text!=='string'||!x.text.trim()||!Object.prototype.hasOwnProperty.call(labels,x.sourceType)||!validDate(x.checked)||!safe(x.url))||a.map(x=>x.text).join(' ')!==f.text)return '<p class="unknown finder-unconfirmed">項目別の根拠を確認できません。公式情報をご確認ください。</p>';
  return a.map(x=>`<p>${esc(x.text)}</p><p><a class="finder-source" href="${esc(safe(x.url))}" target="_blank" rel="noopener noreferrer">この記述の根拠（${labels[x.sourceType]}） ↗</a></p><p class="fact-date finder-note">この記述の確認：${esc(x.checked)}</p>`).join('');
 };
 window.gutsAccessHtml=course=>`<div class="course-access">${[['car','車でのアクセス'],['rail','電車で · 駅から']].map(([key,label])=>{const f=course.comparison?.[key];return `<div class="course-access-row"><p class="course-access-label">${label}</p>${f?.sourceType==='mixed'?window.gutsEvidenceSegmentsHtml(f):`<p>${esc(f?.text||(key==='car'?'ICからの経路・時間は不明です。':'駅からの経路・送迎条件は不明です。'))}</p><a class="finder-source" href="${esc(f?.url||course.officialUrl||course.url)}" target="_blank" rel="noopener noreferrer">アクセス情報の確認先 ↗</a>${f?.checked?`<p class="finder-note">情報確認：${esc(f.checked)}</p>`:''}`}</div>`}).join('')}<p class="course-access-footnote">所要時間は公表時の目安で、交通状況・ダイヤによって変わります。</p></div>`;
})();
