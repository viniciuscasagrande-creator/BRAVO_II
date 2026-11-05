import {createHash,createHmac,randomBytes,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export function newSessionToken():string {return randomBytes(32).toString('base64url');}
export function hashSessionToken(token:string):string{return createHash('sha256').update(token).digest('hex');}
export function csrfForToken(token:string):string {return createHmac('sha256',token).update('bravo-ii:csrf:v1').digest('hex');}
export function compareSecret(a:string,b:string):boolean {
  if(!a || !b || a.length!==b.length)return false;
  return timingSafeEqual(Buffer.from(a,'utf8'),Buffer.from(b,'utf8'));
}
export async function hashPassword(password:string):Promise<string> {
  if(typeof password!=='string'||password.length<12||password.length>256)throw new Error('Senha fora da política exigida');
  const salt=randomBytes(16).toString('base64url');
  const hash=(await scrypt(password,salt,64)) as Buffer;
  return `scrypt$v1$${salt}$${hash.toString('base64url')}`;
}
export async function verifyPassword(password:string,encoded:string):Promise<boolean> {
  if(typeof password!=='string'||password.length>256)return false;
  const parts=encoded.split('$');
  if(parts.length!==4||parts[0]!=='scrypt'||parts[1]!=='v1'||!/^[A-Za-z0-9_-]+$/.test(parts[2]))return false;
  const stored=Buffer.from(parts[3],'base64url');
  if(stored.length!==64)return false;
  const derived=(await scrypt(password,parts[2],64)) as Buffer;
  return timingSafeEqual(stored,derived);
}
