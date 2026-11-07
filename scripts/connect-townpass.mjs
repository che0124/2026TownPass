import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const [checkout,url]=process.argv.slice(2);
if(!checkout||!url)throw new Error('Usage: node scripts/connect-townpass.mjs <TownPass path> <deployed HTTPS URL>');
const parsed=new URL(url);
if(parsed.protocol!=='https:')throw new Error('TownPass entry requires HTTPS');
const file=path.resolve(checkout,'lib/page/city_service/model/my_service_model.dart');
let source=await readFile(file,'utf8');
if(source.includes('stationPhotoGuide'))throw new Error('Entry already exists; review before updating.');
if(!source.includes('iconLocationSearch24')||!source.includes('MyServiceCategory.explore'))throw new Error('Unexpected TownPass model');
const newline=source.includes('\r\n')?'\r\n':'\n';
source=source.replace(/(  zoo,\r?\n)/,`$1  stationPhotoGuide,${newline}`);
const entry=[
"      MyServiceItemId.stationPhotoGuide => MyServiceItem(",
"          title: '北車好走',",
"          description: '看照片、聽指引，找到北車目的地',",
"          icon: Assets.svg.iconLocationSearch24.svg(),",
"          category: MyServiceCategory.explore,",
`          destinationUrl: '${parsed.href}',`,
"          forceWebViewTitle: '北車好走',",
"        ),",
].join(newline)+newline;
const marker='      MyServiceItemId.zoo => MyServiceItem(';
if(!source.includes(marker))throw new Error('Service switch marker missing');
source=source.replace(marker,entry+marker);
if((source.match(/stationPhotoGuide/g)||[]).length!==2)throw new Error('Incomplete entry insertion');
await writeFile(file,source,'utf8');
console.log('Added stationPhotoGuide entry: '+parsed.href);
