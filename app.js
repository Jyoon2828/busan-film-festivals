'use strict';
(() => {
const D = window.LESSON, isFestival = D.kind === 'festival';
const $ = (s, root = document) => root.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL = s => { try { const u = new URL(s); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
const item = id => D.items.find(x => x.id === id) || D.items[0];
const colors = ['#7360bd','#248279','#b55e54','#406d9a'];
const defaults = () => ({step:'home', collected:{}, notes:{}, compare:{similar:'',different:'',selected:['biff','biky'],drafts:{}}, drafts:{}, layoutVersion:3, composePage:0, comparePage:0, evidencePage:0, resultPage:0, active:D.items[0].id, theme:D.accent,
 form:{focus:D.items[0].id,author:'',group:'',place:'',activity:'',special:'',value:'',recommend:'',evidence:[],rec:D.items[0].id,customName:'',customArea:'',feature:'',reason:'',scene:'',care:'',genre:'우정 이야기',sourceTitle:'',sourceURL:'',photo:'',media:'0'}});
function normalise(v) {
 const n=defaults(); if(!v || typeof v!=='object') return n;
 if(['home',0,1,2,3].includes(v.step)) n.step=v.step;
 if(D.items.some(x=>x.id===v.active)) n.active=v.active;
 if(colors.includes(v.theme)) n.theme=v.theme;
 if(Number.isInteger(v.composePage))n.composePage=v.layoutVersion===3?Math.max(0,Math.min(6,v.composePage)):([0,1,4,6][v.composePage]||0);
 for(const [key,max] of [['comparePage',5],['evidencePage',3],['resultPage',2]])if(Number.isInteger(v[key]))n[key]=Math.max(0,Math.min(max,v[key]));
 const selected=Array.isArray(v.compare?.selected)?[...new Set(v.compare.selected.filter(id=>D.items.some(it=>it.id===id)))]:[];
 if(selected.length>=2)n.compare.selected=selected;
 if(v.compare?.drafts&&typeof v.compare.drafts==='object'){for(const [key,value] of Object.entries(v.compare.drafts)){const ids=key.split('|');if(ids.length>=2&&ids.length<=3&&ids.every(id=>D.items.some(it=>it.id===id)))n.compare.drafts[key]={similar:String(value?.similar||'').slice(0,180),different:String(value?.different||'').slice(0,180)};}}
 for(const it of D.items){const old=v.drafts?.[it.id];if(!old||typeof old!=='object')continue;const draft={};for(const key of ['place','activity','special','value','recommend','media'])draft[key]=String(old[key]||'').slice(0,key==='place'?140:key==='media'?3:180);draft.evidence=Array.isArray(old.evidence)?old.evidence.filter(k=>new RegExp('^'+it.id+':[0-3]$').test(k)).slice(0,4):[];n.drafts[it.id]=draft;}
 for(const it of D.items) {
  n.collected[it.id]=Array.isArray(v.collected?.[it.id]) ? [...new Set(v.collected[it.id].filter(x=>Number.isInteger(x)&&x>=0&&x<it.pages.length))] : [];
  const note=v.notes?.[it.id]||{};
  n.notes[it.id]={observe:String(note.observe||'').slice(0,180),nature:String(note.nature||'').slice(0,100),human:String(note.human||'').slice(0,100)};
 }
 for(const k of ['similar','different']) n.compare[k]=String(v.compare?.[k]||'').slice(0,180);
 for(const k of Object.keys(n.form)) {
  if(k==='evidence') continue;
  if(typeof v.form?.[k]==='string') n.form[k]=v.form[k].slice(0,({photo:1800000,sourceURL:1000,author:24,group:10,place:140,activity:180,special:180,value:180,recommend:180,customName:50,customArea:80,feature:180,reason:180,scene:180,care:150,genre:40,sourceTitle:100})[k]||30);
 }
 if(!D.items.some(x=>x.id===n.form.focus)) n.form.focus=D.items[0].id;
 if(![...D.items.map(x=>x.id),'custom'].includes(n.form.rec)) n.form.rec=D.items[0].id;
 if(!/^data:image\/(jpeg|png|webp);base64,/.test(n.form.photo)) n.form.photo='';
 n.form.sourceURL=safeURL(n.form.sourceURL);
 n.form.evidence=Array.isArray(v.form?.evidence)?v.form.evidence.filter(x=>/^\w+:\d$/.test(x)&&D.items.some(it=>it.id===x.split(':')[0]&&it.pages[+x.split(':')[1]]?.source!==null)).slice(0,8):[];
 return n;
}
let state=defaults(), storageOK=true;
try {const saved=localStorage.getItem(D.key); if(saved) state=normalise(JSON.parse(saved));} catch {storageOK=false;}
state=normalise(state);
const dialog=$('#dialog'), main=$('#main');
let timer, cardTimer, toastTimer, cardURL='', generating=0, detailId='', detailPage=0, detailPart=0, scrollBeforeDialog=0;
document.documentElement.style.setProperty('--accent',D.accent);
document.documentElement.style.setProperty('--pale',isFestival?'#eee7fb':'#e0efdf');
document.title=D.title+' | 부산 영화 수업'; $('#brand-name').textContent=D.short;
function toast(s){clearTimeout(toastTimer);$('#toast').textContent=s;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3500);}
function saveNow(){rememberDraft();rememberComparison();try{localStorage.setItem(D.key,JSON.stringify(state));$('#save-status').textContent='이 기기에 저장했어요';storageOK=true;}catch(e){storageOK=false;try{const copy=structuredClone(state);copy.form.photo='';localStorage.setItem(D.key,JSON.stringify(copy));$('#save-status').textContent='글 저장 · 사진은 백업 필요';}catch{$('#save-status').textContent='기록 백업을 해 주세요';}}}
function rememberDraft(){
 if(!isFestival)return;
 const draft={};for(const k of ['place','activity','special','value','recommend','media'])draft[k]=state.form[k];
 draft.evidence=[...state.form.evidence];state.drafts[state.form.focus]=draft;
}
function rememberComparison(){
 const key=[...state.compare.selected].sort().join('|');
 state.compare.drafts[key]={similar:state.compare.similar,different:state.compare.different};
}
function chooseComparison(id){
 const index=state.compare.selected.indexOf(id);
 if(index>=0&&state.compare.selected.length===2){toast('비교할 영화제는 두 개 이상 골라 주세요. 다른 영화제를 먼저 추가할 수 있어요.');return;}
 rememberComparison();
 if(index>=0)state.compare.selected.splice(index,1);else state.compare.selected.push(id);
 const saved=state.compare.drafts[[...state.compare.selected].sort().join('|')]||{};
 state.compare.similar=saved.similar||'';state.compare.different=saved.different||'';
 render();save();
}
function chooseFestival(id){
 if(!D.items.some(it=>it.id===id)||state.form.focus===id)return;
 rememberDraft();const draft=state.drafts[id]||{};state.form.focus=id;
 for(const k of ['place','activity','special','value','recommend'])state.form[k]=draft[k]||'';
 state.form.media=draft.media||'0';state.form.evidence=(draft.evidence||[]).filter(k=>state.collected[id].includes(Number(k.split(':')[1])));
 state.composePage=0;state.evidencePage=0;
}
function save(){clearTimeout(timer);$('#save-status').textContent='기록 저장 중…';timer=setTimeout(saveNow,350);}
function collectedCount(){return Object.values(state.collected).filter(x=>x.length).length;}
function link(s,label){const url=safeURL(s.url);return url?`<a class="source-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label||s.title)} ↗<br><small>${esc(s.publisher)}</small></a>`:'';}
function ticket(it){return `<div class="ticket-graphic"><span class="big-emoji">${it.emoji}</span><strong>${it.en}</strong><div class="dots">BUSAN · CINEMA</div></div>`;}
function picture(it,cls=''){return it.photo?`<img class="${cls} official-poster" src="${esc(it.photo)}" alt="${esc(it.photoAlt)}">`:ticket(it);}
function field(k,label,placeholder='',max=180,rows=3,scope='form'){
 const v=scope==='form'?state.form[k]:scope==='compare'?state.compare[k]:state.notes[state.active]?.[k]||'';
 const key=scope==='notes'?`notes.${state.active}.${k}`:`${scope}.${k}`;
 const id=key.replaceAll('.','-');
 return `<div class="field"><label for="${id}">${label}<small>${max}자 이내</small></label>${rows===1?`<input id="${id}" type="text" data-field="${key}" maxlength="${max}" value="${esc(v)}" placeholder="${esc(placeholder)}">`:`<textarea id="${id}" data-field="${key}" maxlength="${max}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(v)}</textarea>`}</div>`;
}
function navigate(step){state.step=step;render();save();window.scrollTo({top:0,behavior:'instant'});}
function render(){
 document.body.dataset.screen=String(state.step);
 $('#navbar').innerHTML=D.steps.map((s,i)=>`<button class="nav-btn ${state.step===i?'active':''}" data-action="step" data-step="${i}" ${state.step===i?'aria-current="step"':''}><span class="n">${i+1}</span><span>${s}</span></button>`).join('');
 main.innerHTML=state.step==='home'?home():state.step===0?explore():state.step===1?(isFestival?compare():notebook()):state.step===2?composer():result();
 if(state.step===2||state.step===3) refreshCard();
 if(!storageOK) $('#save-status').textContent='내 기록 관리에서 백업해요';
}
function classicHome(){return `<section class="hero"><div class="hero-copy"><span class="badge">영화로 만나는 우리 고장 · ${D.episode}차시</span><h1>${isFestival?'부산에 오면,<br>영화가 축제가 돼요.':'부산 곳곳이,<br>우리 영화의 무대.'}</h1><p>${esc(D.description)}</p><div class="actions"><button class="primary" data-action="step" data-step="0">${isFestival?'축제':'촬영지'} 탐험 시작하기 →</button>${collectedCount()||state.form.author?'<button class="secondary" data-action="step" data-step="2">쓰던 카드 이어가기</button>':''}</div><p class="helper">${isFestival?'세계의 영화 · 어린이의 영화 · 짧은 영화':'실제 촬영 사례 · 사진 관찰 · 나의 새로운 장면'}</p></div><div class="hero-art"><img src="assets/city.svg" alt="바다와 광안대교, 작은 영화관이 있는 부산 영화 여행 일러스트"><span class="star">✦</span><span class="art-caption">${isFestival?'Hello, Busan! 영화와 만나는 날':'Ready, action! 내가 찾은 영화 속 부산'}</span></div></section><section class="mission-row" aria-label="오늘의 활동"><article class="mission"><span>${isFestival?'🎪':'📍'}</span><div><strong>01. ${isFestival?'세 축제 만나기':'장소 속 단서 찾기'}</strong><p>${isFestival?'자료를 읽고 근거를 담아요.':'사진과 실제 촬영 이야기를 봐요.'}</p></div></article><article class="mission"><span>🔎</span><div><strong>02. ${isFestival?'닮은 점, 다른 점':'내가 추천하는 무대'}</strong><p>${isFestival?'축제의 특징을 비교해요.':'장소와 어울리는 장면을 생각해요.'}</p></div></article><article class="mission"><span>🎟️</span><div><strong>03. 나만의 소개 카드</strong><p>내 말로 쓰고 친구에게 소개해요.</p></div></article></section>`;}
function sectionHead(k,title,desc,side=''){return `<div class="section-head"><div><span class="eyebrow">${k}</span><h2>${title}</h2><p>${desc}</p></div>${side}</div>`;}
function classicExplore(){return sectionHead('EXPLORE 01',isFestival?'부산의 세 영화제를 만나 볼까요?':'영화가 지나간 부산을 찾아요',isFestival?'궁금한 축제를 눌러 읽고, 중요한 자료를 내 조사 가방에 담아요.':'장소 사진과 실제 촬영 사실을 살펴보고, 눈에 띄는 단서를 담아요.',`<span class="stamp-count">${isFestival?'자료를 담은 축제':'단서를 담은 장소'} ${collectedCount()} / 3</span>`)+`<div class="explore-grid">${D.items.map(it=>`<article class="explore-card" style="--card-color:${it.color}"><div class="card-picture">${picture(it)}<span class="pin">${isFestival?it.en:it.district}</span>${it.photo?'<span class="tiny-label">'+(isFestival?'공식 자료 사진':'실제 장소 사진')+'</span>':''}</div><div class="card-body"><h3>${it.name}</h3><p>${it.tagline}</p><div class="actions"><button class="primary" data-action="detail" data-id="${it.id}">탐험하기 ↗</button><span class="mini">${(state.collected[it.id]||[]).length?'✓ 자료 '+state.collected[it.id].length+'개 담음':isFestival?'자료 4개':'촬영 이야기 + 관찰'}</span></div></div></article>`).join('')}</div><div class="footnote"><span>${esc(D.note)}</span><button class="text-btn" data-action="step" data-step="1">다음 활동으로 →</button></div>`;}
function openDialog(title,body,foot=''){dialog.className='';scrollBeforeDialog=window.scrollY;dialog.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="icon-btn" data-action="close">닫기 ✕</button></div><div class="dialog-body">${body}</div><div class="dialog-foot">${foot||'<span>읽은 내용을 내 말로 정리해 보세요.</span><button class="secondary" data-action="close">활동으로 돌아가기</button>'}</div>`;if(!dialog.open)dialog.showModal();}

function showDetail(id,p=0,part=0){
 detailId=id;detailPage=Math.max(0,Math.min(3,p));detailPart=part===1?1:0;
 const it=item(id),pg=it.pages[detailPage],src=it.sources[pg.source],collected=state.collected[id].includes(detailPage),position=detailPage*2+detailPart;
 const poster=`<aside class="detail-aside compact-detail-aside">${picture(it,'detail-photo')}<button class="secondary" data-action="photo-view" data-id="${it.id}">포스터·사진 보기</button><p class="credit">${esc(it.photoCredit)}</p><div class="detail-date"><strong>2026년 개최</strong><span>${esc(it.date)}</span></div></aside>`;
 const body=`<div class="detail-layout paged-detail">${poster}<section class="detail-reading-main"><div class="detail-topline"><div class="chapter-buttons" aria-label="조사할 자료 선택">${it.pages.map((v,i)=>`<button data-action="page" data-page="${i}" class="${i===detailPage?'active':''}" aria-label="자료 ${i+1}: ${esc(v.title)}" aria-pressed="${i===detailPage}">${i+1}</button>`).join('')}</div><div class="detail-mode" aria-label="자료 읽기와 생각"><button data-action="detail-part" data-part="0" class="${!detailPart?'active':''}" aria-pressed="${!detailPart}">자료 읽기</button><button data-action="detail-part" data-part="1" class="${detailPart?'active':''}" aria-pressed="${!!detailPart}">생각해 보기</button></div></div><div class="reading-card"><h3>${pg.icon} ${esc(pg.title)}</h3>${!detailPart?`<p class="reading-text">${esc(pg.text)}</p><div class="detail-fact"><strong>자료에서 찾은 근거</strong><p>${esc(pg.fact)}</p></div>`:`<div class="thinking-page"><span class="badge">내 생각을 이야기해요</span><p>${esc(pg.question)}</p></div>`}<a class="compact-source" href="${esc(safeURL(src.url))}" target="_blank" rel="noopener noreferrer">출처: ${esc(src.publisher)} ↗</a></div></section></div>`;
 openDialog(it.name,body,`<button class="secondary" data-action="detail-nav" data-position="${position-1}" ${position===0?'disabled':''}>← 이전</button><span class="page-counter">자료 ${detailPage+1} / 4 · ${detailPart?'생각':'읽기'}</span><button class="collect-btn ${collected?'collected':''}" data-action="collect" data-page="${detailPage}" aria-pressed="${collected}">${collected?'✓ 근거 담음':'＋ 근거 담기'}</button>${position<7?`<button class="primary" data-action="detail-nav" data-position="${position+1}">${detailPart?'다음 자료 →':'생각해 보기 →'}</button>`:'<button class="primary" data-action="close">탐험 마치기 ✓</button>'}`);
 dialog.className='detail-modal';
}

function compare(){
 const chosen=D.items.filter(it=>state.compare.selected.includes(it.id)),page=state.comparePage;
 const categories=[['관객','만나는 관객','audience'],['활동','주요 활동','activity'],['특징','눈에 띄는 특징','signature'],['장소','2026년 장소','place'],['닮은 점'],['다른 점']];
 const category=categories[page];
 const content=page<4?`<div class="comparison-cards" style="--comparison-count:${chosen.length}">${chosen.map(it=>`<article class="comparison-card"><span class="badge">${it.en}</span><h3>${esc(it.name)}</h3><div class="comparison-value"><small>${category[1]}</small><p>${esc(it[category[2]])}</p></div></article>`).join('')}</div>`:`<section class="panel comparison-write">${field(page===4?'similar':'different',page===4?'찾아낸 닮은 점':'찾아낸 다른 점',page===4?'두 영화제 모두 ______하는 축제입니다.':'______는 ______하고, ______는 ______합니다.',180,4,'compare')}</section>`;
 return sectionHead('나란히 비교','한 가지씩 나란히 비교해요','항목을 눌러 비교하고, 닮은 점과 다른 점을 적어요.')+`<section class="comparison-desk"><div class="compare-choices" role="group" aria-label="비교할 영화제 선택">${D.items.map(it=>`<button class="pill ${chosen.includes(it)?'active':''}" data-action="compare-select" data-id="${it.id}" aria-pressed="${chosen.includes(it)}">${chosen.includes(it)?'✓ ':''}${it.name}</button>`).join('')}</div><div class="page-tabs comparison-tabs" role="group" aria-label="비교할 항목">${categories.map(([title],i)=>`<button data-action="compare-page" data-page="${i}" class="${page===i?'active':''}" aria-pressed="${page===i}">${title}</button>`).join('')}</div><div class="comparison-content">${content}</div><div class="desk-navigation"><button class="secondary" data-action="compare-page" data-page="${page-1}" ${page===0?'disabled':''}>← 이전 항목</button><span>${page+1} / 6</span>${page<5?`<button class="primary" data-action="compare-page" data-page="${page+1}">다음 항목 →</button>`:'<button class="primary" data-action="step" data-step="2">소개 카드 만들기 →</button>'}</div></section>`;
}
function notebook(){const it=item(state.active);return sectionHead('RESEARCH 02','촬영지 조사 노트를 써요','한 곳 이상을 골라 실제 촬영 사실과 사진에서 본 모습을 구분해 정리해요.')+`<div class="notebook"><aside class="notebook-menu">${D.items.map(x=>`<button class="place-choice ${it.id===x.id?'active':''}" data-action="active" data-id="${x.id}"><img src="${x.photo}" alt=""><span><strong>${x.name}</strong><small>${state.notes[x.id].observe?'✓ 관찰 기록 있음':x.district}</small></span></button>`).join('')}</aside><section class="panel"><div class="observation-banner">${picture(it)}<div><span class="badge">확인된 촬영 사례</span><h3 style="margin:9px 0">${it.name} × ${it.movie}</h3><p class="mini">영화 장면이 아닌 장소 사진을 관찰해요.</p><button class="text-btn" data-action="detail" data-id="${it.id}">사진·자료 크게 보기 ↗</button></div></div>${field('observe','내가 사진에서 발견한 모습','보이는 것의 색, 모양, 위치를 구체적으로 적어요.',180,3,'notes')}<div class="two-col">${field('nature','찾은 자연의 모습','예: 바다, 하늘, 햇빛',100,2,'notes')}${field('human','사람이 만들거나 활동하는 모습','예: 골목, 가게, 다리',100,2,'notes')}</div><p class="source-caption">촬영 사실 출처: ${link(it.sources[0])}</p><div class="actions mt"><button class="primary" data-action="recommend-current">이 장소를 추천 카드에 담기 →</button><button class="secondary" data-action="recommend-custom">다른 장소를 새로 추천하기</button></div></section></div>`;}
function authorFields(){return `<div class="input-row">${field('author','만든 사람','이름 또는 별명',24,1)}<div class="field"><label for="group">모둠 <small>선택</small></label><select id="group" data-field="form.group"><option value="">개인 활동</option>${[1,2,3,4,5,6].map(n=>`<option ${state.form.group===n+'모둠'?'selected':''}>${n}모둠</option>`).join('')}</select></div></div>`;}
function themePicker(){return `<div class="color-row"><small>카드 색</small>${colors.map(c=>`<button class="swatch ${state.theme===c?'active':''}" style="--c:${c}" data-action="theme" data-color="${c}" aria-label="${({'#7360bd':'보라','#248279':'초록','#b55e54':'산호','#406d9a':'파랑'})[c]}색 카드" aria-pressed="${state.theme===c}"></button>`).join('')}</div>`;}

function evidenceOptions(){
 const id=state.form.focus,it=item(id),pages=state.collected[id].filter(p=>it.pages[p].source!==null);
 if(!pages.length)return `<div class="empty-note">${it.name}에서 중요한 근거를 먼저 담아 보세요.<button class="secondary" data-action="detail" data-id="${id}">자료 읽고 근거 담기</button></div>`;
 const index=Math.min(state.evidencePage,pages.length-1),p=pages[index],pg=it.pages[p],key=id+':'+p;
 return `<p class="helper">카드에 넣을 근거를 체크해요. <b data-evidence-count>${selectedEvidence().length}</b>개 선택</p><label class="evidence-pick"><input type="checkbox" data-evidence="${key}" ${state.form.evidence.includes(key)?'checked':''}><span>${esc(pg.fact)}<small>${esc(it.sources[pg.source].title)}</small></span></label><div class="evidence-navigation"><button class="secondary" data-action="evidence-page" data-page="${index-1}" ${index===0?'disabled':''}>← 이전 근거</button><span>${index+1} / ${pages.length}</span><button class="secondary" data-action="evidence-page" data-page="${index+1}" ${index===pages.length-1?'disabled':''}>다음 근거 →</button></div>`;
}
const hints={place:'이 영화제는 ______에서 열렸습니다.',activity:'이 영화제에서는 ______할 수 있습니다.',special:'이 영화제는 ______한 점이 특별합니다.',value:'______하니까 부산에 ______한 도움이 될 것 같습니다.',recommend:'저는 ______한 점 때문에 이 영화제를 소개하고 싶습니다.'};

function writingField(key,label,placeholder,max=180,rows=4){
 return `<div class="writing-field">${field(key,label,placeholder,max,rows)}<button class="text-btn writing-help" data-action="writing-help" data-key="${key}">글쓰기가 어려울 때 · 문장 도움</button></div>`;
}

function composer(){
 const it=item(state.form.focus),page=state.composePage,titles=['축제','장소','활동','특징','도움','추천','근거'];
 return sectionHead('내 말로 소개하기','나만의 영화축제 소개 카드','질문 하나씩 쓰고, 다음 버튼으로 넘겨요.')+`<div class="composer"><section class="panel composer-editor"><div class="compose-tabs page-tabs" role="group" aria-label="소개 카드 작성 순서">${titles.map((title,i)=>`<button class="${page===i?'active':''}" data-action="compose-page" data-page="${i}" aria-pressed="${page===i}">${title}</button>`).join('')}</div><div class="composer-body">${festivalForm()}</div><div class="compose-navigation"><button class="secondary" data-action="compose-page" data-page="${page-1}" ${page===0?'disabled':''}>← 이전</button><span>${page+1} / 7</span>${page<6?`<button class="primary" data-action="compose-page" data-page="${page+1}">다음 →</button>`:'<button class="primary" data-action="finish">완성 카드 확인 →</button>'}</div></section><aside class="preview-panel"><div class="preview-paper"><img id="card-preview" alt="작성 중인 영화축제 소개 카드 미리보기" hidden><div class="placeholder" id="card-placeholder">카드 미리보기를 준비해요…</div></div>${themePicker()}<div class="actions"><button class="secondary" data-action="gallery" data-id="${it.id}">사진 고르기</button><button class="text-btn" data-action="detail" data-id="${it.id}">자료 다시 보기</button></div><p class="helper">쓰던 글은 자동 저장돼요.</p></aside></div>`;
}

function festivalForm(){
 const it=item(state.form.focus),page=state.composePage;
 if(page===0)return `<h3>소개할 영화제를 골라요</h3><div class="select-grid">${D.items.map(x=>`<button class="choice ${state.form.focus===x.id?'selected':''}" data-action="focus" data-id="${x.id}" aria-pressed="${state.form.focus===x.id}">${x.name}</button>`).join('')}</div>${authorFields()}<p class="helper">이름과 모둠은 선택이에요.</p>`;
 const questions=[null,['place','어디에서 열렸나요?','2026년의 주요 장소를 적어요.',140],['activity','무엇을 하는 축제인가요?','자료에서 확인한 활동을 소개해요.',180],['special','이 축제만의 눈에 띄는 점','누가 참여하고, 어떤 영화를 만나는지 생각해요.',180],['value','부산에 어떤 도움이 될까요?','그렇게 생각한 까닭을 함께 써요.',180],['recommend','내가 이 영화제를 소개하고 싶은 이유','기대되는 활동이나 특별한 점과 연결해요.',180]];
 if(page<6){const [key,label,placeholder,max]=questions[page];return `<p class="question-context">${esc(it.name)}</p>${writingField(key,label,placeholder,max,4)}`;}
 return `<h3>내 글을 뒷받침할 근거를 골라요</h3><div id="evidence-options">${evidenceOptions()}</div>`;
}
function locationForm(){const f=state.form,it=item(f.rec);return `<div class="form-step"><span class="step-dot">1</span>내가 추천할 장소</div><div class="field"><label for="rec">장소 선택</label><select id="rec" data-action="rec-select"><option value="custom" ${f.rec==='custom'?'selected':''}>＋ 학교·동네 등 다른 장소 직접 추천</option>${D.items.map(x=>`<option value="${x.id}" ${f.rec===x.id?'selected':''}>${x.name}</option>`).join('')}</select></div>${f.rec==='custom'?field('customName','장소 이름','우리 학교 운동장, 동네 공원 등',50,1)+field('customArea','어디에 있나요?','구·동 또는 찾아갈 수 있는 설명',80,1):`<p class="helper">위치: ${it.district} · 이곳의 새 장면을 상상해요. 장소를 바꾸면 아래 내용도 새 장소에 맞게 고쳐 주세요.</p>`}<div class="photo-upload">${f.photo?`<img src="${f.photo}" alt="내가 고른 장소 사진">`:f.rec==='custom'?'<span style="font-size:2rem">📷</span>':`<img src="${it.photo}" alt="${it.photoAlt}">`}<div><button class="secondary" data-action="photo">${f.rec==='custom'?'내 장소 사진 넣기':'내가 찍은 사진으로 바꾸기'}</button>${f.photo?'<button class="text-btn" data-action="remove-photo">내 사진 빼기</button>':''}</div></div><p class="helper">사진은 선택이에요. 없으면 장소 이름이 담긴 그림 카드를 만들어요. 직접 찍은 장소 사진을 넣을 수 있어요.</p>${f.rec==='custom'?`<details><summary class="mini">찾아본 자료 출처도 적기 (선택)</summary><div class="mt">${field('sourceTitle','자료 이름','읽어 본 기사나 사이트 제목',100,1)}<div class="field"><label for="source-url">자료 주소 <small>https://</small></label><input id="source-url" type="url" data-field="form.sourceURL" value="${esc(f.sourceURL)}" placeholder="https://…" maxlength="1000"></div></div></details>`:''}<div class="section-divider"></div><div class="form-step"><span class="step-dot">2</span>특징과 장면을 연결해요</div>${field('feature','이 장소에서 눈에 띄는 모습','실제로 보았거나 자료에서 찾은 구체적인 모습을 적어요.',180,3)}<div class="field"><label for="genre">어떤 이야기로 만들까요?</label><select id="genre" data-field="form.genre">${['우정 이야기','가족 이야기','모험 이야기','신비한 이야기','우리 고장 소개','자연을 지키는 이야기'].map(g=>`<option ${g===f.genre?'selected':''}>${g}</option>`).join('')}</select></div>${field('scene','내가 새로 찍고 싶은 장면','누가, 무엇을 하는지와 배경을 함께 설명해요.',180,3)}${field('reason','이 장소를 추천하는 까닭','장소의 어떤 특징이 내 장면에 어울리는지 적어요.',180,3)}${field('care','촬영할 때 지킬 약속','안전, 허락, 주민과 자연을 생각해요.',150,2)}<div class="section-divider"></div><div class="form-step"><span class="step-dot">3</span>함께 넣을 실제 촬영지 조사</div><div class="field"><label for="investigation">조사한 촬영지 선택</label><select id="investigation" data-action="investigation">${D.items.map(x=>`<option value="${x.id}" ${state.active===x.id?'selected':''}>${x.name}${state.notes[x.id].observe?' · 기록 있음':''}</option>`).join('')}</select></div><div id="investigation-summary" class="empty-note">${esc(state.notes[state.active].observe||'아직 관찰 기록이 없어요. 조사 노트에서 사진을 보고 적어 보세요.')}<br><button class="text-btn" data-action="step" data-step="1">조사 노트 쓰기 ↗</button></div>`;}
function validation(){const f=state.form,missing=[];
 if(isFestival){for(const [k,label] of [['place','열리는 장소'],['activity','축제 활동'],['special','축제의 특징'],['value','부산에 주는 도움에 대한 내 생각'],['recommend','소개하고 싶은 이유']])if(!f[k].trim()||/_{2,}/.test(f[k]))missing.push(label+(/_{2,}/.test(f[k])?' · 문장틀의 빈칸 바꾸기':''));if(!selectedEvidence().length)missing.push('자료 근거 1개 이상 체크');}
 else{if(f.rec==='custom'&&!f.customName.trim())missing.push('추천 장소 이름');if(f.rec==='custom'&&!f.customArea.trim())missing.push('장소의 위치');for(const[k,label]of[['feature','장소의 특징'],['scene','새로 찍을 장면'],['reason','추천하는 까닭'],['care','촬영 약속']])if(!f[k].trim())missing.push(label);if(!state.notes[state.active].observe.trim())missing.push('실제 촬영지 조사 노트');}
 return missing;
}

function result(){
 const missing=validation(),page=state.resultPage,titles=['발표','저장','확인'];
 const panels=[`<h3>친구에게 소개해요</h3><p>“제가 조사한 축제는 …입니다. 자료에서 …를 알았고, 부산에 …이 좋을 것 같습니다.”</p><button class="primary" data-action="present">전자칠판에서 크게 보기</button>`,`<h3>완성 카드를 저장해요</h3><p>PNG로 저장해 패들렛 등에 올릴 수 있어요.</p><div class="actions"><button class="primary" data-action="download" ${missing.length?'disabled':''}>카드 PNG 저장 ↓</button><button class="secondary" data-action="print" ${missing.length?'disabled':''}>인쇄 / PDF</button></div>`,`<h3>한 번 더 살펴봐요</h3><div class="checks"><label><input type="checkbox">내 말로 정리했나요?</label><label><input type="checkbox">내 생각에 자료 근거를 연결했나요?</label><label><input type="checkbox">친구가 이해하기 쉽게 소개했나요?</label></div>`];
 return sectionHead('발표 · 저장','내가 조사한 영화축제를 소개해요','완성 카드를 확인하고 발표하거나 저장해요.')+`<div class="result-layout"><div class="preview-paper"><img id="card-preview" alt="완성한 소개 카드" hidden><div class="placeholder" id="card-placeholder">카드를 준비하고 있어요…</div></div><section class="result-desk"><div class="page-tabs" aria-label="발표와 저장">${titles.map((title,i)=>`<button data-action="result-page" data-page="${i}" class="${page===i?'active':''}" aria-pressed="${page===i}">${title}</button>`).join('')}</div>${missing.length?`<div class="validation">더 작성할 칸 ${missing.length}개 · ${esc(missing[0])}</div>`:'<span class="badge">✓ 소개할 준비가 되었어요</span>'}<div class="result-page panel">${panels[page]}</div><div class="desk-navigation"><button class="secondary" data-action="step" data-step="2">← 카드 고치기</button>${page<2?`<button class="primary" data-action="result-page" data-page="${page+1}">다음 →</button>`:'<button class="primary" data-action="result-page" data-page="1">저장 화면으로 →</button>'}</div></section></div>`;
}
function selectedEvidence(){return state.form.evidence.map(k=>{const [id,p]=k.split(':'),it=item(id);return {it,pg:it.pages[+p]};}).filter(x=>x.it.id===state.form.focus&&x.pg&&x.pg.source!==null);}
function settings(){openDialog('내 기록 관리',`<div class="two-col"><div class="panel"><h3>다른 기기에서 이어 하기</h3><p class="guide-text">이 기기에 적은 글과 사진을 기록 파일로 저장해요. 다른 기기에서 같은 앱을 열고 기록 파일을 불러오면 이어 쓸 수 있어요.</p><div class="actions mt"><button class="primary" data-action="backup">기록 파일 백업 ↓</button><button class="secondary" data-action="restore">기록 파일 불러오기</button></div></div><div class="panel"><h3>다음 사용자를 위한 새 활동</h3><p class="guide-text">기록은 같은 브라우저에 남아요. 여러 학생이 기기를 바꿔 쓸 때에는 먼저 백업하거나 카드 이미지를 저장한 뒤 새 활동을 시작해요.</p><div class="actions mt"><button class="secondary" data-action="reset-confirm">이 기기의 기록 지우기</button></div></div></div><p class="helper mt">기록과 사진은 이 브라우저에 보관돼요. 다른 기기로 자동 전달되지는 않아요. 시크릿 모드나 브라우저 데이터 삭제 시 기록이 사라질 수 있어요.</p>`);}
function guide(){openDialog('40분 수업 안내',`<div class="two-col"><section><div class="teacher-agenda">${D.timing.map(([s,m])=>`<div class="agenda-row"><b>${m}분</b><span>${s}</span></div>`).join('')}</div><p class="helper">활동 시간은 학급 상황에 맞게 조절해요.</p></section><section><h3>수업에서 이렇게 써요</h3><p class="guide-text mt">${isFestival?'세 영화제의 자료를 읽고 두 곳 이상을 비교합니다. 그중 한 곳을 골라 장소·활동·특징을 정리하고, 자료 근거와 연결해 부산에 주는 도움을 생각합니다.':'실제 촬영지 한 곳 이상을 조사한 뒤, 장소의 특징을 살려 새로운 장면을 제안합니다. 조사한 촬영지를 추천해도 되고, 학교나 동네의 다른 장소를 추천해도 됩니다.'}</p><p class="guide-text mt">개인 또는 모둠 대표 기기로 활동할 수 있습니다. 같은 주소로 들어가도 기기마다 독립적으로 진행됩니다. 결과 PNG를 기존 패들렛에 올리거나 교사에게 전달해 발표합니다.</p><p class="guide-text mt">${isFestival?'모든 축제의 자료를 전부 담을 필요는 없습니다. 한 축제를 충분히 조사하고 다른 축제와 비교해도 좋습니다.':'실제 촬영 사례의 영화 전체를 감상할 필요는 없습니다. 앱에 담긴 장소 사진과 촬영 자료로 조사합니다. 추천 카드는 실제 촬영을 나가지 않고 계획으로만 작성해도 됩니다.'}</p></section></div>`);}
function showSources(){openDialog('조사 자료 출처',`<p class="guide-text">공식 안내와 실제 자료를 초등학생이 읽기 쉽게 정리했어요. 아래 링크에서 원문을 확인할 수 있어요. 사진은 장소·활동을 살펴보는 자료이며 현재 모습과 다를 수 있어요.</p><div class="word-grid mt">${D.items.map(it=>`<section class="word-item"><strong>${it.name}</strong><div class="source-list">${it.sources.map(s=>link(s)).join('')}</div>${it.photo?`<p class="credit">사진: ${it.photoCredit}</p>`:''}</section>`).join('')}</div><p class="helper mt">${esc(D.note)} · 자료 확인: 2026. 10. 30.</p>`);}

function showWords(index=0){
 const page=Math.max(0,Math.min(2,index));
 openDialog('낱말 도움',`<div class="word-grid">${D.glossary.slice(page*2,page*2+2).map(([key,text])=>`<section class="word-item"><strong>${key}</strong><p>${text}</p></section>`).join('')}</div>`,`<button class="secondary" data-action="words-page" data-page="${page-1}" ${!page?'disabled':''}>← 이전</button><span>${page+1} / 3</span><button class="secondary" data-action="words-page" data-page="${page+1}" ${page===2?'disabled':''}>다음 →</button><button class="primary" data-action="close">닫기</button>`);
}
function closeDialog(){dialog.close();if(state.step===0)render();if(state.step===2){const el=$('#evidence-options');if(el)el.innerHTML=evidenceOptions();refreshCard();}}
document.addEventListener('click',async e=>{
 const btn=e.target.closest('[data-action]');if(!btn)return; const a=btn.dataset.action;
 if(a==='step'){if(dialog.open)dialog.close();navigate(+btn.dataset.step);}
 else if(a==='home')navigate('home');
 else if(a==='detail')showDetail(btn.dataset.id);
 else if(a==='photo-view')showMedia(btn.dataset.id,0,true);
 else if(a==='gallery')showMedia(btn.dataset.id,Number(btn.dataset.index)||0,btn.dataset.back==='true');
 else if(a==='media-prev')showMedia(galleryId,galleryIndex-1,galleryBack);
 else if(a==='media-next')showMedia(galleryId,galleryIndex+1,galleryBack);
 else if(a==='media-use'){state.form.media=String(galleryIndex);save();closeDialog();toast('카드에 넣을 이미지를 바꿨어요.');}
 else if(a==='photo-back')showDetail(detailId,detailPage,detailPart);
 else if(a==='close')closeDialog();
 else if(a==='page')showDetail(detailId,+btn.dataset.page);
 else if(a==='collect'){const p=+btn.dataset.page,c=state.collected[detailId],i=c.indexOf(p);if(i>=0){c.splice(i,1);state.form.evidence=state.form.evidence.filter(k=>k!==detailId+':'+p);}else c.push(p);save();showDetail(detailId,detailPage,detailPart);}
 else if(a==='active'){state.active=btn.dataset.id;render();save();}
 else if(a==='focus'){chooseFestival(btn.dataset.id);render();save();}
 else if(a==='compose-page'){state.composePage=Math.max(0,Math.min(6,Number(btn.dataset.page)||0));render();save();}
 else if(a==='compare-select')chooseComparison(btn.dataset.id);
 else if(a==='compare-page'){state.comparePage=Math.max(0,Math.min(5,Number(btn.dataset.page)||0));render();save();}
 else if(a==='result-page'){state.resultPage=Math.max(0,Math.min(2,Number(btn.dataset.page)||0));render();save();}
 else if(a==='evidence-page'){state.evidencePage=Math.max(0,Math.min(3,Number(btn.dataset.page)||0));const target=$('#evidence-options');if(target)target.innerHTML=evidenceOptions();save();}
 else if(a==='detail-part')showDetail(detailId,detailPage,Number(btn.dataset.part));
 else if(a==='detail-nav'){const pos=Math.max(0,Math.min(7,Number(btn.dataset.position)||0));showDetail(detailId,Math.floor(pos/2),pos%2);}
 else if(a==='gallery-part')showMedia(galleryId,galleryIndex,galleryBack,Number(btn.dataset.part));
 else if(a==='gallery-page')showMedia(galleryId,Number(btn.dataset.index),galleryBack);
 else if(a==='words-page')showWords(Number(btn.dataset.page));
 else if(a==='writing-help'){const key=btn.dataset.key;if(hints[key])openDialog('문장 도움',`<div class="sentence-dialog"><p>${esc(hints[key])}</p><p class="helper">빈칸을 자신의 말로 바꾸어 써요.</p></div>`,`<button class="secondary" data-action="close">닫기</button><button class="primary" data-action="sentence-start" data-key="${key}">문장틀 넣고 바꾸기</button>`);}

 else if(a==='sentence-start'){const key=btn.dataset.key,el=$('[data-field="form.'+key+'"]');if(el&&hints[key]){if(el.value.trim())return toast('이미 쓴 글이 있어요. 문장 도움을 참고해 직접 고쳐 보세요.');el.value=hints[key];assignField('form.'+key,el.value);if(dialog.open)closeDialog();el.focus();save();refreshCard();}}
 else if(a==='theme'){state.theme=btn.dataset.color;document.querySelectorAll('.swatch').forEach(x=>{x.classList.toggle('active',x.dataset.color===state.theme);x.setAttribute('aria-pressed',String(x.dataset.color===state.theme));});save();refreshCard();}
 else if(a==='finish'){navigate(3);}
 else if(a==='recommend-current'){state.form.rec=state.active;navigate(2);}
 else if(a==='recommend-custom'){state.form.rec='custom';navigate(2);}
 else if(a==='words')showWords();else if(a==='sources')showSources();else if(a==='guide')guide();else if(a==='settings')settings();
 else if(a==='backup'){saveNow();downloadBlob(new Blob([JSON.stringify({app:D.kind,version:1,savedAt:new Date().toISOString(),state},null,2)],{type:'application/json'}),D.short+'-활동기록.json');toast('활동 기록 파일을 저장했어요.');}
 else if(a==='restore')$('#restore-file').click();
 else if(a==='reset-confirm')openDialog('이 기기의 기록을 지울까요?',`<p>기록한 글과 사진을 지우고 처음부터 시작해요. 필요한 내용은 먼저 카드나 기록 파일로 저장해 주세요.</p>`,`<button class="secondary" data-action="close">취소</button><button class="primary" data-action="reset">기록 지우고 새 활동</button>`);
 else if(a==='reset'){clearTimeout(timer);state=normalise(defaults());saveNow();dialog.close();navigate('home');toast('새 활동을 시작해요.');}
 else if(a==='photo')$('#photo-file').click();
 else if(a==='remove-photo'){state.form.photo='';render();save();}
 else if(a==='download'){if(validation().length)return toast('소개 카드의 빈칸을 먼저 채워 주세요.');try{const c=await buildCard();c.toBlob(blob=>{if(blob)downloadBlob(blob,D.short+'-'+safeFilename(state.form.author||state.form.group||'작품')+'.png');else toast('저장에 실패했어요. 다시 눌러 주세요.');},'image/png');}catch{toast('이미지를 저장하지 못했어요. 다시 눌러 주세요.');}}
 else if(a==='print'){if(validation().length)return toast('소개 카드의 빈칸을 먼저 채워 주세요.');try{await refreshCard();const img=new Image();img.src=cardURL;await img.decode();$('#print-area').replaceChildren(img);window.print();}catch{toast('인쇄 화면을 준비하지 못했어요.');}}
 else if(a==='present'){await refreshCard();const d=$('#present-dialog');d.innerHTML=`<div class="dialog-body"><img src="${cardURL}" alt="소개 카드 발표 화면"></div><div class="dialog-foot"><span>${esc(D.title)}</span><div class="actions"><button class="secondary" data-action="fullscreen">전체 화면</button><button class="primary" data-action="present-close">발표 닫기 ✕</button></div></div>`;d.showModal();}
 else if(a==='present-close'){const d=$('#present-dialog');if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});d.close();}
 else if(a==='fullscreen'){const d=$('#present-dialog');if(!document.fullscreenElement)await d.requestFullscreen?.().catch(()=>toast('이 기기에서는 전체 화면을 지원하지 않아요.'));else await document.exitFullscreen().catch(()=>{});}
});
function assignField(path,value){const bits=path.split('.');let target=state;while(bits.length>1){target=target[bits.shift()];if(!target)return;}target[bits[0]]=value;}
document.addEventListener('input',e=>{if(e.target.dataset.field){assignField(e.target.dataset.field,e.target.value);save();clearTimeout(cardTimer);if(state.step===2)cardTimer=setTimeout(refreshCard,280);}});
document.addEventListener('change',e=>{
 const el=e.target;
 if(el.dataset.field){assignField(el.dataset.field,el.value);save();if(state.step===2)refreshCard();}
 if(el.dataset.evidence){const k=el.dataset.evidence;if(el.checked){if(!state.form.evidence.includes(k))state.form.evidence.push(k);}else state.form.evidence=state.form.evidence.filter(x=>x!==k);const count=$('[data-evidence-count]');if(count)count.textContent=selectedEvidence().length;save();refreshCard();}
 if(el.dataset.action==='rec-select'){state.form.rec=el.value;state.form.photo='';render();save();}
 if(el.dataset.action==='investigation'){state.active=el.value;const target=$('#investigation-summary');target.innerHTML=esc(state.notes[state.active].observe||'아직 관찰 기록이 없어요. 조사 노트에서 적어 주세요.')+'<br><button class="text-btn" data-action="step" data-step="1">조사 노트 쓰기 ↗</button>';save();refreshCard();}
});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
dialog.addEventListener('cancel',()=>{if(state.step===0)setTimeout(render);if(state.step===2)setTimeout(()=>{const el=$('#evidence-options');if(el)el.innerHTML=evidenceOptions();refreshCard();});});
$('#restore-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>6000000)throw Error();const v=JSON.parse(await file.text());if(v.app!==D.kind||v.version!==1||!v.state||typeof v.state!=='object')return toast('이 앱에서 저장한 활동 기록 파일을 골라 주세요.');state=normalise(v.state);saveNow();if(dialog.open)dialog.close();render();toast('활동 기록을 불러왔어요.');}catch{toast('파일을 읽지 못했어요. 활동 기록 JSON 파일인지 확인해 주세요.');}});
$('#photo-file').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(!/^image\/(jpeg|png|webp)$/.test(f.type)||f.size>15000000)return toast('15MB 이하의 JPG, PNG, WebP 사진을 골라 주세요.');const url=URL.createObjectURL(f);const im=new Image();try{im.src=url;await im.decode();const c=document.createElement('canvas'),scale=Math.min(1,1200/im.width,1000/im.height);c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);state.form.photo=c.toDataURL('image/jpeg',.82);}finally{URL.revokeObjectURL(url);}saveNow();render();toast('사진을 카드에 넣었어요.');}catch{toast('사진을 읽지 못했어요. 다른 사진을 골라 주세요.');}});
window.addEventListener('beforeunload',()=>{clearTimeout(timer);saveNow();});
function safeFilename(s){return String(s).replace(/[\\/:*?"<>|\u0000-\u001f]/g,'').slice(0,35)||'작품';}
function downloadBlob(b,name){const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),10000);}

// A self-contained A4 canvas renderer keeps export independent of a CDN or DOM capture library.
const font='"Jua","Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
function rr(c,x,y,w,h,r=18){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function lines(c,text,width){const result=[];for(const paragraph of String(text||'').split('\n')){let line='';for(const ch of paragraph){if(c.measureText(line+ch).width>width&&line){result.push(line);line=ch;}else line+=ch;}result.push(line);}return result;}
function put(c,text,x,y,width,size=32,color='#27383d',weight=500,lineHeight=1.5){c.font=`${weight} ${size}px ${font}`;c.fillStyle=color;c.textBaseline='top';const list=lines(c,text,width);for(let i=0;i<list.length;i++)c.fillText(list[i],x,y+i*size*lineHeight);return list.length*size*lineHeight;}
const imageCache=new Map();
async function loadImage(url){if(!url)return null;if(imageCache.has(url))return imageCache.get(url);const p=new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=url;});if(!url.startsWith('data:'))imageCache.set(url,p);return p;}
function cover(c,im,x,y,w,h){const scale=Math.min(w/im.width,h/im.height),dw=im.width*scale,dh=im.height*scale;c.fillStyle='#e5e8e1';c.fillRect(x,y,w,h);c.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}
function makeCardData(){const f=state.form;
 if(isFestival){const it=item(f.focus),ev=selectedEvidence();return {title:it.name,tag:'내가 조사한 부산의 영화축제',photo:(it.media[Number(f.media)||0]||it.media[0]).src,credit:(it.media[Number(f.media)||0]||it.media[0]).credit,rows:[['어디에서 열리나요? · 2026년 사례',f.place],['축제에서 하는 일',f.activity],['눈에 띄는 특징',f.special],['부산에 주는 도움 · 나의 생각',f.value],['소개하고 싶은 이유 · 나의 생각',f.recommend],['자료에서 찾은 근거',ev.map(x=>x.pg.fact).join('\n')||'카드에 넣을 자료 근거를 체크해 주세요.'],...(state.compare.similar||state.compare.different?[['비교하며 알게 된 점',[(state.compare.selected||[]).map(id=>item(id).en).join(' · '),state.compare.similar?'닮은 점: '+state.compare.similar:'',state.compare.different?'다른 점: '+state.compare.different:''].filter(Boolean).join('\n')]]:[])],sources:[...new Set(ev.map(x=>x.it.sources[x.pg.source].publisher+' · '+x.it.sources[x.pg.source].title))]};}
 const it=item(f.rec),obs=item(state.active),custom=f.rec==='custom';return {title:custom?(f.customName||'나의 추천 장소'):it.name,tag:'내가 추천하는 부산의 촬영 장소',photo:f.photo||(custom?'':it.photo),credit:f.photo?'사진: 만든 사람이 넣은 사진':custom?'장면은 내가 새로 상상한 내용이에요.':it.photoCredit,rows:[['실제 촬영지 조사',obs.name+' · '+obs.movie+'\n'+(state.notes[obs.id].observe||'사진을 보고 발견한 모습을 적어 주세요.')+(state.notes[obs.id].nature?'\n자연의 모습: '+state.notes[obs.id].nature:'')+(state.notes[obs.id].human?'\n사람이 만든 모습: '+state.notes[obs.id].human:'')],['추천 장소의 위치',custom?f.customArea:it.district],['눈에 띄는 장소의 특징',f.feature],['새로 찍고 싶은 장면 · '+f.genre,f.scene],['이 장소를 추천하는 까닭',f.reason],['촬영할 때 지킬 약속',f.care]],sources:[obs.sources[0].publisher+' · '+obs.sources[0].title,...(!custom?[it.sources[0].publisher+' · '+it.sources[0].title]:f.sourceTitle?[f.sourceTitle]:[])].filter((x,i,a)=>a.indexOf(x)===i)};
}
async function buildCard(){
 await document.fonts.load('24px Jua').catch(()=>{});
 const data=makeCardData(),f=state.form,theme=state.theme,c=document.createElement('canvas');c.width=1485;c.height=2100;const ctx=c.getContext('2d');ctx.fillStyle='#fffdf7';ctx.fillRect(0,0,c.width,c.height);
 ctx.fillStyle=theme;rr(ctx,60,60,1365,176,26);ctx.fill();put(ctx,'BUSAN CINEMA CLUB   /   '+D.episode,90,81,1250,26,'#ffffffcc',800,1.3);put(ctx,data.tag,90,119,1250,34,'#fff',700,1.4);
 let titleSize=64;ctx.font=`900 ${titleSize}px ${font}`;while(ctx.measureText(data.title).width>1290&&titleSize>32){titleSize--;ctx.font=`900 ${titleSize}px ${font}`;}
 put(ctx,data.title,85,269,1315,titleSize,'#27383d',900,1.2);put(ctx,[f.group,f.author].filter(Boolean).join(' · ')||'나의 부산 영화 탐험',88,343,1290,30,'#647478',700,1.2);
 const im=await loadImage(data.photo);let y=400;
 ctx.save();rr(ctx,85,y,1315,350,22);ctx.clip();if(im)cover(ctx,im,85,y,1315,350);else{ctx.fillStyle=theme+'18';ctx.fillRect(85,y,1315,350);ctx.strokeStyle=theme;ctx.lineWidth=8;rr(ctx,585,y+71,255,164,18);ctx.stroke();ctx.beginPath();ctx.arc(710,y+153,48,0,Math.PI*2);ctx.stroke();ctx.fillStyle=theme;rr(ctx,641,y+43,105,35,8);ctx.fill();put(ctx,'READY, ACTION!',555,y+266,650,30,theme,900,1.2);}ctx.restore();
 put(ctx,data.credit||'이야기를 만드는 나만의 영화 카드',90,y+359,1300,23,'#647478',500,1.2);y+=410;
 const available=1920-y,rows=data.rows.map(([label,text])=>({label,text:text?.trim()||'여기에 내 말로 정리해 주세요.'}));let size=38,gap=18;
 const total=()=>{ctx.font=`500 ${size}px ${font}`;return rows.reduce((sum,r)=>sum+38+lines(ctx,r.text,1235).length*size*1.45+gap*2,0);};
 while(total()>available&&size>17){size--;gap=Math.max(9,gap-.5);}
 for(let i=0;i<rows.length;i++){const r=rows[i];ctx.font=`500 ${size}px ${font}`;const h=38+lines(ctx,r.text,1235).length*size*1.45+gap*2;ctx.fillStyle=i%2===0?theme+'0d':'#f0f1e9';rr(ctx,85,y,1315,h-10,13);ctx.fill();put(ctx,r.label,111,y+gap,1263,28,theme,800,1.2);put(ctx,r.text,111,y+gap+37,1235,size,r.text.startsWith('여기에')?'#9aa39c':'#27383d',500,1.45);y+=h;}
 ctx.strokeStyle='#d5dbd4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(85,1961);ctx.lineTo(1400,1961);ctx.stroke();let sourceText=[...new Set(data.sources.map(value=>value.split(' · ')[0]))].join(' / ');if(sourceText)sourceText+=' · 원문은 앱의 자료 출처에서 확인';if(!sourceText)sourceText='앱의 자료 출처에서 원문을 확인할 수 있어요.';put(ctx,'자료: '+sourceText,90,1978,1290,21,'#647478',500,1.4);put(ctx,isFestival?'2026년 공식 안내 사례 · 자료를 바탕으로 내 생각을 정리한 카드':'실제 촬영 사례를 조사하고 새로운 장면을 제안한 카드 · 장소 사진과 영화 장면을 구분해요',90,2040,1290,21,'#647478',500,1.3);
 return c;
}
async function refreshCard(){const generation=++generating;try{const c=await buildCard();if(generation!==generating)return;cardURL=c.toDataURL('image/png');const im=$('#card-preview');if(im){im.src=cardURL;im.hidden=false;$('#card-placeholder').hidden=true;}}catch(e){const p=$('#card-placeholder');if(p){p.textContent='미리보기를 만들지 못했어요. 새로고침해 주세요.';p.hidden=false;}cardURL='';}}
function home(){
 return `<section class="hero festival-home"><div class="hero-copy"><span class="badge">🎟 영화로 만나는 우리 고장</span><h1>부산 영화축제<br><em>탐험대</em></h1><p>진짜 영화제 포스터와 현장 사진을 만나 봐요.<br>마음에 드는 축제를 조사하고 나만의 카드를 만들어요.</p><div class="actions"><button class="primary" data-action="step" data-step="0">영화축제 탐험 시작 →</button>${collectedCount()||state.form.author?'<button class="secondary" data-action="step" data-step="2">쓰던 카드 이어가기</button>':''}</div><div class="home-tags"><span>공식 포스터 3종</span><span>현장 사진 · 공식 캐릭터</span><span>나만의 소개 카드</span></div></div><div class="festival-hero-board"><div class="paper-bunting" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><span class="board-label">2026 BUSAN FILM FESTIVALS</span><div class="poster-parade">${D.items.map(it=>`<button class="mini-poster" data-action="gallery" data-id="${it.id}" aria-label="${it.en} 공식 포스터 보기"><img src="${it.photo}" alt="${it.photoAlt}"><span>${it.en}</span></button>`).join('')}</div><img class="home-friends" src="assets/cinema-friends.webp" alt="웃고 있는 팝콘과 카메라 장식 캐릭터"><span class="board-note">우리 함께 영화제로 소풍 가요!</span></div></section><section class="mission-row" aria-label="오늘의 활동"><article class="mission"><span>🎪</span><div><strong>1. 포스터 속 축제 만나기</strong><p>포스터와 사진을 크게 살펴봐요.</p></div></article><article class="mission"><span>🔎</span><div><strong>2. 축제의 특징 찾기</strong><p>자료를 담고 나란히 비교해요.</p></div></article><article class="mission"><span>🎨</span><div><strong>3. 내 말로 소개하기</strong><p>소개 카드를 만들고 발표해요.</p></div></article></section>`;
}
function explore(){
 return `<div class="explore-welcome"><img class="welcome-friends" src="assets/cinema-friends.webp" alt="" aria-hidden="true"><div><span class="eyebrow">🎬 오늘은 내가 영화제 탐험가!</span><h2>부산의 세 영화제를 만나 볼까요?</h2><p>궁금한 영화제를 골라요. 사진은 눌러 확대해요.</p></div><span class="stamp-count">🎒 내 조사 가방 <b>${collectedCount()} / 3</b></span></div><div class="explore-grid poster-grid">${D.items.map((it,index)=>`<article class="explore-card festival-ticket" style="--card-color:${it.color};--ticket-tone:${['#eee2ff','#dcf1e6','#fff0cd'][index]}"><div class="ticket-hole-row" aria-hidden="true"></div><div class="poster-stage"><span class="festival-code">${it.en}</span><span class="year-sticker">2026<br><small>공식 포스터</small></span><button class="poster-open" data-action="gallery" data-id="${it.id}" aria-label="${it.name} 공식 포스터 크게 보기"><img src="${it.photo}" alt="${it.photoAlt}"><span class="poster-zoom">⌕ 크게 보기</span></button><span class="poster-spark spark-a" aria-hidden="true">✧</span><span class="poster-spark spark-b" aria-hidden="true">✦</span></div><div class="ticket-perforation" aria-hidden="true"></div><div class="card-body"><span class="festival-category">${['🌏 세계의 영화','🌱 어린이·청소년의 영화','🎞 짧은 영화'][index]}</span><h3>${it.name}</h3><p>${it.tagline}</p><div class="actions"><button class="primary" data-action="detail" data-id="${it.id}">조사하기 →</button><button class="album-link" data-action="gallery" data-id="${it.id}">사진 ${it.media.length}장 ↗</button></div><div class="card-progress">${state.collected[it.id].length?'✓ 근거 '+state.collected[it.id].length+'개를 담았어요':'자료를 읽고 중요한 근거를 담아 보세요.'}</div></div></article>`).join('')}</div><div class="footnote festival-bottom"><span>✦ 포스터와 사진마다 원문 출처를 확인할 수 있어요.</span><button class="secondary" data-action="step" data-step="1">나란히 비교하러 가기 →</button></div>`;
}
let galleryId='',galleryIndex=0,galleryBack=false,galleryPart=0;

function showMedia(id,index=0,back=false,part=0){
 const it=item(id),list=it.media||[],n=Math.max(0,Math.min(index,list.length-1)),m=list[n];if(!m)return;
 galleryId=id;galleryIndex=n;galleryBack=back;galleryPart=part===1?1:0;
 const selected=state.form.focus===id&&Number(state.form.media||0)===n,start=Math.floor(n/6)*6,visible=list.slice(start,start+6);
 const body=`<div class="paged-gallery"><div class="media-layout"><div class="media-display ${m.type==='공식 포스터'?'portrait-media':''}"><img src="${m.src}" alt="${esc(m.alt)}"></div><aside class="media-description"><div class="page-tabs gallery-copy-tabs"><button data-action="gallery-part" data-part="0" class="${!galleryPart?'active':''}" aria-pressed="${!galleryPart}">사진 설명</button><button data-action="gallery-part" data-part="1" class="${galleryPart?'active':''}" aria-pressed="${!!galleryPart}">생각 질문</button></div><div class="gallery-copy"><span class="badge">${esc(m.type)}</span><h3>${esc(m.title)}</h3>${!galleryPart?`<p>${esc(m.caption)}</p><div class="media-source"><p>${esc(m.credit)}</p><a href="${esc(safeURL(m.sourceURL))}" target="_blank" rel="noopener noreferrer">공식 원문에서 확인 ↗</a></div>`:`<div class="thinking"><p>${esc(m.question)}</p></div>`}</div></aside></div><div class="gallery-list"><button class="gallery-list-arrow" data-action="gallery-page" data-index="${start-6}" ${start===0?'disabled':''} aria-label="이전 사진 목록">‹</button><div class="media-thumbnails" aria-label="포스터와 사진 선택">${visible.map((v,j)=>{const i=start+j;return `<button class="media-thumb ${i===n?'active':''}" data-action="gallery" data-id="${id}" data-index="${i}" data-back="${back}" aria-label="${esc(v.title)}" aria-pressed="${i===n}"><img src="${v.src}" alt=""><span>${i+1}</span></button>`;}).join('')}</div><button class="gallery-list-arrow" data-action="gallery-page" data-index="${start+6}" ${start+6>=list.length?'disabled':''} aria-label="다음 사진 목록">›</button></div></div>`;
 openDialog(it.name+' · 사진첩',body,`<div class="actions"><button class="secondary" data-action="media-prev" ${n===0?'disabled':''}>← 이전</button><span class="media-position">${n+1} / ${list.length}</span><button class="secondary" data-action="media-next" ${n===list.length-1?'disabled':''}>다음 →</button></div>${state.step===2&&state.form.focus===id?`<button class="primary" data-action="media-use">${selected?'✓ 카드에 사용 중':'내 카드에 넣기'}</button>`:''}<button class="secondary" data-action="${back?'photo-back':'close'}">${back?'자료로 돌아가기':'사진첩 닫기'}</button>`);
 dialog.className='media-modal';
}


render();
})();
