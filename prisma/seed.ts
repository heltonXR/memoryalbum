import sharp from 'sharp';
import { db } from '../src/lib/db';
import { processImage } from '../src/lib/images';
const categories=[['Cerimónia',12],['Entradas',8],['Graduados',14],['Convidados',9],['Família',11],['Amigos',10],['Momentos espontâneos',13],['Celebração',9],['Destaques',6]] as const;
const ratios=[[4,5],[4,3],[1,1],[2,3],[3,2]];
async function main(){
 const album=await db.album.upsert({where:{slug:'graduacao-2026'},create:{slug:'graduacao-2026',title:'Graduação das Gêmeas 2026',subtitle:'Um dia para recordar.',eventDate:new Date('2026-10-16T12:00:00Z'),visibility:'PUBLIC'},update:{}});
 const multiplier=Math.max(1,Number(process.env.DEMO_MULTIPLIER||1));
 for(const [ci,[name,count]] of categories.entries()){
 let cat=await db.category.findFirst({where:{albumId:album.id,name}});if(!cat)cat=await db.category.create({data:{albumId:album.id,name,order:ci}});
 const existing=await db.photo.count({where:{categoryId:cat.id}});
 for(let i=existing;i<count*multiplier;i++){
 const [rw,rh]=ratios[(ci+i)%ratios.length];const w=rw*360,h=rh*360,hue=(ci*37+i*7)%360;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="hsl(${hue},35%,65%)"/><stop offset="1" stop-color="hsl(${hue+35},40%,22%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w*.6}" cy="${h*.3}" r="${w*.15}" fill="#f5dfb6" opacity=".45"/><path d="M0 ${h} Q${w*.5} ${h*.2} ${w} ${h} Z" fill="#171514" opacity=".3"/></svg>`;
 const jpg=await sharp(Buffer.from(svg)).jpeg({quality:92}).toBuffer();
 const photo=await db.photo.create({data:{...await processImage(jpg,album.id),albumId:album.id,categoryId:cat.id,alt:`Demonstração — ${name}, fotografia ${i+1}`,order:i,featured:name==='Destaques'}});
 if(i===0){await db.category.update({where:{id:cat.id},data:{coverPhotoId:photo.id}});if(ci===0&&!album.coverPhotoId)await db.album.update({where:{id:album.id},data:{coverPhotoId:photo.id}});}
 }
 }
 console.log('Álbum de demonstração pronto: /a/graduacao-2026');
}
main().finally(()=>db.$disconnect());
