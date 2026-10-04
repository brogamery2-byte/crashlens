import './style.css';
import { SAMPLES, analyze, normalizeLog } from '../analyzer/index.ts';
import { PROVIDER_LABELS, askAi, buildPayload, describeRedactions, validateConfig } from '../ai/index.ts';

/* UI layer. All analysis comes from src/analyzer (tested TypeScript); this file only renders it. */
const $=s=>document.querySelector(s);
const h=(t,a={},...c)=>{const e=document.createElement(t);for(const k in a){if(k==='class')e.className=a[k];else if(k.startsWith('on'))e.addEventListener(k.slice(2),a[k]);else e.setAttribute(k,a[k])}for(const x of c.flat())if(x!=null&&x!==false)e.append(x.nodeType?x:document.createTextNode(String(x)));return e};
const store={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),1400)};
const copy=t=>{try{navigator.clipboard.writeText(t).then(()=>toast('Copied'),()=>toast('Copy blocked by browser'))}catch{toast('Copy blocked by browser')}};

/* ---------- Settings (persisted locally) ---------- */
const S=Object.assign({theme:'system',hist:true,full:false,fs:16,wrap:false,ln:true,aiOn:false,aiProvider:'anthropic',aiModel:'',aiBase:'',aiRemember:false},store.get('cl:settings',{}));
const saveS=()=>{store.set('cl:settings',S);applyTheme()};
function applyTheme(){const r=document.documentElement;S.theme==='system'?r.removeAttribute('data-theme'):r.dataset.theme=S.theme;r.style.setProperty('--fs',S.fs+'px')}

/* ---------- App state & views ---------- */
let view='analyze',res=null,raw='',curQ=null,held=null,runId=0;
const H=()=>store.get('cl:hist',[]);
function setMsg(kind,title,body){const m=$('#msg');if(!m)return;m.replaceChildren(h('div',{class:'msg '+kind,role:'alert'},h('b',{},({info:'ⓘ ',warn:'▲ ',err:'✕ '}[kind])+title),body))}
function save(r,t){if(!S.hist)return;const a=H();a.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),ts:Date.now(),title:r.title,language:r.language,application:r.platform,errorType:r.errorType,summary:r.summary,confidence:r.conf.score,log:S.full?t.slice(0,200000):undefined});store.set('cl:hist',a.slice(0,100))}
function nav(v){runId++;view=v;res=null;render()}
function render(){const m=$('#main');m.replaceChildren();document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.v===view?'page':'false'));window.scrollTo(0,0);({analyze:vAnalyze,history:vHistory,formats:vFormats,settings:vSettings,about:vAbout})[view](m)}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.v)));

/* ---------- Optional AI second opinion (bring your own key) ----------
 Off by default. The key lives in memory unless "remember" is ticked. Only the redacted excerpt shown in the preview is sent,
 straight from this browser to the chosen provider. AI output is shown as plain text only and never executed. */
let aiKey=S.aiRemember?store.get('cl:aikey',''):'';
const PRESETS=[['OpenAI','https://api.openai.com/v1'],['OpenRouter','https://openrouter.ai/api/v1'],['Groq','https://api.groq.com/openai/v1'],['Ollama (local)','http://localhost:11434/v1']];
const aiCfg=()=>({provider:S.aiProvider,model:(S.aiModel||'').trim(),baseUrl:(S.aiBase||'').trim(),apiKey:aiKey});
async function callAi(req){const ctl=new AbortController();const to=setTimeout(()=>ctl.abort(),60000);
 try{return await askAi(aiCfg(),req,(u,i)=>fetch(u,{...i,signal:ctl.signal}))}
 finally{clearTimeout(to)}}
function aiSection(r){
 if(!S.aiOn)return h('section',{class:'pn'},h('h2',{},'Second opinion (optional)'),h('p',{class:'mu'},'Turn on AI analysis in Settings to ask your own AI provider to double-check this result. It is off by default, and nothing is sent without a preview.'),h('button',{class:'btn',onclick:()=>nav('settings')},'Open Settings'));
 const box=h('div',{}),el=sec('Second opinion (AI)',box),label=PROVIDER_LABELS[S.aiProvider];
 const problem=validateConfig(aiCfg());
 if(problem){box.append(h('p',{class:'mu'},problem),h('button',{class:'btn',onclick:()=>nav('settings')},'Open Settings'));return el}
 const reset=()=>box.replaceChildren(h('p',{class:'mu'},'Sends a short, redacted summary to '+label+' for a second opinion. You review it first.'),h('button',{class:'btn',onclick:preview},'Ask '+label+' to double-check'));
 const preview=()=>{const p=buildPayload(r);
  box.replaceChildren(h('p',{},'Review before sending. Only this excerpt goes to '+label+'. Your full log stays in your browser.'),h('pre',{class:'sendpre'},p.user),h('p',{class:'mu'},describeRedactions(p.redactions)+' Check the text above for anything private that was not caught.'),h('details',{},h('summary',{},'Instructions sent with it'),h('pre',{class:'sendpre'},p.system)),h('div',{class:'bar'},h('button',{class:'btn pri',onclick:()=>send(p)},'Send to '+label),h('button',{class:'btn',onclick:reset},'Cancel')))};
 const send=async p=>{box.replaceChildren(h('p',{role:'status'},'Waiting for '+label+'…'));
  try{const t=await callAi({system:p.system,user:p.user});
   box.replaceChildren(h('p',{class:'mu'},'⚠ AI-generated, may be wrong. Check it against the evidence above and review any command before you run it.'),h('div',{class:'aiout'},t),h('div',{class:'bar'},h('button',{class:'btn',onclick:()=>copy(t)},'Copy answer'),h('button',{class:'btn',onclick:preview},'Ask again')))}
  catch(e){box.replaceChildren(h('p',{role:'alert'},'✕ '+String(e&&e.message||e)),h('div',{class:'bar'},h('button',{class:'btn',onclick:preview},'Back to preview'),h('button',{class:'btn',onclick:()=>nav('settings')},'Open Settings')))}};
 reset();return el}
function aiPanel(){const st=h('p',{class:'mu',role:'status'},'');
 const inp=(k,props,onInput)=>h('input',{class:'in',...props,oninput:e=>onInput(e.target.value)});
 const prov=h('select',{'aria-label':'AI provider',onchange:e=>{S.aiProvider=e.target.value;saveS();render()}},Object.keys(PROVIDER_LABELS).map(k=>h('option',{value:k,...(S.aiProvider===k?{selected:''}:{})},PROVIDER_LABELS[k])));
 const model=h('input',{class:'in','aria-label':'Model name',placeholder:'Model name from your provider docs',value:S.aiModel||'',autocomplete:'off',autocapitalize:'off',spellcheck:'false',oninput:e=>{S.aiModel=e.target.value;saveS()}});
 const base=S.aiProvider==='openai-compatible'?h('div',{},h('input',{class:'in','aria-label':'Base URL',placeholder:'https://api.openai.com/v1',value:S.aiBase||'',autocomplete:'off',autocapitalize:'off',spellcheck:'false',oninput:e=>{S.aiBase=e.target.value;saveS()}}),h('div',{class:'bar'},PRESETS.map(([n,u])=>h('button',{class:'btn',onclick:()=>{S.aiBase=u;saveS();render()}},n)))):null;
 const key=h('input',{class:'in',type:'password','aria-label':'API key',placeholder:'API key',autocomplete:'off',autocapitalize:'off',spellcheck:'false',value:aiKey,oninput:e=>{aiKey=e.target.value;if(S.aiRemember)store.set('cl:aikey',aiKey)}});
 const rem=h('label',{class:'chkl'},h('input',{type:'checkbox',...(S.aiRemember?{checked:''}:{}),onchange:e=>{S.aiRemember=e.target.checked;saveS();if(S.aiRemember)store.set('cl:aikey',aiKey);else{try{localStorage.removeItem('cl:aikey')}catch{}}}}),h('span',{},'Remember the key on this device',h('div',{class:'mu'},'Off by default: the key is kept in memory and disappears when you close the tab. If on, it is stored unencrypted in this browser, where extensions and anyone using this device could read it.')));
 const test=h('button',{class:'btn',onclick:async()=>{const p=validateConfig(aiCfg());if(p){st.textContent='✕ '+p;return}st.textContent='Testing…';
  try{const t=await callAi({system:'You are a connectivity test.',user:'Reply with the single word OK.'});st.textContent='✓ Connected. The provider replied: '+t.slice(0,80)}catch(e){st.textContent='✕ '+String(e&&e.message||e)}}},'Test connection');
 const forget=h('button',{class:'btn',onclick:()=>{aiKey='';try{localStorage.removeItem('cl:aikey')}catch{}key.value='';st.textContent='Key forgotten.'}},'Forget key');
 return h('div',{},h('p',{class:'mu'},'Pick a provider and use your own API key. When you press Send on a preview, that excerpt goes directly from this browser to the provider. CrashLens has no server and never sees your key or log. Usage is billed to your account with the provider.'),
  h('label',{class:'fld'},'Provider',prov),h('label',{class:'fld'},'Model',model),base&&h('label',{class:'fld'},'Base URL',base),h('label',{class:'fld'},'API key',key),rem,
  h('div',{class:'bar'},test,forget),st)}

let worker;const pending=new Map();let seq=0;
function getWorker(){if(worker!==undefined)return worker;
 try{worker=new Worker(new URL('./analysis.worker.js',import.meta.url),{type:'module'});
  worker.onmessage=e=>{const p=pending.get(e.data.id);if(!p)return;pending.delete(e.data.id);e.data.error?p.rej(new Error(e.data.error)):p.res(e.data.result)};
  worker.onerror=()=>{worker=null;for(const p of pending.values())Promise.resolve().then(()=>analyze(p.text)).then(p.res,p.rej);pending.clear()}}
 catch{worker=null}
 return worker}
/* Analysis runs in a Web Worker; if workers are unavailable it falls back to the main thread. */
function analyzeAsync(text){const w=getWorker();
 if(!w)return Promise.resolve().then(()=>analyze(text));
 return new Promise((res,rej)=>{const id=++seq;pending.set(id,{res,rej,text});w.postMessage({id,text})})}
const countLines=t=>{let n=1;for(let i=t.indexOf('\n');i!==-1;i=t.indexOf('\n',i+1))n++;return n};

function vAnalyze(m){if(res)return vResult(m);
 const ta=h('textarea',{'aria-label':'Error or log input',spellcheck:'false',autocapitalize:'off',autocomplete:'off',autocorrect:'off',wrap:'off',placeholder:'Paste an error, stack trace or log, or drop a log file here'});ta.value=raw;
 const gut=h('div',{class:'gut','aria-hidden':'true'}),ed=h('div',{class:'ed'},gut,ta);
 const card=held&&h('section',{class:'pn'},h('h2',{},'Large log loaded'),h('p',{class:'mono'},held.name),h('p',{class:'mu'},(held.text.length/1e6).toFixed(1)+' MB • '+held.lines.toLocaleString()+' lines'),h('p',{class:'mu'},'The whole file is scanned in the background, so the page stays responsive. It is not copied into the editor.'));
 const box=card||ed;
 const sync=()=>{raw=ta.value;gut.style.display=S.ln?'':'none';gut.textContent=S.ln?Array.from({length:Math.min(raw.split('\n').length,20000)},(_,i)=>i+1).join('\n'):'';gut.scrollTop=ta.scrollTop};
 ta.addEventListener('input',sync);ta.addEventListener('scroll',()=>{gut.scrollTop=ta.scrollTop});
 const setText=(t,title,body)=>{if(held){held=null;raw=t;render()}else{ta.value=t;sync()}setMsg('info',title,body)};
 const readFile=async f=>{if(f.size>25e6)return setMsg('err','File too large','CrashLens accepts text files up to 25 MB.');
  if(/\.(exe|dll|so|png|jpe?g|gif|zip|jar|class|pdf|bin)$/i.test(f.name))return setMsg('err','Unsupported file','CrashLens only reads text files such as .txt, .log, .crash, .md, .json and .xml.');
  const t=await f.text();if(t.slice(0,2000).includes('\u0000'))return setMsg('err','Unsupported file','This looks like a binary file. Upload a text log instead.');
  if(t.length>1e6){held={name:f.name,text:t,lines:countLines(t)};raw='';render();setMsg('info','Large log loaded','The whole file will be scanned in the background. Press Analyze.')}
  else setText(t,'Loaded','File loaded as text. It is never executed.')};
 box.addEventListener('dragover',e=>{e.preventDefault();box.classList.add('drop')});box.addEventListener('dragleave',()=>box.classList.remove('drop'));
 box.addEventListener('drop',e=>{e.preventDefault();box.classList.remove('drop');const f=e.dataTransfer.files[0];if(f)readFile(f)});
 const fi=h('input',{type:'file',accept:'.txt,.log,.crash,.md,.json,.xml,.out,.csv,text/*',hidden:'',onchange:()=>{if(fi.files[0])readFile(fi.files[0]);fi.value=''}});
 const sel=h('select',{'aria-label':'Try an example',onchange:()=>{const k=sel.value;sel.value='';if(k)setText(SAMPLES[k],'Example loaded','Press Analyze to run it.')}},h('option',{value:''},'Try an example'),Object.keys(SAMPLES).map(k=>h('option',{value:k},k)));
 const run=async()=>{const t=held?held.text:ta.value;if(!t.trim())return setMsg('info','Nothing to analyze yet','Paste an error, drop a log file, or try one of the examples.');
  const my=++runId;btn.disabled=true;setMsg('info','Analyzing…',held?'Scanning the whole file in the background.':'');
  try{const r=await analyzeAsync(t);if(my!==runId)return;
   if(!r){btn.disabled=false;return setMsg('warn','No recognizable error found','CrashLens found no exception, stack trace or known error pattern. Include the full output around the failure, including lines that start with "Caused by" or "Traceback".')}
   r.lines=normalizeLog(t).split('\n');res=r;raw=held?'':t;save(r,t);render()}
  catch(e){if(my===runId){btn.disabled=false;setMsg('err','Analysis failed',String(e&&e.message||e))}}};
 const btn=h('button',{class:'btn pri',onclick:run},'Analyze');
 m.append(h('div',{class:'bar'},btn,h('button',{class:'btn',onclick:async()=>{try{setText(await navigator.clipboard.readText(),'Pasted','Press Analyze to run it.')}catch{setMsg('warn','Paste blocked','Your browser blocked clipboard access. Long-press the editor and choose Paste.')}}},'Paste'),h('button',{class:'btn',onclick:()=>fi.click()},'Upload'),sel,h('span',{class:'sp'}),h('button',{class:'btn',onclick:()=>{held=null;raw='';render()}},'Clear')),fi,box,h('div',{id:'msg'}),
  h('p',{class:'mu'},'Analysis runs in your browser. Nothing is uploaded, and nothing from your log is ever executed.'));sync()}

function sec(t,...c){return h('section',{class:'pn'},h('h2',{},t),...c)}
function vResult(m){const r=res;
 m.append(h('div',{class:'bar'},h('button',{class:'btn',onclick:()=>{res=null;render()}},'← Edit input'),h('span',{class:'sp'}),h('button',{class:'btn',onclick:()=>copy(JSON.stringify({version:1,createdAt:new Date().toISOString(),input:{language:r.language,application:r.platform},result:{errorType:r.errorType,summary:r.summary,confidence:r.conf.score}},null,2))},'Copy as JSON')));
 const meter=h('i');meter.style.width=r.conf.score+'%';
 m.append(h('section',{class:'pn'},h('div',{class:'mu'},[r.language,r.platform!==r.language?r.platform:null,'● Error'].filter(Boolean).join(' • ')),h('h1',{class:'mono'},r.title),h('p',{},r.summary),h('strong',{},'Confidence: '+r.conf.score+'%'),h('div',{class:'meter','aria-hidden':'true'},meter),h('ul',{class:'chk'},r.conf.items.map(i=>h('li',{class:i.ok?'ok':'no'},(i.ok?'✓ ':'✗ ')+i.label+' (+'+i.points+')')))));
 m.append(sec('What happened',h('p',{},r.summary),r.exc&&h('p',{class:'mono mu'},r.exc.name+(r.exc.msg?': '+r.exc.msg:''))));
 m.append(sec('Why it happened',h('p',{},r.why),r.pattern==='generic'&&h('p',{class:'mu'},'Confidence is lower because no specific rule matched.'),r.doc&&h('a',{href:r.doc,target:'_blank',rel:'noopener noreferrer'},'Learn more (official docs)')));
 if(r.env.mc)m.append(sec('Minecraft',h('dl',{},...[['Minecraft',r.env.mcVer],['Loader',[r.env.loader,r.env.loaderVer].filter(Boolean).join(' ')],['Java',r.env.java],['OS',[r.env.os,r.env.arch].filter(Boolean).join(' ')],['Mixin errors',r.env.mixins||null],['Mods detected',r.env.mods.length||null],['Suspected mod',r.sus&&`${r.sus.id}${r.sus.version?' '+r.sus.version:''} (from ${r.sus.via})`]].filter(x=>x[1]).flatMap(([k,v])=>[h('dt',{},k),h('dd',{},String(v))])),r.sus&&h('p',{class:'mu'},'This is a suspicion, not proof: the mod appears in the failing code path, but another mod or version mismatch could be the real cause.'),r.env.mods.length>0&&h('details',{},h('summary',{},'Mods ('+r.env.mods.length+')'),h('div',{class:'mono mu'},r.env.mods.slice(0,60).map(x=>h('div',{},x.id+' '+x.version))))));
 const ev=sec('Evidence',h('p',{class:'mu'},'Lines from your log that support this conclusion.'),r.evidence.map(e=>h('div',{class:'ev1'},h('div',{class:'mu'},'Line '+e.n),h('pre',{},e.t),h('button',{class:'btn',onclick:()=>jump(e.n)},'Show in original log'))));m.append(ev);
 m.append(sec('Suggested fixes',...r.fixes.map(x=>h('div',{class:'fix'},h('strong',{},x.t),h('div',{},h('span',{class:'tag'},'Difficulty: '+x.d),h('span',{class:'tag'},'Risk: '+x.r)),h('p',{},x.w),x.c&&h('div',{class:'cmd'},h('code',{'aria-label':'Command, not executed'},x.c),h('button',{class:'btn',onclick:()=>copy(x.c)},'Copy')))),r.avoid.length>0&&h('div',{class:'fix'},h('strong',{},'What not to do'),h('ul',{},r.avoid.map(a=>h('li',{},a)))),h('p',{class:'mu'},'Commands are shown for you to review and copy. CrashLens never runs anything.')));
 m.append(aiSection(r));
 m.append(sec('Environment',h('dl',{},...[['Language',r.language],['Platform',r.platform],['Error type',r.errorType],['Severity','Error'],['Java',!r.env.mc&&r.env.java],['Node.js tooling',r.env.node&&'yes']].filter(x=>x[1]).flatMap(([k,v])=>[h('dt',{},k),h('dd',{class:'mono'},String(v))]))));
 m.append(sec('Stack trace ('+(r.frameCount||r.frames.length)+' frames)',r.frames.length?r.frames.slice(0,40).map(f=>h('code',{class:'frame'},`${f.className?f.className+'.':''}${f.function||'(anonymous)'}  ${f.file||''}${f.line?':'+f.line:''}${f.column?':'+f.column:''}`)):h('p',{class:'mu'},'No stack frames were found in this input.')));
 const evs=new Set(r.evidence.map(e=>e.n));const v=(r.lines.length>3000?viewerBig:viewer)(r.lines,evs);m.append(sec('Original log',h('p',{class:'mu'},'All '+r.lines.length.toLocaleString()+' lines were scanned.'),v.el));window.__jump=v.jump}
const jump=n=>window.__jump&&window.__jump(n);
function viewer(lines,ev){const q=h('input',{type:'search',class:'in','aria-label':'Search log',placeholder:'Search (Ctrl/Cmd+F)'}),jn=h('input',{type:'number',class:'in sm','aria-label':'Jump to line',placeholder:'Line',min:1});
 const body=h('div',{class:'lb'+(S.wrap?' wr':''),tabindex:'0',role:'region','aria-label':'Log viewer'});
 const rows=lines.slice(0,5000).map((t,i)=>h('div',{class:'row'+(ev.has(i+1)?' ev':''),id:'L'+(i+1)},h('span',{class:'ln',title:'Copy line',onclick:()=>copy(t)},i+1),h('span',{class:'tx'},t||' ')));body.append(...rows);
 let hits=[],cur=-1;const clr=()=>rows.forEach(r=>r.classList.remove('hit'));
 const go=d=>{clr();if(!hits.length)return;cur=(cur+d+hits.length)%hits.length;hits[cur].classList.add('hit');hits[cur].scrollIntoView({block:'center'})};
 q.addEventListener('input',()=>{const s=q.value.toLowerCase();hits=s?rows.filter((r,i)=>lines[i].toLowerCase().includes(s)):[];cur=-1;go(1)});
 q.addEventListener('keydown',e=>{if(e.key==='Enter')go(e.shiftKey?-1:1);if(e.key==='Escape'){q.value='';hits=[];clr()}});
 const jump=n=>{const r=rows[n-1];if(!r)return toast('Line not shown');clr();r.classList.add('hit');r.scrollIntoView({block:'center'});setTimeout(()=>r.classList.remove('hit'),1800)};
 jn.addEventListener('keydown',e=>{if(e.key==='Enter')jump(+jn.value)});curQ=q;
 const el=h('div',{},h('div',{class:'bar'},q,h('button',{class:'btn','aria-label':'Previous match',onclick:()=>go(-1)},'↑'),h('button',{class:'btn','aria-label':'Next match',onclick:()=>go(1)},'↓'),jn,h('button',{class:'btn',onclick:()=>{body.classList.toggle('wr');S.wrap=body.classList.contains('wr');saveS()}},'Wrap')),body,lines.length>5000&&h('p',{class:'mu'},'Showing the first 5000 of '+lines.length+' lines.'));
 return{el,jump}}
/* Virtualized viewer: only the visible rows exist in the DOM, so 20 MB logs stay smooth. Fixed row height, no wrapping. */
function viewerBig(lines,ev){const RH=20,N=lines.length,MAXC=2000;
 const q=h('input',{type:'search',class:'in','aria-label':'Search log',placeholder:'Search (Ctrl/Cmd+F)'}),jn=h('input',{type:'number',class:'in sm','aria-label':'Jump to line',placeholder:'Line',min:1}),cnt=h('span',{class:'mu','aria-live':'polite'},'');
 const body=h('div',{class:'lb vb',tabindex:'0',role:'region','aria-label':'Log viewer, '+N+' lines'});
 const win=h('div',{class:'vwin'}),sp=h('div',{class:'vsp'},win);sp.style.height=N*RH+'px';body.append(sp);
 let hits=[],cur=-1,hl=-1,raf=0,tm=0,dirty=false;
 const txt=i=>{const t=lines[i]||' ';return t.length>MAXC?t.slice(0,MAXC)+'… ['+(t.length-MAXC)+' more characters]':t};
 const draw=()=>{raf=0;const a=Math.max(0,Math.floor(body.scrollTop/RH)-10),b=Math.min(N,Math.ceil((body.scrollTop+body.clientHeight)/RH)+10);win.style.transform='translateY('+a*RH+'px)';const f=document.createDocumentFragment();
  for(let i=a;i<b;i++)f.append(h('div',{class:'row'+(ev.has(i+1)?' ev':'')+(i===hl?' hit':'')},h('span',{class:'ln',title:'Copy line',onclick:()=>copy(lines[i])},i+1),h('span',{class:'tx'},txt(i))));win.replaceChildren(f)};
 const sched=()=>{if(!raf)raf=requestAnimationFrame(draw)};
 body.addEventListener('scroll',sched);
 if(window.ResizeObserver)new ResizeObserver(sched).observe(body);else setTimeout(draw,0);
 const show=i=>{hl=i;body.scrollTop=Math.max(0,i*RH-body.clientHeight/2);draw()};
 const go=d=>{if(!hits.length)return;cur=(cur+d+hits.length)%hits.length;cnt.textContent=(cur+1)+' / '+hits.length;show(hits[cur])};
 const find=()=>{dirty=false;const s=q.value.toLowerCase();hits=[];if(s)for(let i=0;i<N&&hits.length<20000;i++)if(lines[i].toLowerCase().includes(s))hits.push(i);
  cur=-1;cnt.textContent=s?(hits.length?hits.length+(hits.length>=20000?'+':'')+' matches':'No matches'):'';if(hits.length)go(1);else{hl=-1;draw()}};
 q.addEventListener('input',()=>{dirty=true;clearTimeout(tm);tm=setTimeout(find,200)});
 q.addEventListener('keydown',e=>{if(e.key==='Enter'){clearTimeout(tm);dirty?find():go(e.shiftKey?-1:1)}if(e.key==='Escape'){q.value='';hits=[];hl=-1;cnt.textContent='';draw()}});
 const jump=n=>{if(!(n>=1&&n<=N))return toast('No such line');show(n-1);setTimeout(()=>{if(hl===n-1){hl=-1;draw()}},1800)};
 jn.addEventListener('keydown',e=>{if(e.key==='Enter')jump(+jn.value)});curQ=q;
 return{el:h('div',{},h('div',{class:'bar'},q,h('button',{class:'btn','aria-label':'Previous match',onclick:()=>go(-1)},'↑'),h('button',{class:'btn','aria-label':'Next match',onclick:()=>go(1)},'↓'),jn,cnt),body),jump}}
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='f'&&res&&curQ){e.preventDefault();curQ.focus()}});

function vHistory(m){const a=H();m.append(h('div',{class:'bar'},h('h1',{},'History'),h('span',{class:'sp'}),a.length>0&&h('button',{class:'btn',onclick:function(){if(this.dataset.c){store.set('cl:hist',[]);render()}else{this.dataset.c=1;this.textContent='Confirm clear all'}}},'Clear history')));
 m.append(h('p',{class:'mu'},S.hist?'Entries are stored only in this browser. '+(S.full?'Full logs are being saved with entries (change in Settings).':'Full logs are not stored; only summaries.'):'History saving is turned off in Settings.'));
 if(!a.length)return m.append(h('section',{class:'pn'},h('h2',{},'🔎 No saved analyses yet'),h('p',{},'Analyses you run will appear here.'),h('button',{class:'btn pri',onclick:()=>nav('analyze')},'New analysis')));
 a.forEach(x=>{const t=h('strong',{class:'grow'},x.title);const row=h('div',{class:'hrow'},t,h('span',{class:'tag'},x.language+(x.application!==x.language?' • '+x.application:'')),h('span',{class:'tag'},x.confidence+'%'));
  const rename=()=>{const i=h('input',{class:'in grow','aria-label':'Rename',value:x.title});t.replaceWith(i);i.focus();const done=()=>{const b=H();const e=b.find(z=>z.id===x.id);if(e&&i.value.trim())e.title=i.value.trim();store.set('cl:hist',b);render()};i.addEventListener('keydown',e=>{if(e.key==='Enter')done()});i.addEventListener('blur',done)};
  m.append(h('section',{class:'pn'},row,h('p',{class:'mu'},new Date(x.ts).toLocaleString()+' • '+x.errorType),h('p',{},x.summary),h('div',{class:'bar'},
   h('button',{class:'btn',onclick:()=>{if(x.log){raw=x.log;res=analyze(x.log);view='analyze';render()}else{raw='';nav('analyze');setMsg('info','Full log not stored','Only a summary was saved. Paste or upload the log again to re-open the full analysis.')}}},'Reopen'),h('button',{class:'btn',onclick:rename},'Rename'),h('button',{class:'btn',onclick:()=>{store.set('cl:hist',H().filter(z=>z.id!==x.id));render()}},'Delete'))))})}

function vSettings(m){const tg=(k,l,d)=>h('label',{class:'chkl'},h('input',{type:'checkbox',...(S[k]?{checked:''}:{}),onchange:e=>{S[k]=e.target.checked;saveS()}}),h('span',{},l,h('div',{class:'mu'},d)));
 m.append(h('h1',{},'Settings'),
 sec('Appearance',h('select',{'aria-label':'Theme',onchange:e=>{S.theme=e.target.value;saveS()}},['system','dark','light'].map(v=>h('option',{value:v,...(S.theme===v?{selected:''}:{})},v[0].toUpperCase()+v.slice(1))))),
 sec('Analysis',h('p',{},'The rule-based analysis always runs first, locally.'),h('label',{class:'chkl'},h('input',{type:'checkbox',...(S.aiOn?{checked:''}:{}),onchange:e=>{S.aiOn=e.target.checked;saveS();render()}}),h('span',{},'AI second opinion (external)',h('div',{class:'mu'},S.aiOn?'ON: an Ask AI button appears on results. Nothing is sent until you review a preview and press Send.':'OFF (default). Nothing is ever sent anywhere.'))),S.aiOn&&aiPanel()),
 sec('Privacy',tg('hist','Store history','Save a summary of each analysis in this browser.'),tg('full','Store full logs with history','Saves up to 200 KB of each log in this browser so you can reopen analyses. Logs may contain private paths or usernames.')),
 sec('Editor',tg('ln','Line numbers',''),tg('wrap','Wrap lines in the log viewer',''),h('label',{},'Font size: ',h('input',{type:'range',min:13,max:20,value:S.fs,'aria-label':'Font size',onchange:e=>{S.fs=+e.target.value;saveS()}}))))}

const FM=[['Java','Exception, RuntimeException, NullPointerException, ClassNotFoundException, NoClassDefFoundError, OutOfMemoryError, StackOverflowError, UnsupportedClassVersionError, IllegalArgumentException, IllegalStateException, UnsupportedOperationException, ArrayIndexOutOfBoundsException, ClassCastException.','Parses "at pkg.Class.method(File.java:12)" frames and Caused by chains.','Messages are matched by text; no bytecode or classpath inspection.'],
['Python','Traceback, ModuleNotFoundError, KeyError, ImportError, IndexError, AttributeError, FileNotFoundError, ValueError and TypeError, plus generic handling of other *Error names.','Parses File "x.py", line N, in fn frames.','PermissionError and MemoryError have no dedicated rule yet.'],
['JavaScript / TypeScript / Node.js','TypeError (undefined/null property), ReferenceError, SyntaxError, invalid JSON, maximum call stack, unhandled promise rejections, module resolution, ESM/CommonJS conflicts, npm ERESOLVE and EACCES, TypeScript compiler errors (TSxxxx).','Parses "at fn (file:line:col)" frames.','No source map support. Other npm errors get only a generic explanation.'],
['C / C++','Undefined reference (linker), missing headers, undeclared identifiers and similar compile errors, segmentation fault.','No frame parser.','Only a few common compiler errors have dedicated rules.'],
['Git','Push rejected (non-fast-forward), authentication failures, merge conflicts, detached HEAD.','Text matching only.','No dedicated rules for other remote or rebase errors.'],
['Minecraft','Crash reports and logs for Fabric, Forge, NeoForge, Quilt, Paper, Spigot, Bukkit: LWJGL failures, Mixin failures, missing dependencies, Java version mismatch, Forge/NeoForge mod loading errors, OpenGL/GLFW failures, Paper/Spigot plugin load failures.','Extracts Minecraft/loader/Java versions, OS, mod list (Fabric crash report format), suspected mod from mixin config names and stack packages.','Mod list extraction is tuned to the Fabric crash report layout. A suspected mod is a hint, not proof.'],
['Generic logs','Any text containing an exception-style line or stack frames.','The whole log (up to 25 MB) is scanned in a background worker and shown in a virtualized viewer.','Logs with no recognizable error show a "no recognizable error" message.']];
function vFormats(m){m.append(h('h1',{},'Supported formats'),h('p',{class:'mu'},'What CrashLens understands today. Anything not listed here is not claimed.'));FM.forEach(([n,e,p,l])=>m.append(h('details',{class:'pn'},h('summary',{},h('strong',{},n)),h('p',{},h('b',{},'Errors: '),e),h('p',{},h('b',{},'Parsing: '),p),h('p',{class:'mu'},h('b',{},'Limits: '),l))))}
function vAbout(m){m.append(h('h1',{},'About CrashLens'),sec('Turn scary errors into understandable answers.',h('p',{},'CrashLens is an open-source developer tool designed to make technical errors easier to understand. It analyzes logs locally using deterministic parsers and pattern matching, with optional AI analysis planned for future versions.')),sec('Privacy',h('p',{},'Your logs are processed locally in your browser. Nothing is sent anywhere unless you turn on AI second opinion in Settings and press Send on a preview. Then only the excerpt you reviewed goes directly from your browser to the provider you chose. Uploaded files are read as text only and never executed. Log content is rendered as plain text, never as HTML.')),sec('Not built yet',h('p',{},'A CLI, a GitHub Action, and importing or exporting analysis files are not built yet.')))}
/* Preview banner: shown everywhere except the production site, so this file is safe to merge into main. */
if(location.hostname!=='crashlens.pages.dev')$('#beta').hidden=false;
applyTheme();render();
