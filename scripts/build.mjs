import {mkdir,copyFile,cp,readdir} from 'node:fs/promises';
import path from 'node:path';
// Only ship the reviewed public files; never publish the workspace root.
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'dist');
await mkdir(out,{recursive:true});
const allowed=new Set(['index.html','app.js','style.css','assets','navigation','navigation']);
for(const file of await readdir(out))if(!allowed.has(file))throw new Error(`Unexpected deployment file: ${file}`);
for(const name of ['index.html','app.js','style.css'])await copyFile(path.join(root,name),path.join(out,name));
await cp(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
console.log('Built public frontend in dist/');





await cp(path.join(root,'navigation'),path.join(out,'navigation'),{recursive:true});
