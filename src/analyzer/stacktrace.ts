import type { StackFrame } from './types.js';

/** Matches exception lines like 'Caused by: java.lang.Foo: msg' or 'TypeError: msg'. */
export const ERRL=/^(?:Caused by: |Exception in thread "[^"]*" )?((?:[\w$]+\.)*[A-Z][\w$]*(?:Exception|Error))(?::\s?(.*))?$/;

/** Parses Java, Python and JavaScript stack frames into structured data. */
export function parseFrames(lines: string[]): StackFrame[]{const o: StackFrame[]=[];lines.forEach((l,i)=>{let m;
 if(m=l.match(/^\s*at (?:[\w.]+\/)?([\w.$<>]+)\.([\w$<>]+)\(([^():]+):(\d+)\)/))o.push({language:'Java',className:m[1],function:m[2],file:m[3],line:+m[4],n:i+1});
 else if(m=l.match(/^\s*File "([^"]+)", line (\d+), in (\S+)/))o.push({language:'Python',file:m[1],line:+m[2],function:m[3],n:i+1});
 else if(m=l.match(/^\s*at (?:(.+?) \()?((?:file:\/\/|\/|[A-Za-z]:\\|\.)?[^\s()]+):(\d+):(\d+)\)?$/))o.push({language:'JavaScript',function:m[1],file:m[2],line:+m[3],column:+m[4],n:i+1})});return o}

