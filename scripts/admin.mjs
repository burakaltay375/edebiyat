import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const [username,scope='--local']=process.argv.slice(2);
if(!username||!/^[a-z0-9_]{3,32}$/.test(username)||!['--local','--remote'].includes(scope))throw new Error('Kullanım: node scripts/admin.mjs kullanici_adi --local|--remote');
const prepared=spawnSync(process.execPath,[path.join(root,'scripts/project.mjs'),'prepare'],{stdio:'inherit'});if(prepared.status)process.exit(prepared.status);
const sql=`UPDATE student_accounts SET role='admin' WHERE username='${username}'; SELECT username,role FROM student_accounts WHERE username='${username}';`;
const result=spawnSync(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),'d1','execute','DB',scope,'--config','wrangler.json','--command',sql],{cwd:path.join(root,'.runtime'),stdio:'inherit'});process.exit(result.status??1);
