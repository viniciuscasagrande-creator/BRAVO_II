import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module.js';
import {validateHomologationEnv} from '@bravo-ii/core-policy';
async function bootstrap(){
  const problems=validateHomologationEnv(process.env);
  if(problems.length)throw new Error('Configuração de homologação recusada: '+problems.join('; '));
  const app=await NestFactory.create(AppModule,{cors:false});
  app.enableShutdownHooks();
  app.use((_req:unknown,res:{setHeader:(key:string,value:string)=>void},next:()=>void)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');next();});
  const port=Number(process.env.PORT||4100);
  await app.listen(port,'0.0.0.0');
  console.info(`BRAVO_II API homologação na porta ${port}`);
}
void bootstrap();
