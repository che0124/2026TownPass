import {readdir,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {labels,localizedLabel,floorLabel} from '../navigation/labels.mjs';
const root=path.resolve(import.meta.dirname,'..');
const files=['app.js',...(await readdir(path.join(root,'navigation'))).filter(n=>n.endsWith('.mjs')).map(n=>'navigation/'+n)];
for(const file of files){const result=spawnSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
const data=JSON.parse(await readFile(path.join(root,'navigation/station.json'),'utf8'));
for(const lang of ['en','id']){
 for(const item of [...data.nodes,...data.facilities]){assert(labels[item.id]?.[lang],`Missing ${lang}: ${item.id}`);assert(!/[\u3400-\u9fff]/u.test(localizedLabel(item,lang)),`Untranslated ${lang}: ${item.id}`);}
 for(const level of data.levels)assert(!/[\u3400-\u9fff]/u.test(floorLabel(level,lang)));
 for(const edge of data.edges)if(edge.facility_id)assert(labels[edge.facility_id]?.[lang],`Missing facility label: ${edge.facility_id}`);
}
console.log('Checked JavaScript syntax and complete English / Indonesian station labels.');
