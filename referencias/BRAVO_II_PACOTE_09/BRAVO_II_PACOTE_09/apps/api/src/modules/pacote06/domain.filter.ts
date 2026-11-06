import {Catch,ExceptionFilter,ArgumentsHost,HttpStatus} from '@nestjs/common';
import {DomainError} from '@bravo-ii/domain-p06';
@Catch(DomainError)
export class P06DomainFilter implements ExceptionFilter {
  catch(exception:DomainError,host:ArgumentsHost){
    const response=host.switchToHttp().getResponse();
    const status=['AUTOAPROVACAO','PAPEL_TAXA','SEM_PERMISSAO'].includes(exception.code)?HttpStatus.FORBIDDEN:HttpStatus.UNPROCESSABLE_ENTITY;
    response.status(status).json({error:{code:exception.code,message:exception.message}});
  }
}
