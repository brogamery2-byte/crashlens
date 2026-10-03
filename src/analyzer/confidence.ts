import type { Confidence, ScoreInput } from './types.js';

/* Confidence: fixed weights, summed from evidence flags (max 100). Same input always gives the same score. */
export function score(f: ScoreInput): Confidence{const items=([['Known exception type',25,f.exc],['Matched a specific error pattern',25,f.pat],['Known environment',15,f.env],['Relevant stack frame',15,f.frames],['Known dependency relationship',10,f.dep],['Corroborating evidence (2+ matching lines)',10,f.corr]] as [string,number,unknown][]).map(([label,points,ok])=>({label,points,ok:!!ok}));return{score:items.reduce((a,i)=>a+(i.ok?i.points:0),0),items}}

