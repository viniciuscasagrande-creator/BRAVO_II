import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {createHmac} from 'node:crypto';
import {CustomerInput,SalesRuleError,validateCustomer} from '@bravo-ii/domain-p08';
import {CorePrismaService} from '../../core/prisma/prisma.service.js';
import {Actor,requireInternal} from '../pacote06/security.js';

function parseCustomer(input:CustomerInput){
  try {return validateCustomer(input);}catch(e){if(e instanceof SalesRuleError)throw new BadRequestException(e.message);throw e;}
}
@Injectable()
export class BravoCustomersService {
  constructor(private readonly db:CorePrismaService){}
  private getPepper(){
    const secret=process.env.CPF_HASH_PEPPER||'';
    if(secret.length<32)throw new Error('CPF_HASH_PEPPER precisa ter no mínimo 32 caracteres privados');
    return secret;
  }
  private fingerprint(cpf:string){return createHmac('sha256',this.getPepper()).update(`bravo-ii:cpf:v1:${cpf}`).digest('hex');}
  async create(input:CustomerInput,actor:Actor){
    requireInternal(actor,'ADMIN','OPERACOES','SAC');
    const data=parseCustomer(input);
    const cpfFingerprint=this.fingerprint(data.cpf);
    const existing=await this.db.bravoCustomer.findUnique({where:{cpfFingerprint},select:{id:true}});
    if(existing)throw new ConflictException('CPF já cadastrado');
    try {return await this.db.$transaction(async tx=>{
      const customer=await tx.bravoCustomer.create({data:{fullName:data.fullName,cpfFingerprint,cpfLast4:data.cpf.slice(-4),email:data.email,phone:data.phone,birthDate:data.birthDate,address:data.address??undefined,marketingOptIn:data.marketingOptIn,createdBy:actor.id}});
      // CPF, e-mail, telefone e endereço NUNCA entram no log.
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'CLIENTE_CADASTRADO',resource:'CLIENTE',resourceId:customer.id,after:{marketingOptIn:customer.marketingOptIn}}});
      return this.toView(customer);
    });}catch(e){if((e as {code?:string}).code==='P2002')throw new ConflictException('CPF já cadastrado');throw e;}
  }
  async search(query:string,actor:Actor){
    requireInternal(actor,'ADMIN','OPERACOES','SAC','AUDITOR');
    const term=(query||'').trim().toLowerCase();
    if(term.length<4||term.length>120)throw new BadRequestException('Informe 4 a 120 caracteres para pesquisar');
    const list=await this.db.bravoCustomer.findMany({where:{OR:[{email:{contains:term,mode:'insensitive'}},{fullName:{contains:term,mode:'insensitive'}}]},orderBy:{createdAt:'desc'},take:25});
    return {items:list.map(c=>this.toView(c))};
  }
  async get(id:string,actor:Actor){
    requireInternal(actor,'ADMIN','OPERACOES','SAC','AUDITOR');
    const item=await this.db.bravoCustomer.findUnique({where:{id}});
    if(!item)throw new NotFoundException('Cliente não encontrado');
    return this.toView(item);
  }
  private toView(c:{id:string;fullName:string;cpfLast4:string;email:string;phone:string;birthDate:Date|null;marketingOptIn:boolean;createdAt:Date}){
    return {id:c.id,fullName:c.fullName,cpfDisplay:`***.***.***-${c.cpfLast4.slice(-2)}`,email:c.email,phone:c.phone,birthDate:c.birthDate,marketingOptIn:c.marketingOptIn,createdAt:c.createdAt};
  }
}
