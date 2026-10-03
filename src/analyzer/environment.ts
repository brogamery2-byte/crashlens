import type { Env, Mod, StackFrame, Suspect } from './types.js';

/** Detects Minecraft/loader/Java/OS details and Node tooling from raw log text. */
export function detectEnv(text: string): Env{const g=(r: RegExp): string|null=>{const m=text.match(r);return m?(m.slice(1).find(Boolean)??null):null};
 const mc=/minecraft|fabricloader|neoforge|org\.bukkit|io\.papermc/i.test(text);
 const loader=!mc?null:/neoforge/i.test(text)?'NeoForge':/fabric/i.test(text)?'Fabric':/quilt/i.test(text)?'Quilt':/minecraftforge|\bforge\b/i.test(text)?'Forge':/papermc|\bPaper\b/.test(text)?'Paper':/spigot/i.test(text)?'Spigot':/bukkit/i.test(text)?'Bukkit':null;
 const mods: Mod[]=[];for(const m of text.matchAll(/^\t+([a-z][a-z0-9_-]+): .+? (\d[\w.+\-]*)$/gm)){if(mods.length<300)mods.push({id:m[1],version:m[2]})}
 const node=/npm ERR!|node:internal|ERR_MODULE_NOT_FOUND|Cannot find module|ERR_REQUIRE_ESM/.test(text);
 return{mc,loader,mods,node,mcVer:g(/Minecraft Version:\s*(\S+)/)||g(/Minecraft (1\.\d+(?:\.\d+)?)/),loaderVer:g(/Fabric Loader\s+(\d[\w.\-+]*)/)||g(/fabricloader[ -](\d[\w.\-+]*)/i),
  java:g(/Java Version:\s*([\d._]+)/)||g(/(?:openjdk|java) version "([^"]+)"/i)||g(/Java (\d+(?:\.\d+)*)/),os:g(/Operating System:\s*(.+)/)||g(/\bos\.name\W+(.+)/),arch:g(/\((amd64|x86_64|aarch64|arm64|x86)\)/),
  mixins:(text.match(/Mixin apply failed|MixinApplyError|InvalidInjectionException|MixinTransformerError|Critical injection failure/g)||[]).length}}

export function suspectMod(text: string, frames: StackFrame[], mods: Mod[]): Suspect|null{const ids=new Set(mods.map(m=>m.id));const c: [string,string][]=[];
 for(const m of text.matchAll(/([a-z][a-z0-9_-]+)\.mixins?\.json/gi))c.push([m[1].toLowerCase(),'mixin config name']);
 for(const f of frames)for(const seg of (f.className||'').toLowerCase().split('.'))if(ids.has(seg))c.push([seg,'stack frame package']);
 const s=c.find(x=>!/^(fabric|minecraft|java|mixinextras|mixin)/.test(x[0]));return s?{id:s[0],via:s[1],version:mods.find(m=>m.id===s[0])?.version}:null}

