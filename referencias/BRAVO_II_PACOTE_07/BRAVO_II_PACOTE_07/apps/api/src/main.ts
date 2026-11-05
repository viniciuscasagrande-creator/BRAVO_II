import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module.js';
async function bootstrap(){
  for(const key of ['DATABASE_URL','APP_ORIGIN'])if(!process.env[key])throw new Error(`Configure ${key} antes de iniciar`);
  if(process.env.ENABLE_EXTERNAL_PUBLICATION!=='false'||process.env.ENABLE_REAL_PAYMENTS!=='false'||process.env.ENABLE_REAL_REFUNDS!=='false')throw new Error('Operações externas devem permanecer desativadas na homologação');
  if(process.env.NODE_ENV==='production' && (process.env.COOKIE_SECURE!=='true'|| !process.env.APP_ORIGIN?.startsWith('https://'))) throw new Error('Produção/Preview requer HTTPS e cookie Secure');
  const app=await NestFactory.create(AppModule,{cors:false});
  app.enableShutdownHooks();
  app.use((_req:unknown,res:{setHeader:(key:string,value:string)=>void},next:()=>void)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');next();});
  const port=Number(process.env.PORT||4100);
  await app.listen(port,'0.0.0.0');
  console.info(`BRAVO_II API homologação na porta ${port}`);
}
void bootstrap();
