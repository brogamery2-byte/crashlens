import type { ExcLine, Language, StackFrame } from './types.js';

/** Deterministic language detection from exception names, frames and well-known phrases. */
export function classify(text: string, excs: ExcLine[], frames: StackFrame[]): Language{const names=excs.map(e=>e.name).join(' ');let language: Language='Unknown';
 if(/^(fatal|error): |\[(remote )?rejected\]|CONFLICT \(|Permission denied \(publickey\)|Authentication failed/m.test(text)&&!/Exception|Traceback/.test(text))language='Git';
 else if(/undefined reference to|[Ss]egmentation fault|SIGSEGV|ld returned \d+/.test(text))language='C/C++';
 else if(/Traceback \(most recent call last\)|No module named|\b(ModuleNotFound|Import|Key|Index|Attribute|FileNotFound|Permission|Memory)Error\b/.test(text)&&!/\.java:\d+/.test(text))language='Python';
 else if(frames.some(f=>f.language==='Java')||/\bjava\.[a-z]|\.java:\d+|(Exception|Error)\b.*\bnet\.minecraft|Fabric Loader|Mod resolution failed|Incompatible mods found|mandatory dependencies/.test(text)||/(?:[a-z]+\.)+[A-Z]\w*(Exception|Error)/.test(names))language='Java';
 else if(frames.some(f=>f.language==='JavaScript')||/\b(Type|Reference|Syntax|Range)Error\b|Cannot read propert|ERR_MODULE_NOT_FOUND|Cannot find module|npm ERR!/.test(text))language='JavaScript';
 return language}

