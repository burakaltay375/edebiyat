import ts from "typescript";import fs from "node:fs";import path from "node:path";import {pathToFileURL} from "node:url";import {spawnSync} from "node:child_process";
const files=["tests/integration.ts","lib/student-auth.ts","lib/student-data.ts","tests/env.ts","tests/headers.ts","tests/navigation.ts","app/api/[...path]/route.ts","app/chatgpt-auth.ts","db/raw.ts","db/seed.ts","lib/ai.ts","lib/ai-usage.ts","lib/feature-access.ts","lib/repository.ts","lib/content.ts","lib/question-engine.ts","lib/learning.ts"];
const aliases={"cloudflare:workers":"tests/env.ts","next/headers":"tests/headers.ts","next/navigation":"tests/navigation.ts"};
const destination=f=>path.resolve("work/testbuild",f.replace(/\.ts$/,".mjs"));
for(const file of files){
 let source=fs.readFileSync(file,"utf8");source=source.replace(/import (\w+) from ["']([^"']+\.json)["'];?/g,(_,name,p)=>"const "+name+"="+fs.readFileSync(path.resolve(path.dirname(file),p),"utf8")+";");
 let output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 output=output.replace(/(from\s*|import\s*\()(["'])([^"']+)\2/g,(all,prefix,quote,spec)=>{const target=aliases[spec]||(spec.startsWith(".")?path.relative(process.cwd(),path.resolve(path.dirname(file),spec)).replaceAll("\\","/")+".ts":null);return target?prefix+quote+pathToFileURL(destination(target)).href+quote:all});
 fs.mkdirSync(path.dirname(destination(file)),{recursive:true});fs.writeFileSync(destination(file),output);
}
const r=spawnSync(process.execPath,[destination("tests/integration.ts")],{stdio:"inherit"});process.exit(r.status??1);
