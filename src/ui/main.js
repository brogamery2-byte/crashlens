import './style.css';
import { SAMPLES, analyze, reduceLog } from '../analyzer/index.ts';

/* UI layer. All analysis comes from src/analyzer (tested TypeScript); this file only renders it. */
const $=s=>document.querySelector(s);
const h=(t,a={},...c)=>{const e=document.createElement(t);for(const k in a){if(k==='class')e.className=a[k];else if(k.startsWith('on'))e.addEventListener(k.slice(2),a[k]);else e.setAttribute(k,a[k])}for(const x of c.flat())if(x!=null&&x!==false)e.append(x.nodeType?x:document.createTextNode(String(x)));return e};
const store={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
const toast=t=>{const e=$('#toast');e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),1400)};
const copy=t=>{try{navigator.clipboard.writeText(t).then(()=>toast('Copied'),()=>toast('Copy blocked by browser'))}catch{toast('Copy blocked by browser')}};

/* ---------- Settings (persisted locally) ---------- */
const S=Object.assign({theme:'system',hist:true,full:false,fs:16,wrap:false,ln:true},store.get('cl:settings',{}));
const saveS=()=>{store.set('cl:settings',S);applyTheme()};
function applyTheme(){const r=document.documentElement;S.theme==='system'?r.removeAttribute('data-theme'):r.dataset.theme=S.theme;r.style.setProperty('--fs',S.fs+'px')}

/* ---------- App state & views ---------- */
let view='analyze',res=null,raw='',curQ=null;
const H=()=>store.get('cl:hist',[]);
function setMsg(kind,title,body){const m=$('#msg');if(!m)return;m.replaceChildren(h('div',{class:'msg '+kind,role:'alert'},h('b',{},({info:'ⓘ ',warn:'▲ ',err:'✕ '}[kind])+title),body))}
function save(r,t){if(!S.hist)return;const a=H();a.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),ts:Date.now(),title:r.title,language:r.language,application:r.platform,errorType:r.errorType,summary:r.summary,confidence:r.conf.score,log:S.full?t.slice(0,200000):undefined});store.set('cl:hist',a.slice(0,100))}
function nav(v){view=v;res=null;render()}
function render(){const m=$('#main');m.replaceChildren();document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.v===view?'page':'false'));window.scrollTo(0,0);({analyze:vAnalyze,history:vHistory,formats:vFormats,settings:vSettings,about:vAbout})[view](m)}
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.v)));

function vAnalyze(m){if(res)return vResult(m);
 const ta=h('textarea',{'aria-label':'Error or log input',spellcheck:'false',autocapitalize:'off',autocomplete:'off',autocorrect:'off',wrap:'off',placeholder:'Paste an error, stack trace or log, or drop a log file here'});ta.value=raw;
 const gut=h('div',{class:'gut','aria-hidden':'true'}),ed=h('div',{class:'ed'},gut,ta);
 const sync=()=>{raw=ta.value;gut.style.display=S.ln?'':'none';gut.textContent=S.ln?Array.from({length:Math.min(raw.split('\n').length,20000)},(_,i)=>i+1).join('\n'):'';gut.scrollTop=ta.scrollTop};
 ta.addEventListener('input',sync);ta.addEventListener('scroll',()=>{gut.scrollTop=ta.scrollTop});
 const load=(t)=>{const[o,note]=reduceLog(t);ta.value=o;sync();setMsg('info',note?'Large log':'Loaded',note||'File loaded as text. It is never executed.')};
 const readFile=async f=>{if(f.size>25e6)return setMsg('err','File too large','CrashLens accepts text files up to 25 MB.');
  if(/\.(exe|dll|so|png|jpe?g|gif|zip|jar|class|pdf|bin)$/i.test(f.name))return setMsg('err','Unsupported file','CrashLens only reads text files such as .txt, .log, .crash, .md, .json and .xml.');
  const t=await f.text();if(t.slice(0,2000).includes('\u0000'))return setMsg('err','Unsupported file','This looks like a binary file. Upload a text log instead.');load(t)};
 ed.addEventListener('dragover',e=>{e.preventDefault();ed.classList.add('drop')});ed.addEventListener('dragleave',()=>ed.classList.remove('drop'));
 ed.addEventListener('drop',e=>{e.preventDefault();ed.classList.remove('drop');const f=e.dataTransfer.files[0];if(f)readFile(f)});
 const fi=h('input',{type:'file',accept:'.txt,.log,.crash,.md,.json,.xml,.out,.csv,text/*',hidden:'',onchange:()=>{if(fi.files[0])readFile(fi.files[0]);fi.value=''}});
 const sel=h('select',{'aria-label':'Try an example',onchange:()=>{if(sel.value){ta.value=SAMPLES[sel.value];sync();setMsg('info','Example loaded','Press Analyze to run it.')}sel.value=''}},h('option',{value:''},'Try an example'),Object.keys(SAMPLES).map(k=>h('option',{value:k},k)));
 const run=()=>{const t=ta.value;if(!t.trim())return setMsg('info','Nothing to analyze yet','Paste an error, drop a log file, or try one of the examples.');
  try{const r=analyze(t);if(!r)return setMsg('warn','No recognizable error found','CrashLens found no exception, stack trace or known error pattern. Include the full output around the failure, including lines that start with "Caused by" or "Traceback".');res=r;raw=t;save(r,t);render()}catch(e){setMsg('err','Analysis failed',String(e&&e.message||e))}};
 m.append(h('div',{class:'bar'},h('button',{class:'btn pri',onclick:run},'Analyze'),h('button',{class:'btn',onclick:async()=>{try{ta.value=await navigator.clipboard.readText();sync()}catch{setMsg('warn','Paste blocked','Your browser blocked clipboard access. Long-press the editor and choose Paste.')}}},'Paste'),h('button',{class:'btn',onclick:()=>fi.click()},'Upload'),sel,h('span',{class:'sp'}),h('button',{class:'btn',onclick:()=>{ta.value='';sync();$('#msg').replaceChildren()}},'Clear')),fi,ed,h('div',{id:'msg'}),
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
 m.append(sec('Environment',h('dl',{},...[['Language',r.language],['Platform',r.platform],['Error type',r.errorType],['Severity','Error'],['Java',!r.env.mc&&r.env.java],['Node.js tooling',r.env.node&&'yes']].filter(x=>x[1]).flatMap(([k,v])=>[h('dt',{},k),h('dd',{class:'mono'},String(v))]))));
 m.append(sec('Stack trace ('+r.frames.length+' frames)',r.frames.length?r.frames.slice(0,40).map(f=>h('code',{class:'frame'},`${f.className?f.className+'.':''}${f.function||'(anonymous)'}  ${f.file||''}${f.line?':'+f.line:''}${f.column?':'+f.column:''}`)):h('p',{class:'mu'},'No stack frames were found in this input.')));
 const v=viewer(r.lines,new Set(r.evidence.map(e=>e.n)));m.append(sec('Original log',v.el));window.__jump=v.jump}
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
 sec('Analysis',h('p',{},'Rule-based (local, deterministic). This is the only analysis mode implemented.'),h('label',{class:'chkl'},h('input',{type:'checkbox',disabled:'',...{}}),h('span',{},'External AI analysis: OFF',h('div',{class:'mu'},'Not implemented yet. When added, it will stay off by default and will tell you exactly what would be sent before anything leaves your device.')))),
 sec('Privacy',tg('hist','Store history','Save a summary of each analysis in this browser.'),tg('full','Store full logs with history','Saves up to 200 KB of each log in this browser so you can reopen analyses. Logs may contain private paths or usernames.')),
 sec('Editor',tg('ln','Line numbers',''),tg('wrap','Wrap lines in the log viewer',''),h('label',{},'Font size: ',h('input',{type:'range',min:13,max:20,value:S.fs,'aria-label':'Font size',onchange:e=>{S.fs=+e.target.value;saveS()}}))))}

const FM=[['Java','Exception, RuntimeException, NullPointerException, ClassNotFoundException, NoClassDefFoundError, OutOfMemoryError, StackOverflowError, UnsupportedClassVersionError, IllegalArgumentException, IllegalStateException, UnsupportedOperationException, ArrayIndexOutOfBoundsException, ClassCastException.','Parses "at pkg.Class.method(File.java:12)" frames and Caused by chains.','Messages are matched by text; no bytecode or classpath inspection.'],
['Python','Traceback, ModuleNotFoundError, KeyError, ImportError, IndexError, AttributeError, FileNotFoundError, ValueError and TypeError, plus generic handling of other *Error names.','Parses File "x.py", line N, in fn frames.','PermissionError and MemoryError have no dedicated rule yet.'],
['JavaScript / TypeScript / Node.js','TypeError (undefined/null property), ReferenceError, SyntaxError, invalid JSON, maximum call stack, unhandled promise rejections, module resolution, ESM/CommonJS conflicts, npm ERESOLVE and EACCES, TypeScript compiler errors (TSxxxx).','Parses "at fn (file:line:col)" frames.','No source map support. Other npm errors get only a generic explanation.'],
['C / C++','Undefined reference (linker), missing headers, undeclared identifiers and similar compile errors, segmentation fault.','No frame parser.','Only a few common compiler errors have dedicated rules.'],
['Git','Push rejected (non-fast-forward), authentication failures, merge conflicts, detached HEAD.','Text matching only.','No dedicated rules for other remote or rebase errors.'],
['Minecraft','Crash reports and logs for Fabric, Forge, NeoForge, Quilt, Paper, Spigot, Bukkit: LWJGL failures, Mixin failures, missing dependencies, Java version mismatch, Forge/NeoForge mod loading errors, OpenGL/GLFW failures, Paper/Spigot plugin load failures.','Extracts Minecraft/loader/Java versions, OS, mod list (Fabric crash report format), suspected mod from mixin config names and stack packages.','Mod list extraction is tuned to the Fabric crash report layout. A suspected mod is a hint, not proof.'],
['Generic logs','Any text containing an exception-style line or stack frames.','Large logs are reduced to error-adjacent lines in the main thread (no Web Worker yet).','Logs with no recognizable error show a "no recognizable error" message.']];
function vFormats(m){m.append(h('h1',{},'Supported formats'),h('p',{class:'mu'},'What CrashLens understands today. Anything not listed here is not claimed.'));FM.forEach(([n,e,p,l])=>m.append(h('details',{class:'pn'},h('summary',{},h('strong',{},n)),h('p',{},h('b',{},'Errors: '),e),h('p',{},h('b',{},'Parsing: '),p),h('p',{class:'mu'},h('b',{},'Limits: '),l))))}
function vAbout(m){m.append(h('h1',{},'About CrashLens'),sec('Turn scary errors into understandable answers.',h('p',{},'CrashLens is an open-source developer tool designed to make technical errors easier to understand. It analyzes logs locally using deterministic parsers and pattern matching, with optional AI analysis planned for future versions.')),sec('Privacy',h('p',{},'Your logs are processed locally in your browser. This version has no external AI provider and sends nothing anywhere. Uploaded files are read as text only and never executed. Log content is rendered as plain text, never as HTML.')),sec('Not built yet',h('p',{},'AI analysis, CLI, GitHub Action, import/export files, Web Worker parsing, and a full multi-package React/Vite codebase with tests. This page is a single-file build of the core app.')))}
/* Preview banner: shown everywhere except the production site, so this file is safe to merge into main. */
if(location.hostname!=='crashlens.pages.dev')$('#beta').hidden=false;
applyTheme();render();
