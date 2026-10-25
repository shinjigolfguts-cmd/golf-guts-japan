(()=>{
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.gutsAccessHtml=course=>`<div class="course-access">${[['car','車でのアクセス'],['rail','電車で · 駅から']].map(([key,label])=>{const f=course.comparison?.[key];return `<div class="course-access-row"><p class="course-access-label">${label}</p><p>${esc(f?.text||(key==='car'?'ICからの経路・時間は不明です。':'駅からの経路・送迎条件は不明です。'))}</p><a class="finder-source" href="${esc(f?.url||course.officialUrl||course.url)}" target="_blank" rel="noopener noreferrer">アクセス情報の確認先 ↗</a>${f?.checked?`<p class="finder-note">情報確認：${esc(f.checked)}</p>`:''}</div>`}).join('')}<p class="course-access-footnote">所要時間は公表時の目安で、交通状況・ダイヤによって変わります。</p></div>`;
})();
