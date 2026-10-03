import { classify } from './classifier.js';
import { score } from './confidence.js';
import { detectEnv, suspectMod } from './environment.js';
import { GEN, P } from './patterns.js';
import { ERRL, parseFrames } from './stacktrace.js';
import type { AnalysisResult, ExcLine } from './types.js';

/**
 * Pipeline: normalize -> extract exceptions -> parse frames -> classify -> detect environment
 * -> match patterns -> collect evidence lines -> score confidence. Deterministic and offline.
 * Returns null when no exception or known pattern is found.
 */
export function analyze(raw: string): AnalysisResult|null{const text=raw.replace(/\r\n?/g,'\n').replace(/\x1b\[[0-9;]*m/g,'');const lines=text.split('\n');
 const excs: ExcLine[]=[];lines.forEach((l,i)=>{const m=l.trim().match(ERRL);if(m)excs.push({n:i+1,name:m[1],msg:m[2]||'',caused:/^Caused by/.test(l.trim())})});
 const frames=parseFrames(lines),language=classify(text,excs,frames),env=detectEnv(text);
 const platform=env.mc?'Minecraft':env.node?'Node.js':language;
 const top: ExcLine|undefined=language==='Python'?excs[excs.length-1]:excs.find(e=>!e.caused)||excs[0];
 const causes=excs.filter(e=>e.caused),root=causes.length?causes[causes.length-1]:top;
 const pat=P.find(p=>(!p.lang||p.lang===language)&&(!p.app||p.app===platform)&&p.re.test(text)&&(!p.need||p.need.test(text)));
 if(!pat&&!top)return null;
 const p=pat||GEN(top),sub=(s: string): string=>{const m=pat&&text.match(pat.re);return s.replace(/\$1/g,m&&m[1]||'<name>')};
 const evN=new Set<number>();if(top)evN.add(top.n);if(root)evN.add(root.n);
 lines.forEach((l,i)=>{if(pat&&(pat.re.test(l)||(pat.need&&pat.need.test(l))))evN.add(i+1)});
 const evidence=[...evN].sort((a,b)=>a-b).slice(0,8).map(n=>({n,t:lines[n-1].trim().slice(0,300)}));
 const sus=env.mc?suspectMod(text,frames,env.mods):null;
 const conf=score({exc:!!top,pat:!!pat,env:platform!==language||!!env.java||!!env.mcVer,frames:frames.length>0,dep:pat&&pat.dep,corr:evidence.length>=2});
 const title=top?top.name.split('.').pop()??top.name:p.n;
 return{version:1,title,language,platform,errorType:title,severity:'error',summary:sub(p.s),why:sub(p.y),pattern:p.id,evidence,
  fixes:p.f.map(x=>({t:sub(x.t),d:x.d,r:x.r,w:sub(x.w),c:x.c?sub(x.c):undefined})),avoid:p.a,doc:p.u,conf,env,frames,sus,exc:top,root,lines}}

