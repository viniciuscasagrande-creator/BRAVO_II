import { Router } from 'express';
import { RHController } from './rh.controller';

export const rhRouter = Router();

// Colaboradores
rhRouter.get('/colaboradores', RHController.listarColaboradores);
rhRouter.get('/colaboradores/:id', RHController.obterColaborador);
rhRouter.post('/colaboradores', RHController.cadastrarColaborador);

// Geofences
rhRouter.get('/geofences', RHController.listarGeofences);
rhRouter.post('/geofences', RHController.cadastrarGeofence);

// Ponto Eletrônico e Jornada (Portaria 671 MTE & Disk Ponto APK)
rhRouter.post('/ponto/registrar', RHController.registrarPonto);
rhRouter.post('/ponto/sincronizar-offline', RHController.sincronizarOffline);
rhRouter.get('/ponto/espelho/:colaboradorId', RHController.obterEspelhoPonto);
rhRouter.post('/ponto/ajustes', RHController.solicitarAjustePonto);
rhRouter.post('/ponto/ajustes/:id/aprovar', RHController.aprovarAjustePonto);

// Equipes de Evento e Custos de Pessoal (Alimentando DRE e Tesouraria PIX)
rhRouter.get('/eventos/:eventoId/custos', RHController.obterCustosEvento);
rhRouter.post('/eventos/:eventoId/equipe', RHController.alocarEquipeEvento);
rhRouter.post('/eventos/:eventoId/pagar-tesouraria', RHController.enviarPagamentosEquipe);

// Auditoria e LGPD
rhRouter.get('/auditoria', RHController.listarAuditoria);
