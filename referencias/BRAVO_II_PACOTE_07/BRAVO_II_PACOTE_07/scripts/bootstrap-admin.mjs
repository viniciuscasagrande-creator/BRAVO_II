import {PrismaClient} from '@prisma/client';
import {scrypt as _scrypt,randomBytes} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(_scrypt);
if(process.env.BRAVO_BOOTSTRAP_ADMIN!=='true')throw Error('Para bootstrap explícito, use BRAVO_BOOTSTRAP_ADMIN=true');
const email=(process.env.BRAVO_ADMIN_EMAIL||'').trim().toLowerCase();
const password=process.env.BRAVO_ADMIN_PASSWORD||'';
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||password.length>256)throw Error('Informe BRAVO_ADMIN_EMAIL e senha forte (12 a 256 caracteres)');
const db=new PrismaClient();
try {
 const count=await db.bravoIdentityUser.count();
 if(count!==0)throw Error('Bootstrap recusado: já existe usuário. Use o processo de administração para novos acessos.');
 const salt=randomBytes(16).toString('base64url');
 const hash=(await scrypt(password,salt,64)).toString('base64url');
 await db.$transaction(async tx=>{
  const user=await tx.bravoIdentityUser.create({data:{email,passwordHash:`scrypt$v1$${salt}$${hash}`,roles:['ADMIN']}});
  await tx.bravoAudit.create({data:{actorId:user.id,action:'BOOTSTRAP_ADMIN',resource:'USUARIO',resourceId:user.id}});
 });
 console.log('Administrador inicial criado. Desative BRAVO_BOOTSTRAP_ADMIN e apague a senha do ambiente.');
} finally {await db.$disconnect();}
