import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {validateProducer,normalizeCnpj,ProducerInput,ensure} from '@bravo-ii/domain-p06';
import {P06PrismaService} from './prisma.js';
import {Actor,requireInternal} from './security.js';

@Injectable()
export class ProducersService {
  constructor(private readonly db:P06PrismaService){}
  async create(body:ProducerInput,actor:Actor){
    requireInternal(actor,'ADMIN','COMERCIAL','CADASTRO'); validateProducer(body);
    const cnpj=normalizeCnpj(body.cnpj);
    const found=await this.db.bravoProducer.findUnique({where:{cnpj}});
    if(found) throw new ConflictException('Produtora já cadastrada');
    return this.db.$transaction(async tx=>{
      const p=await tx.bravoProducer.create({data:{legalName:body.legalName.trim(),tradeName:body.tradeName?.trim(),cnpj,email:body.email.trim().toLowerCase(),phone:body.phone,address:body.address,representative:body.legalRepresentative,createdBy:actor.id}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'PRODUTOR_CRIADO',resource:'PRODUTOR',resourceId:p.id,after:{status:p.status,cnpj:p.cnpj}}});
      return p;
    });
  }
  async list(actor:Actor){requireInternal(actor,'ADMIN','COMERCIAL','CADASTRO','OPERACOES','FINANCEIRO_DISK','AUDITOR');return this.db.bravoProducer.findMany({orderBy:{createdAt:'desc'},take:100,select:{id:true,legalName:true,tradeName:true,cnpj:true,status:true,createdAt:true}});}
  async get(id:string,actor:Actor){requireInternal(actor,'ADMIN','COMERCIAL','CADASTRO','OPERACOES','AUDITOR');const p=await this.db.bravoProducer.findUnique({where:{id},include:{documents:true,events:{select:{eventId:true,role:true}}}});if(!p) throw new NotFoundException('Produtora não localizada');const {documents,...rest}=p;return {...rest,documents:documents.map(d=>({id:d.id,documentType:d.documentType,checksum:d.checksum,status:d.status,createdAt:d.createdAt}))};}
  async attachDocument(producerId:string,body:{documentType:string;storageKey:string;checksum:string},actor:Actor){
    requireInternal(actor,'ADMIN','CADASTRO');
    ensure(/^secure:\/\/[\w.\/-]+$/.test(body.storageKey||''),'ARQUIVO','Referência privada de documento obrigatória');
    ensure(/^[a-f0-9]{64}$/.test(body.checksum||''),'CHECKSUM','SHA-256 obrigatório');
    const p=await this.db.bravoProducer.findUnique({where:{id:producerId}});if(!p) throw new NotFoundException();
    return this.db.$transaction(async tx=>{
      const doc=await tx.bravoProducerDocument.create({data:{producerId,documentType:body.documentType,storageKey:body.storageKey,checksum:body.checksum,uploadedBy:actor.id}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'DOCUMENTO_PRODUTOR_INSERIDO',resource:'PRODUTOR',resourceId:producerId,after:{documentId:doc.id,documentType:doc.documentType}}});
      return {id:doc.id,status:doc.status};
    });
  }
  async validateDocument(producerId:string,documentId:string,actor:Actor){
    requireInternal(actor,'ADMIN','CADASTRO');
    const d=await this.db.bravoProducerDocument.findFirst({where:{id:documentId,producerId}});if(!d) throw new NotFoundException('Documento não localizado');
    return this.db.$transaction(async tx=>{
      await tx.bravoProducerDocument.update({where:{id:d.id},data:{status:'VALIDADO'}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'DOCUMENTO_PRODUTOR_VALIDADO',resource:'PRODUTOR',resourceId:producerId,after:{documentId}}});
      return {id:documentId,status:'VALIDADO'};
    });
  }
  async verify(producerId:string,actor:Actor){
    requireInternal(actor,'ADMIN','CADASTRO');
    const p=await this.db.bravoProducer.findUnique({where:{id:producerId},include:{documents:true}});if(!p) throw new NotFoundException();
    if(!p.documents.some(d=>d.status==='VALIDADO')) throw new BadRequestException('Documento cadastral validado é obrigatório');
    if(p.createdBy===actor.id) throw new BadRequestException('Cadastro e aprovação devem ser feitos por usuários diferentes');
    return this.db.$transaction(async tx=>{
      const updated=await tx.bravoProducer.update({where:{id:producerId},data:{status:'VALIDADO',verifiedBy:actor.id,verifiedAt:new Date()}});
      await tx.bravoAudit.create({data:{actorId:actor.id,action:'PRODUTOR_VALIDADO',resource:'PRODUTOR',resourceId:producerId,after:{status:'VALIDADO'}}});
      return {id:updated.id,status:updated.status};
    });
  }
}
