import { ERRL } from './stacktrace.js';

/** Shrinks very large logs to error-adjacent lines so the UI and analyzer stay responsive. */
export function reduceLog(t: string): [string, string | null]{const L=t.split('\n');if(t.length<1e6&&L.length<8000)return[t,null];const keep=new Set<number>();
 L.forEach((l,i)=>{if(i<50||i>=L.length-50)keep.add(i);else if(ERRL.test(l.trim())||/^\s+at |Caused by|Traceback|FATAL|fatal:|undefined reference/.test(l))for(let k=Math.max(0,i-1);k<=i+1;k++)keep.add(k)});
 const out: string[]=[];let last=-1;[...keep].sort((a,b)=>a-b).forEach(i=>{if(i!==last+1)out.push('… ['+(i-last-1)+' lines omitted] …');out.push(L[i]);last=i});
 let o=out.join('\n');if(o.length>1e6)o=o.slice(0,5e5)+'\n… [truncated] …\n'+o.slice(-5e5);
 return[o,`This log is ${(t.length/1e6).toFixed(1)} MB. CrashLens extracted the most relevant sections instead of loading the entire file into the analysis interface.`]}

/** Strips carriage returns and ANSI colour codes. Line numbers everywhere refer to the normalized text. */
export function normalizeLog(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').replace(/\x1b\[[0-9;]*m/g, '');
}
