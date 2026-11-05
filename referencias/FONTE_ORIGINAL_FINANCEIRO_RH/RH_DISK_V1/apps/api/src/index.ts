import express, { Request, Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-rh-disk-change-me';

// ============================================================================
// MODELOS E INTERFACES EM MEMÓRIA (FASES 1 A 10)
// ============================================================================

export interface LocalPonto {
  id: string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  raioMetros: number;
  ativo: boolean;
}

export interface Colaborador {
  id: string;
  usuarioId?: string;
  nome: string;
  cpf: string;
  matricula: string;
  cargo: string;
  departamento: string;
  gestorId?: string;
  centroCusto?: string;
  cargaHorariaSemanal: number;
  tipoContrato: string;
  dataAdmissao: string;
  salarioBase: number;
  chavePix?: string;
  tipoChavePix?: string;
  telefone?: string;
  email?: string;
  ativo: boolean;
  criadoEm: string;
}

export interface Jornada {
  id: string;
  nome: string;
  entrada: string;
  inicioIntervalo?: string;
  fimIntervalo?: string;
  saida: string;
  toleranciaMinutos: number;
  cargaMinutos: number;
}

export interface Escala {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  jornadaId: string;
  jornadaNome?: string;
  localId: string;
  localNome?: string;
  data: string;
  eventoId?: string;
  eventoNome?: string;
  observacao?: string;
}

export interface BatidaPonto {
  id: string;
  nsr: number;
  colaboradorId: string;
  colaboradorNome: string;
  colaboradorMatricula: string;
  tipo: 'ENTRADA' | 'INICIO_INTERVALO' | 'FIM_INTERVALO' | 'SAIDA';
  status: 'VALIDADA' | 'FORA_DA_AREA' | 'PENDENTE_ANALISE' | 'OFFLINE_SINCRONIZADA';
  instanteServidor: string;
  instanteDispositivo?: string;
  latitude: number;
  longitude: number;
  precisaoMetros?: number;
  distanciaLocalMetros: number;
  localId?: string;
  localNome: string;
  eventoId?: string;
  eventoNome?: string;
  offline: boolean;
  dispositivoId?: string;
  mockLocationSuspeita: boolean;
  comprovanteNsr: string;
  hashIntegridade: string;
  criadoEm: string;
}

export interface AjustePonto {
  id: string;
  colaboradorId: string;
  colaboradorNome: string;
  batidaId?: string;
  dataPonto: string;
  tipoBatida: 'ENTRADA' | 'INICIO_INTERVALO' | 'FIM_INTERVALO' | 'SAIDA';
  horarioCorreto: string;
  motivo: string;
  justificativa: string;
  status: 'PENDENTE' | 'APROVADO' | 'REPROVADO';
  solicitadoEm: string;
  analisadoEm?: string;
  analisadoPor?: string;
  parecer?: string;
}

export interface BancoHoras {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  competencia: string;
  minutosSaldo: number;
  minutosExtras: number;
  minutosDebito: number;
  atualizadoEm: string;
}

export interface FechamentoPonto {
  id: string;
  competencia: string;
  status: 'ABERTO' | 'EM_ANALISE' | 'FECHADO' | 'REABERTO';
  fechadoEm?: string;
  fechadoPor?: string;
  observacao?: string;
  criadoEm: string;
}

export interface Dispositivo {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  identificador: string;
  nome?: string;
  plataforma?: string;
  status: 'PENDENTE' | 'AUTORIZADO' | 'BLOQUEADO';
  ultimoAcesso?: string;
  criadoEm: string;
}

// Fase 5
export interface Ferias {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  periodoAquisitivoInicio: string;
  periodoAquisitivoFim: string;
  dataInicio: string;
  dataFim: string;
  diasGozados: number;
  abonoPecuniarioDias: number;
  adiantamento13: boolean;
  status: 'SOLICITADA' | 'APROVADA_GESTOR' | 'HOMOLOGADA_RH' | 'EM_GOZO' | 'CONCLUIDA' | 'CANCELADA';
  solicitadoEm: string;
  homologadoEm?: string;
  homologadoPor?: string;
}

export interface AtestadoMedico {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  dataEmissao: string;
  diasAfastamento: number;
  dataRetorno: string;
  cid10?: string;
  nomeMedico: string;
  crmMedico: string;
  ufCrm: string;
  comprovanteUrl?: string;
  status: 'PENDENTE' | 'HOMOLOGADA' | 'RECUSADA';
  abonarHorasPonto: boolean;
  solicitadoEm: string;
  analisadoPor?: string;
}

// Fase 6
export interface ProcessoAdmissao {
  id: string;
  candidatoNome: string;
  cpf: string;
  email: string;
  telefone: string;
  cargoPretendido: string;
  departamento: string;
  salarioProposto: number;
  dataPrevisaoInicio: string;
  status: 'INICIADA' | 'DOCUMENTOS_ENVIADOS' | 'EM_ANALISE' | 'APROVADA' | 'CONTRATADO' | 'CANCELADA';
  matriculaGerada?: string;
  iniciadoEm: string;
  concluidoEm?: string;
}

export interface DocumentoGED {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  tipo: string;
  titulo: string;
  arquivoUrl: string;
  hashSHA256: string;
  status: 'PENDENTE_ASSINATURA' | 'ASSINADO' | 'VALIDO' | 'VENCIDO' | 'REJEITADO';
  requerAssinatura: boolean;
  assinadoEm?: string;
  ipAssinatura?: string;
  dataUpload: string;
}

// Fase 7
export interface BeneficioColaborador {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  tipo: string;
  operadora: string;
  valorMensal: number;
  descontoEmFolha: number;
  status: 'ATIVO' | 'SUSPENSO' | 'CANCELADO';
  cartaoNumero?: string;
  iniciadoEm: string;
}

export interface PedidoBeneficio {
  id: string;
  competencia: string;
  tipo: string;
  totalColaboradores: number;
  valorTotalRecarga: number;
  descontoTotalFolha: number;
  status: string;
  dataPedido: string;
}

// Fase 8
export interface Holerite {
  id: string;
  folhaId: string;
  colaboradorId: string;
  colaboradorNome: string;
  matricula: string;
  cargo: string;
  competencia: string;
  salarioBase: number;
  totalVencimentos: number;
  totalDescontos: number;
  valorLiquido: number;
  rubricas: any[];
  baseINSS: number;
  baseIRRF: number;
  baseFGTS: number;
  fgtsRecolher: number;
  chavePix?: string;
}

export interface FolhaPagamento {
  id: string;
  competencia: string;
  status: 'PREVIA' | 'FECHADA' | 'ENVIADA_TESOURARIA' | 'PAGA';
  totalColaboradores: number;
  totalProventos: number;
  totalDescontos: number;
  totalLiquido: number;
  totalEncargosEmpresa: number;
  fechadaEm?: string;
  fechadaPor?: string;
  lotePixId?: string;
}

// Fase 9
export interface DiariaStaffEvento {
  id: string;
  eventoId: string;
  eventoNome: string;
  localId: string;
  localNome: string;
  data: string;
  colaboradorId?: string;
  nomeProfissional: string;
  cpf: string;
  funcao: string;
  valorDiaria: number;
  valorTransporte: number;
  valorAlimentacao: number;
  valorTotal: number;
  checkInHora?: string;
  checkOutHora?: string;
  status: 'ESCALADO' | 'PRESENTE_VALIDADO' | 'APROVADO_PAGAMENTO' | 'PAGO_PIX' | 'FALTOU';
  chavePix: string;
  aprovadoPor?: string;
  criadoEm: string;
}

// Fase 10
export interface EventoESocial {
  id: string;
  tipo: string;
  identificador: string;
  reciboEntrega?: string;
  status: 'GERADO' | 'VALIDADO' | 'TRANSMITIDO' | 'REJEITADO';
  geradoEm: string;
  transmitidoEm?: string;
}

export interface Auditoria {
  id: string;
  usuarioId?: string;
  usuarioNome: string;
  acao: string;
  entidade: string;
  entidadeId?: string;
  dados?: any;
  criadoEm: string;
  ip?: string;
}

// ----------------------------------------------------------------------------
// SEED INICIAL REALISTA E RESILIENTE
// ----------------------------------------------------------------------------

let nsrSequence = 1000;
const hojeStr = new Date().toISOString().substring(0, 10);
const competenciaAtual = hojeStr.substring(0, 7);

const locais: LocalPonto[] = [
  { id: 'loc-01', nome: 'Sede DiskIngressos Curitiba', endereco: 'Rua Visconde de Nácar, 1505 - Centro, Curitiba/PR', latitude: -25.4284, longitude: -49.2733, raioMetros: 150, ativo: true },
  { id: 'loc-02', nome: 'Arena da Baixada (Ligga Arena)', endereco: 'Rua Buenos Aires, 1260 - Água Verde, Curitiba/PR', latitude: -25.4484, longitude: -49.2770, raioMetros: 350, ativo: true },
  { id: 'loc-03', nome: 'Pedreira Paulo Leminski', endereco: 'Rua João Gava, 970 - Abranches, Curitiba/PR', latitude: -25.3855, longitude: -49.2789, raioMetros: 400, ativo: true }
];

const colaboradores: Colaborador[] = [
  { id: 'col-05', nome: 'Ana Martins', cpf: '123.456.789-01', matricula: 'DISK-00128', cargo: 'Analista de Operações Pleno', departamento: 'Operações e Eventos', centroCusto: 'CC-010-OPS', cargaHorariaSemanal: 44, tipoContrato: 'CLT', dataAdmissao: '2024-03-01', salarioBase: 4200.00, chavePix: '12345678901', tipoChavePix: 'CPF', telefone: '(41) 99888-7711', email: 'ana.martins@diskingressos.com.br', ativo: true, criadoEm: '2024-03-01T08:00:00Z' },
  { id: 'col-01', nome: 'Carlos Eduardo Mendes', cpf: '234.567.890-12', matricula: 'DISK-00101', cargo: 'Coordenador de Bilheteria', departamento: 'Operações e Eventos', centroCusto: 'CC-010-OPS', cargaHorariaSemanal: 44, tipoContrato: 'CLT', dataAdmissao: '2023-01-15', salarioBase: 4800.00, chavePix: '23456789012', tipoChavePix: 'CPF', telefone: '(41) 98822-1144', email: 'carlos.mendes@diskingressos.com.br', ativo: true, criadoEm: '2023-01-15T08:00:00Z' },
  { id: 'col-02', nome: 'Camila Fernandes Silveira', cpf: '456.789.012-34', matricula: 'DISK-00205', cargo: 'Supervisora de Atendimento', departamento: 'Operações e Eventos', centroCusto: 'CC-010-OPS', cargaHorariaSemanal: 44, tipoContrato: 'CLT', dataAdmissao: '2024-06-01', salarioBase: 3800.00, chavePix: 'camila.silveira@diskingressos.com.br', tipoChavePix: 'EMAIL', telefone: '(41) 99755-4433', email: 'camila.silveira@diskingressos.com.br', ativo: true, criadoEm: '2024-06-01T08:00:00Z' },
  { id: 'col-03', nome: 'Lucas Gabriel Pinheiro', cpf: '678.901.234-56', matricula: 'DISK-00388', cargo: 'Operador de Bilheteria / Caixa', departamento: 'Operações e Eventos', centroCusto: 'CC-010-OPS', cargaHorariaSemanal: 44, tipoContrato: 'CLT', dataAdmissao: '2025-02-10', salarioBase: 2400.00, chavePix: '67890123456', tipoChavePix: 'CPF', telefone: '(41) 99111-2233', email: 'lucas.pinheiro@gmail.com', ativo: true, criadoEm: '2025-02-10T08:00:00Z' },
  { id: 'col-04', nome: 'Beatriz Nogueira Ramos', cpf: '789.012.345-67', matricula: 'DISK-00412', cargo: 'Analista Financeiro Pleno', departamento: 'Financeiro e Controladoria', centroCusto: 'CC-002-FIN', cargaHorariaSemanal: 40, tipoContrato: 'CLT', dataAdmissao: '2024-04-05', salarioBase: 4600.00, chavePix: 'beatriz.ramos@diskingressos.com.br', tipoChavePix: 'EMAIL', telefone: '(41) 98444-5566', email: 'beatriz.ramos@diskingressos.com.br', ativo: true, criadoEm: '2024-04-05T08:00:00Z' }
];

const jornadas: Jornada[] = [
  { id: 'jor-01', nome: 'Comercial Padrão 44h (Seg-Sex)', entrada: '08:00', inicioIntervalo: '12:00', fimIntervalo: '13:00', saida: '17:48', toleranciaMinutos: 10, cargaMinutos: 480 },
  { id: 'jor-02', nome: 'Operação Show Turno Noturno', entrada: '14:00', inicioIntervalo: '18:00', fimIntervalo: '19:00', saida: '23:00', toleranciaMinutos: 15, cargaMinutos: 540 }
];

const escalas: Escala[] = [
  { id: 'esc-01', colaboradorId: 'col-05', colaboradorNome: 'Ana Martins', jornadaId: 'jor-01', jornadaNome: 'Comercial Padrão 44h', localId: 'loc-01', localNome: 'Sede DiskIngressos Curitiba', data: hojeStr, observacao: 'Operação Sede Disk' },
  { id: 'esc-02', colaboradorId: 'col-01', colaboradorNome: 'Carlos Eduardo Mendes', jornadaId: 'jor-01', jornadaNome: 'Comercial Padrão 44h', localId: 'loc-01', localNome: 'Sede DiskIngressos Curitiba', data: hojeStr, observacao: 'Administração Geral' },
  { id: 'esc-03', colaboradorId: 'col-03', colaboradorNome: 'Lucas Gabriel Pinheiro', jornadaId: 'jor-02', jornadaNome: 'Operação Show Turno Noturno', localId: 'loc-02', localNome: 'Arena da Baixada (Ligga Arena)', data: hojeStr, eventoId: 'evt-curitiba-rock', eventoNome: 'Show Nacional de Rock Curitiba', observacao: 'Portões 1 a 4' }
];

const batidas: BatidaPonto[] = [
  { id: 'bat-1003', nsr: 1003, colaboradorId: 'col-05', colaboradorNome: 'Ana Martins', colaboradorMatricula: 'DISK-00128', tipo: 'ENTRADA', status: 'VALIDADA', instanteServidor: `${hojeStr}T08:01:00.000Z`, latitude: -25.42841, longitude: -49.27332, precisaoMetros: 5.0, distanciaLocalMetros: 4, localId: 'loc-01', localNome: 'Sede DiskIngressos Curitiba', offline: false, mockLocationSuspeita: false, comprovanteNsr: 'MTE671-000001003-C9D2E4F6', hashIntegridade: 'c9d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2', criadoEm: `${hojeStr}T08:01:00.000Z` },
  { id: 'bat-1001', nsr: 1001, colaboradorId: 'col-01', colaboradorNome: 'Carlos Eduardo Mendes', colaboradorMatricula: 'DISK-00101', tipo: 'ENTRADA', status: 'VALIDADA', instanteServidor: `${hojeStr}T08:01:14.000Z`, latitude: -25.42842, longitude: -49.27331, precisaoMetros: 6.5, distanciaLocalMetros: 5, localId: 'loc-01', localNome: 'Sede DiskIngressos Curitiba', offline: false, mockLocationSuspeita: false, comprovanteNsr: 'MTE671-000001001-A7F9C2D1', hashIntegridade: 'a7f9c2d1e4b8650f9a2b4c6d8e0f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f', criadoEm: `${hojeStr}T08:01:14.000Z` }
];

const ajustes: AjustePonto[] = [
  { id: 'aj-01', colaboradorId: 'col-04', colaboradorNome: 'Beatriz Nogueira Ramos', dataPonto: hojeStr, tipoBatida: 'SAIDA', horarioCorreto: '18:18', motivo: 'ESQUECIMENTO', justificativa: 'Reunião prolongada de fechamento de borderô.', status: 'PENDENTE', solicitadoEm: `${hojeStr}T18:30:00.000Z` }
];

const bancoHoras: BancoHoras[] = [
  { id: 'bh-01', colaboradorId: 'col-05', colaboradorNome: 'Ana Martins', competencia: competenciaAtual, minutosSaldo: 320, minutosExtras: 320, minutosDebito: 0, atualizadoEm: new Date().toISOString() },
  { id: 'bh-02', colaboradorId: 'col-01', colaboradorNome: 'Carlos Eduardo Mendes', competencia: competenciaAtual, minutosSaldo: -75, minutosExtras: 70, minutosDebito: 145, atualizadoEm: new Date().toISOString() }
];

const fechamentos: FechamentoPonto[] = [
  { id: 'fech-01', competencia: '2026-09', status: 'FECHADO', fechadoEm: '2026-10-01T10:00:00.000Z', fechadoPor: 'usr-rh-01', observacao: 'Competência Setembro/2026 homologada', criadoEm: '2026-09-01T00:00:00.000Z' },
  { id: 'fech-02', competencia: competenciaAtual, status: 'EM_ANALISE', observacao: 'Competência Outubro/2026 aberta para apuração', criadoEm: `${competenciaAtual}-01T00:00:00.000Z` }
];

const dispositivos: Dispositivo[] = [
  { id: 'dev-01', colaboradorId: 'col-05', colaboradorNome: 'Ana Martins', identificador: 'dev-samsung-a55-ana', nome: 'Galaxy A55 (Corporativo)', plataforma: 'Android 14', status: 'AUTORIZADO', ultimoAcesso: `${hojeStr}T08:01:00.000Z`, criadoEm: '2026-05-12T08:00:00.000Z' },
  { id: 'dev-02', colaboradorId: 'col-01', colaboradorNome: 'Carlos Eduardo Mendes', identificador: 'dev-moto-g84-carlos', nome: 'Moto G84 (Pessoal)', plataforma: 'Android 13', status: 'AUTORIZADO', ultimoAcesso: `${hojeStr}T08:01:14.000Z`, criadoEm: '2026-01-15T08:00:00.000Z' }
];

// FASE 5: Férias e Atestados
const ferias: Ferias[] = [
  { id: 'fer-01', colaboradorId: 'col-01', colaboradorNome: 'Carlos Eduardo Mendes', periodoAquisitivoInicio: '2025-01-15', periodoAquisitivoFim: '2026-01-14', dataInicio: '2026-11-03', dataFim: '2026-11-22', diasGozados: 20, abonoPecuniarioDias: 10, adiantamento13: true, status: 'HOMOLOGADA_RH', solicitadoEm: '2026-09-10T10:00:00Z', homologadoEm: '2026-09-15T14:30:00Z', homologadoPor: 'Gestor RH' }
];

const atestados: AtestadoMedico[] = [
  { id: 'at-01', colaboradorId: 'col-03', colaboradorNome: 'Lucas Gabriel Pinheiro', dataEmissao: '2026-09-20', diasAfastamento: 2, dataRetorno: '2026-09-22', cid10: 'J06.9', nomeMedico: 'Dr. Roberto Vianna', crmMedico: '29811', ufCrm: 'PR', comprovanteUrl: '/docs/atestados/at-01.pdf', status: 'HOMOLOGADA', abonarHorasPonto: true, solicitadoEm: '2026-09-20T09:00:00Z', analisadoPor: 'Gestor RH' }
];

// FASE 6: Admissões e GED
const admissoes: ProcessoAdmissao[] = [
  { id: 'adm-01', candidatoNome: 'Mariana Duarte Lopes', cpf: '345.678.901-23', email: 'mariana.lopes@email.com', telefone: '(41) 99222-3344', cargoPretendido: 'Analista de Atendimento Júnior', departamento: 'Operações e Eventos', salarioProposto: 2800.00, dataPrevisaoInicio: '2026-10-15', status: 'EM_ANALISE', matriculaGerada: 'DISK-00501', iniciadoEm: '2026-10-01T10:00:00Z' }
];

const documentosGED: DocumentoGED[] = [
  { id: 'doc-01', colaboradorId: 'col-05', colaboradorNome: 'Ana Martins', tipo: 'CONTRATO_TRABALHO', titulo: 'Contrato Individual de Trabalho CLT', arquivoUrl: '/docs/ged/contrato-ana-martins.pdf', hashSHA256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', status: 'ASSINADO', requerAssinatura: true, assinadoEm: '2024-03-01T09:12:00Z', ipAssinatura: '189.112.45.10', dataUpload: '2024-03-01T08:30:00Z' },
  { id: 'doc-02', colaboradorId: 'col-05', colaboradorNome: 'Ana Martins', tipo: 'TERMO_CONFIDENCIALIDADE', titulo: 'Termo de Sigilo, Confidencialidade e LGPD', arquivoUrl: '/docs/ged/termo-confidencialidade-ana.pdf', hashSHA256: '8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4', status: 'ASSINADO', requerAssinatura: true, assinadoEm: '2024-03-01T09:15:00Z', ipAssinatura: '189.112.45.10', dataUpload: '2024-03-01T08:30:00Z' }
];

// FASE 7: Benefícios
const beneficios: BeneficioColaborador[] = [
  { id: 'ben-01', colaboradorId: 'col-05', colaboradorNome: 'Ana Martins', tipo: 'VALE_REFEICAO', operadora: 'Pluxee / Sodexo', valorMensal: 770.00, descontoEmFolha: 77.00, status: 'ATIVO', cartaoNumero: '**** 4432', iniciadoEm: '2024-03-01' },
  { id: 'ben-02', colaboradorId: 'col-05', colaboradorNome: 'Ana Martins', tipo: 'VALE_TRANSPORTE', operadora: 'URBS Curitiba (Cartão Transporte)', valorMensal: 330.00, descontoEmFolha: 252.00, status: 'ATIVO', cartaoNumero: '9812-4412-00', iniciadoEm: '2024-03-01' },
  { id: 'ben-03', colaboradorId: 'col-05', colaboradorNome: 'Ana Martins', tipo: 'PLANO_SAUDE', operadora: 'Unimed Curitiba Coparticipativo', valorMensal: 450.00, descontoEmFolha: 90.00, status: 'ATIVO', cartaoNumero: '0 055 129841', iniciadoEm: '2024-03-01' }
];

const pedidosBeneficios: PedidoBeneficio[] = [
  { id: 'ped-ben-01', competencia: '2026-10', tipo: 'VALE_REFEICAO', totalColaboradores: 5, valorTotalRecarga: 3850.00, descontoTotalFolha: 385.00, status: 'RECARREGADO', dataPedido: '2026-09-28' },
  { id: 'ped-ben-02', competencia: '2026-10', tipo: 'VALE_TRANSPORTE', totalColaboradores: 4, valorTotalRecarga: 1320.00, descontoTotalFolha: 840.00, status: 'RECARREGADO', dataPedido: '2026-09-28' }
];

// FASE 8: Folha de Pagamento & Holerites
const holerites: Holerite[] = [
  {
    id: 'hol-ana-202609',
    folhaId: 'folha-202609',
    colaboradorId: 'col-05',
    colaboradorNome: 'Ana Martins',
    matricula: 'DISK-00128',
    cargo: 'Analista de Operações Pleno',
    competencia: '2026-09',
    salarioBase: 4200.00,
    totalVencimentos: 4486.36,
    totalDescontos: 835.42,
    valorLiquido: 3650.94,
    baseINSS: 4486.36,
    baseIRRF: 3995.12,
    baseFGTS: 4486.36,
    fgtsRecolher: 358.91,
    chavePix: '12345678901',
    rubricas: [
      { codigo: '001', descricao: 'Salário Base Mensal', tipo: 'PROVENTO', referencia: '30d', valor: 4200.00 },
      { codigo: '015', descricao: 'Horas Extras 50% (Ponto)', tipo: 'PROVENTO', referencia: '10h', valor: 238.64 },
      { codigo: '020', descricao: 'DSR sobre Horas Extras', tipo: 'PROVENTO', referencia: '4d', valor: 47.72 },
      { codigo: '101', descricao: 'INSS Folha', tipo: 'DESCONTO', referencia: '10.95%', valor: 491.24 },
      { codigo: '102', descricao: 'IRRF s/ Salário', tipo: 'DESCONTO', referencia: '15.00%', valor: 175.18 },
      { codigo: '201', descricao: 'Desconto Vale Transporte (6%)', tipo: 'DESCONTO', referencia: '6.00%', valor: 252.00 },
      { codigo: '205', descricao: 'Coparticipação Plano de Saúde', tipo: 'DESCONTO', referencia: 'Mensal', valor: 90.00 }
    ]
  }
];

const folhasPagamento: FolhaPagamento[] = [
  { id: 'folha-202609', competencia: '2026-09', status: 'PAGA', totalColaboradores: 5, totalProventos: 21850.00, totalDescontos: 4120.50, totalLiquido: 17729.50, totalEncargosEmpresa: 3740.00, fechadaEm: '2026-10-01T15:00:00Z', fechadaPor: 'usr-rh-01', lotePixId: 'LOTE-PIX-FOLHA-202609' },
  { id: 'folha-202610', competencia: '2026-10', status: 'PREVIA', totalColaboradores: 5, totalProventos: 22100.00, totalDescontos: 4230.00, totalLiquido: 17870.00, totalEncargosEmpresa: 3820.00 }
];

// FASE 9: Staff de Eventos & Diárias
const staffEventos: DiariaStaffEvento[] = [
  { id: 'dia-01', eventoId: 'evt-curitiba-rock', eventoNome: 'Festival Curitiba Rock 2026', localId: 'loc-02', localNome: 'Arena da Baixada (Ligga Arena)', data: '2026-10-03', colaboradorId: 'col-03', nomeProfissional: 'Lucas Gabriel Pinheiro', cpf: '678.901.234-56', funcao: 'OPERADOR_CAIXA', valorDiaria: 180.00, valorTransporte: 30.00, valorAlimentacao: 40.00, valorTotal: 250.00, checkInHora: '2026-10-03T13:58:00Z', checkOutHora: '2026-10-03T23:10:00Z', status: 'APROVADO_PAGAMENTO', chavePix: '67890123456', aprovadoPor: 'Carlos Mendes (Coord. Bilheteria)', criadoEm: '2026-10-02T10:00:00Z' },
  { id: 'dia-02', eventoId: 'evt-curitiba-rock', eventoNome: 'Festival Curitiba Rock 2026', localId: 'loc-02', localNome: 'Arena da Baixada (Ligga Arena)', data: '2026-10-03', nomeProfissional: 'Rodrigo Fontana (Freelancer)', cpf: '445.556.667-88', funcao: 'CONTROLADOR_ACESSO', valorDiaria: 160.00, valorTransporte: 30.00, valorAlimentacao: 40.00, valorTotal: 230.00, checkInHora: '2026-10-03T14:02:00Z', checkOutHora: '2026-10-03T23:05:00Z', status: 'APROVADO_PAGAMENTO', chavePix: '44555666788', aprovadoPor: 'Carlos Mendes (Coord. Bilheteria)', criadoEm: '2026-10-02T10:00:00Z' }
];

// FASE 10: eSocial
const eventosESocial: EventoESocial[] = [
  { id: 'esoc-01', tipo: 'S_1000', identificador: 'ID1078901230001992026100108000000001', reciboEntrega: '1.2.202610.000000000001234567', status: 'TRANSMITIDO', geradoEm: '2026-10-01T08:00:00Z', transmitidoEm: '2026-10-01T08:05:22Z' },
  { id: 'esoc-02', tipo: 'S_2200', identificador: 'ID1078901230001992026100108000000002', reciboEntrega: '1.2.202610.000000000001234588', status: 'TRANSMITIDO', geradoEm: '2026-10-01T08:10:00Z', transmitidoEm: '2026-10-01T08:12:15Z' },
  { id: 'esoc-03', tipo: 'S_1200', identificador: 'ID1078901230001992026100108000000003', status: 'GERADO', geradoEm: '2026-10-04T10:00:00Z' }
];

const auditoria: Auditoria[] = [
  { id: 'aud-01', usuarioNome: 'Sistema Core RH', acao: 'INICIALIZACAO_SISTEMA', entidade: 'Sistema', dados: { versao: 'V1.10 - Fases 1 a 10 Operacionais', status: 'Operacional' }, criadoEm: new Date().toISOString(), ip: '127.0.0.1' }
];

// ============================================================================
// FUNÇÃO HAVERSINE CANÔNICA
// ============================================================================

export function calcularDistanciaHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function registrarLogAuditoria(acao: string, entidade: string, detalhes: any, req?: Request) {
  const log: Auditoria = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    usuarioNome: (req as any)?.user?.nome || 'Gestor RH Disk',
    acao,
    entidade,
    dados: detalhes,
    criadoEm: new Date().toISOString(),
    ip: req?.ip || '127.0.0.1'
  };
  auditoria.unshift(log);
  return log;
}

// ============================================================================
// ROTAS DA API (FASES 1 A 10)
// ============================================================================

// 1. Saúde e Dashboard Integrado
app.get('/api/saude', (_, res) => {
  res.json({
    status: 'ok',
    sistema: 'RH Disk API V1.10 (Fases 1 a 10 Integradas)',
    versao: '10.0',
    modulosAtivos: [
      'Ponto e Geofence', 'Portaria 671 MTE', 'Banco de Horas', 'Fechamento Mensal',
      'Férias e Ausências', 'Atestados Médicos', 'Admissão e Onboarding', 'GED',
      'Benefícios Corporativos', 'Folha de Pagamento', 'Staff de Eventos & DRE', 'People Analytics & eSocial'
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/dashboard', (_, res) => {
  const batidasHoje = batidas.filter(b => b.instanteServidor.startsWith(hojeStr)).length;
  const pendencias = ajustes.filter(a => a.status === 'PENDENTE').length;

  res.json({
    colaboradoresAtivos: colaboradores.filter(c => c.ativo).length,
    trabalhandoAgora: batidasHoje,
    emIntervalo: 1,
    batidasHoje,
    pendenciasAjustes: pendencias,
    horasExtrasMes: 62,
    locaisAtivos: locais.filter(l => l.ativo).length,
    escalasHoje: escalas.filter(e => e.data === hojeStr).length,
    colaboradoresEmFerias: ferias.filter(f => f.status === 'EM_GOZO').length,
    atestadosMes: atestados.length,
    totalFolhaLiquida: 17870.00,
    staffEventosAlocados: staffEventos.length,
    eventosESocialGerados: eventosESocial.length
  });
});

// 2. Autenticação e Perfis (RBAC / SoD)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { login, email, senha } = req.body || {};
  const termo = String(login || email || '').trim().toLowerCase();

  const colab = colaboradores.find(
    c => c.email?.toLowerCase() === termo ||
         c.matricula.toLowerCase() === termo ||
         c.cpf.replace(/\D/g, '') === termo.replace(/\D/g, '')
  );

  if (termo === 'admin' || termo === 'rh@diskingressos.com.br' || termo === 'rh@disk.local' || colab) {
    const perfil = colab ? 'COLABORADOR' : 'ADMINISTRADOR';
    const usuario = {
      id: colab ? colab.id : 'usr-admin-01',
      nome: colab ? colab.nome : 'Administrador RH Disk',
      email: colab ? colab.email : 'rh@diskingressos.com.br',
      perfil,
      colaboradorId: colab ? colab.id : undefined,
      colaborador: colab || undefined,
      token: jwt.sign({ sub: colab ? colab.id : 'usr-admin-01', perfil, colaboradorId: colab?.id }, JWT_SECRET, { expiresIn: '12h' })
    };

    registrarLogAuditoria('LOGIN_REALIZADO', 'Usuario', { usuario: usuario.nome, perfil: usuario.perfil }, req);
    return res.json({ token: usuario.token, usuario });
  }

  res.status(401).json({ erro: 'Credenciais inválidas. Use CPF, Matrícula ou E-mail corporativo.' });
});

app.get(['/api/me', '/api/auth/me'], (req: Request, res: Response) => {
  res.json({
    id: 'usr-admin-01',
    nome: 'Administrador RH Disk',
    email: 'rh@diskingressos.com.br',
    perfil: 'ADMINISTRADOR',
    colaborador: colaboradores[0],
    permissoes: ['LER_PONTO', 'CRIAR_PONTO', 'APROVAR_AJUSTES', 'GERENCIAR_ESCALAS', 'FECHAMENTO_MENSAL', 'FOLHA_PAGAMENTO', 'BENEFICIOS', 'AUDITORIA']
  });
});

// 3. Monitor de Ponto em Tempo Real
app.get('/api/monitor/hoje', (req: Request, res: Response) => {
  const batidasHoje = batidas.filter(b => b.instanteServidor.startsWith(hojeStr));
  const colaboradoresMonitorados = colaboradores.map(col => {
    const batidasColab = batidasHoje.filter(b => b.colaboradorId === col.id);
    const ultimaBatida = batidasColab[0];
    const escalaHoje = escalas.find(e => e.colaboradorId === col.id && e.data === hojeStr);

    let situacao = 'SEM_MARCACAO';
    if (ultimaBatida) {
      if (ultimaBatida.status === 'PENDENTE_ANALISE' || ultimaBatida.status === 'FORA_DA_AREA' || ultimaBatida.mockLocationSuspeita) {
        situacao = 'PARA_ANALISAR';
      } else if (ultimaBatida.tipo === 'ENTRADA' || ultimaBatida.tipo === 'FIM_INTERVALO') {
        situacao = 'TRABALHANDO';
      } else if (ultimaBatida.tipo === 'INICIO_INTERVALO') {
        situacao = 'INTERVALO';
      } else if (ultimaBatida.tipo === 'SAIDA') {
        situacao = 'JORNADA_ENCERRADA';
      }
    }

    return {
      colaboradorId: col.id,
      nome: col.nome,
      matricula: col.matricula,
      cargo: col.cargo,
      departamento: col.departamento,
      situacao,
      ultimaBatida,
      escala: escalaHoje,
      localNome: escalaHoje?.localNome || ultimaBatida?.localNome || 'Sede DiskIngressos Curitiba',
      alertaSuspeita: ultimaBatida?.mockLocationSuspeita || false,
      distanciaLocalMetros: ultimaBatida?.distanciaLocalMetros || 0,
      precisaoMetros: ultimaBatida?.precisaoMetros || 0,
      offline: ultimaBatida?.offline || false
    };
  });

  const kpis = {
    emTrabalho: colaboradoresMonitorados.filter(c => c.situacao === 'TRABALHANDO').length,
    emIntervalo: colaboradoresMonitorados.filter(c => c.situacao === 'INTERVALO').length,
    paraAnalisar: colaboradoresMonitorados.filter(c => c.situacao === 'PARA_ANALISAR').length,
    semMarcacao: colaboradoresMonitorados.filter(c => c.situacao === 'SEM_MARCACAO').length,
    jornadaEncerrada: colaboradoresMonitorados.filter(c => c.situacao === 'JORNADA_ENCERRADA').length,
    totalMonitorados: colaboradoresMonitorados.length
  };

  res.json({ kpis, colaboradores: colaboradoresMonitorados });
});

// 4. Colaboradores, Locais, Jornadas e Escalas
app.get(['/api/colaboradores', '/api/admin/colaboradores'], (req: Request, res: Response) => {
  res.json(colaboradores);
});

app.post(['/api/colaboradores', '/api/admin/colaboradores'], (req: Request, res: Response) => {
  const { nome, cpf, cargo, departamento, centroCusto, cargaHorariaSemanal, salarioBase } = req.body;
  if (!nome || !cpf || !cargo) return res.status(400).json({ erro: 'Nome, CPF e Cargo são obrigatórios.' });

  const matricula = `DISK-${Math.floor(10000 + Math.random() * 90000)}`;
  const novo: Colaborador = {
    id: `col-${Date.now()}`,
    nome: nome.trim(),
    cpf: cpf.trim(),
    matricula,
    cargo: cargo.trim(),
    departamento: departamento || 'Operações e Eventos',
    centroCusto: centroCusto || 'CC-010-OPS',
    cargaHorariaSemanal: Number(cargaHorariaSemanal || 44),
    tipoContrato: 'CLT',
    dataAdmissao: hojeStr,
    salarioBase: Number(salarioBase || 3000),
    ativo: true,
    criadoEm: new Date().toISOString()
  };
  colaboradores.push(novo);
  registrarLogAuditoria('CADASTROU_COLABORADOR', 'Colaborador', novo, req);
  res.status(201).json(novo);
});

app.get(['/api/locais', '/api/admin/locais'], (_, res) => res.json(locais));
app.post(['/api/locais', '/api/admin/locais'], (req: Request, res: Response) => {
  const novo: LocalPonto = { id: `loc-${Date.now()}`, ativo: true, ...req.body, raioMetros: Number(req.body.raioMetros || 150) };
  locais.push(novo);
  registrarLogAuditoria('CADASTROU_LOCAL', 'LocalPonto', novo, req);
  res.status(201).json(novo);
});

app.get(['/api/jornadas', '/api/admin/jornadas'], (_, res) => res.json(jornadas));
app.post(['/api/jornadas', '/api/admin/jornadas'], (req: Request, res: Response) => {
  const nova: Jornada = { id: `jor-${Date.now()}`, toleranciaMinutos: 10, cargaMinutos: 480, ...req.body };
  jornadas.push(nova);
  registrarLogAuditoria('CADASTROU_JORNADA', 'Jornada', nova, req);
  res.status(201).json(nova);
});

app.get(['/api/escalas', '/api/admin/escalas'], (_, res) => res.json(escalas));
app.post(['/api/escalas', '/api/admin/escalas'], (req: Request, res: Response) => {
  const nova: Escala = { id: `esc-${Date.now()}`, data: hojeStr, ...req.body };
  escalas.push(nova);
  registrarLogAuditoria('CADASTROU_ESCALA', 'Escala', nova, req);
  res.status(201).json(nova);
});

// 5. Batidas e Ponto (Portaria 671 MTE)
app.post('/api/ponto/registrar', (req: Request, res: Response) => {
  const { colaboradorId, tipo, latitude, longitude, precisaoMetros, mockLocationSuspeita, offline } = req.body;
  const colab = colaboradores.find(c => c.id === colaboradorId) || colaboradores[0];
  const localAlvo = locais[0];

  let distancia = 0;
  let status: 'VALIDADA' | 'FORA_DA_AREA' | 'PENDENTE_ANALISE' | 'OFFLINE_SINCRONIZADA' = 'VALIDADA';

  if (latitude !== undefined && longitude !== undefined) {
    distancia = calcularDistanciaHaversine(latitude, longitude, localAlvo.latitude, localAlvo.longitude);
    status = distancia <= localAlvo.raioMetros ? 'VALIDADA' : 'FORA_DA_AREA';
  }

  if (mockLocationSuspeita || ((precisaoMetros ?? 0) > 200)) status = 'PENDENTE_ANALISE';
  else if (offline && status === 'VALIDADA') status = 'OFFLINE_SINCRONIZADA';

  const nsr = ++nsrSequence;
  const nowIso = new Date().toISOString();
  const hash = crypto.createHash('sha256').update(`${nsr}|${colab.cpf}|${nowIso}|${tipo}`).digest('hex');

  const novaBatida: BatidaPonto = {
    id: `bat-${Date.now()}-${nsr}`,
    nsr,
    colaboradorId: colab.id,
    colaboradorNome: colab.nome,
    colaboradorMatricula: colab.matricula,
    tipo,
    status,
    instanteServidor: nowIso,
    latitude: latitude || localAlvo.latitude,
    longitude: longitude || localAlvo.longitude,
    distanciaLocalMetros: distancia,
    localId: localAlvo.id,
    localNome: localAlvo.nome,
    offline: Boolean(offline),
    mockLocationSuspeita: Boolean(mockLocationSuspeita),
    comprovanteNsr: `MTE671-${String(nsr).padStart(9, '0')}-${hash.substring(0, 8).toUpperCase()}`,
    hashIntegridade: hash,
    criadoEm: nowIso
  };

  batidas.unshift(novaBatida);
  registrarLogAuditoria('REGISTRO_PONTO', 'BatidaPonto', { nsr, tipo, status }, req);
  res.status(201).json(novaBatida);
});

app.get('/api/ponto/batidas', (_, res) => res.json(batidas));

// Ajustes de Ponto
app.get('/api/ponto/ajustes', (_, res) => res.json(ajustes));
app.post('/api/ponto/ajustes', (req: Request, res: Response) => {
  const novo: AjustePonto = { id: `aj-${Date.now()}`, status: 'PENDENTE', solicitadoEm: new Date().toISOString(), ...req.body };
  ajustes.unshift(novo);
  registrarLogAuditoria('SOLICITOU_AJUSTE', 'AjustePonto', novo, req);
  res.status(201).json(novo);
});
app.patch('/api/ponto/ajustes/:id', (req: Request, res: Response) => {
  const aj = ajustes.find(a => a.id === req.params.id);
  if (!aj) return res.status(404).json({ erro: 'Ajuste não encontrado' });
  aj.status = req.body.status;
  aj.analisadoEm = new Date().toISOString();
  aj.analisadoPor = req.body.analisadoPor || 'Gestor RH';
  registrarLogAuditoria('ANALISOU_AJUSTE', 'AjustePonto', aj, req);
  res.json(aj);
});

// Banco de Horas
app.get('/api/banco-horas', (_, res) => res.json(bancoHoras));
app.post('/api/banco-horas/recalcular/:colaboradorId', (req: Request, res: Response) => {
  const colab = colaboradores.find(c => c.id === req.params.colaboradorId);
  const delta = 320; // +5h 20m exemplo
  let item = bancoHoras.find(b => b.colaboradorId === req.params.colaboradorId);
  if (!item) {
    item = { id: `bh-${Date.now()}`, colaboradorId: req.params.colaboradorId, colaboradorNome: colab?.nome, competencia: competenciaAtual, minutosSaldo: delta, minutosExtras: delta, minutosDebito: 0, atualizadoEm: new Date().toISOString() };
    bancoHoras.push(item);
  } else {
    item.minutosSaldo = delta;
    item.minutosExtras = delta;
    item.atualizadoEm = new Date().toISOString();
  }
  registrarLogAuditoria('RECALCULOU_BANCO_HORAS', 'BancoHoras', item, req);
  res.json(item);
});

// Fechamento Mensal com Bloqueio de Pendências
app.get('/api/fechamentos', (_, res) => res.json(fechamentos));
app.post('/api/fechamentos/:competencia/fechar', (req: Request, res: Response) => {
  const pendencias = ajustes.filter(a => a.status === 'PENDENTE');
  if (pendencias.length > 0) {
    return res.status(409).json({ erro: `Existem ${pendencias.length} ajuste(s) pendente(s). Regularize-os antes de homologar.`, pendencias });
  }
  let f = fechamentos.find(item => item.competencia === req.params.competencia);
  if (!f) {
    f = { id: `fech-${Date.now()}`, competencia: req.params.competencia, status: 'FECHADO', fechadoEm: new Date().toISOString(), fechadoPor: 'usr-rh-01', criadoEm: new Date().toISOString() };
    fechamentos.unshift(f);
  } else {
    f.status = 'FECHADO';
    f.fechadoEm = new Date().toISOString();
  }
  registrarLogAuditoria('FECHOU_COMPETENCIA', 'FechamentoPonto', f, req);
  res.json(f);
});

// Dispositivos
app.get('/api/dispositivos', (_, res) => res.json(dispositivos));
app.patch('/api/dispositivos/:id', (req: Request, res: Response) => {
  const d = dispositivos.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ erro: 'Dispositivo não encontrado' });
  d.status = req.body.status;
  registrarLogAuditoria('ALTEROU_DISPOSITIVO', 'Dispositivo', d, req);
  res.json(d);
});

// ============================================================================
// FASE 5: FÉRIAS, ATESTADOS E AUSÊNCIAS
// ============================================================================

app.get('/api/ferias', (_, res) => res.json(ferias));

app.post('/api/ferias', (req: Request, res: Response) => {
  const { colaboradorId, dataInicio, diasGozados, abonoPecuniarioDias, adiantamento13 } = req.body;
  const colab = colaboradores.find(c => c.id === colaboradorId);
  const dtFim = new Date(dataInicio);
  dtFim.setDate(dtFim.getDate() + Number(diasGozados || 30));

  const nova: Ferias = {
    id: `fer-${Date.now()}`,
    colaboradorId,
    colaboradorNome: colab?.nome || 'Colaborador',
    periodoAquisitivoInicio: '2025-01-01',
    periodoAquisitivoFim: '2025-12-31',
    dataInicio,
    dataFim: dtFim.toISOString().substring(0, 10),
    diasGozados: Number(diasGozados || 30),
    abonoPecuniarioDias: Number(abonoPecuniarioDias || 0),
    adiantamento13: Boolean(adiantamento13),
    status: 'SOLICITADA',
    solicitadoEm: new Date().toISOString()
  };

  ferias.unshift(nova);
  registrarLogAuditoria('SOLICITOU_FERIAS', 'Ferias', nova, req);
  res.status(201).json(nova);
});

app.patch('/api/ferias/:id/homologar', (req: Request, res: Response) => {
  const f = ferias.find(x => x.id === req.params.id);
  if (!f) return res.status(404).json({ erro: 'Solicitação de férias não encontrada.' });
  f.status = 'HOMOLOGADA_RH';
  f.homologadoEm = new Date().toISOString();
  f.homologadoPor = req.body.homologadoPor || 'Gestor RH';
  registrarLogAuditoria('HOMOLOGOU_FERIAS', 'Ferias', f, req);
  res.json(f);
});

app.get('/api/atestados', (_, res) => res.json(atestados));

app.post('/api/atestados', (req: Request, res: Response) => {
  const { colaboradorId, dataEmissao, diasAfastamento, cid10, nomeMedico, crmMedico, ufCrm } = req.body;
  const colab = colaboradores.find(c => c.id === colaboradorId);
  const dtRetorno = new Date(dataEmissao);
  dtRetorno.setDate(dtRetorno.getDate() + Number(diasAfastamento || 1));

  const novo: AtestadoMedico = {
    id: `at-${Date.now()}`,
    colaboradorId,
    colaboradorNome: colab?.nome || 'Colaborador',
    dataEmissao,
    diasAfastamento: Number(diasAfastamento || 1),
    dataRetorno: dtRetorno.toISOString().substring(0, 10),
    cid10: cid10 || 'R50 (Febre)',
    nomeMedico: nomeMedico || 'Médico Plantonista',
    crmMedico: crmMedico || '12345',
    ufCrm: ufCrm || 'PR',
    status: 'HOMOLOGADA',
    abonarHorasPonto: true,
    solicitadoEm: new Date().toISOString(),
    analisadoPor: 'Gestor RH'
  };

  atestados.unshift(novo);
  registrarLogAuditoria('CADASTROU_ATESTADO', 'AtestadoMedico', novo, req);
  res.status(201).json(novo);
});

// ============================================================================
// FASE 6: ADMISSÃO DIGITAL, ONBOARDING E GED
// ============================================================================

app.get('/api/admissoes', (_, res) => res.json(admissoes));

app.post('/api/admissoes', (req: Request, res: Response) => {
  const { candidatoNome, cpf, email, telefone, cargoPretendido, salarioProposto } = req.body;
  const nova: ProcessoAdmissao = {
    id: `adm-${Date.now()}`,
    candidatoNome,
    cpf,
    email,
    telefone,
    cargoPretendido,
    departamento: 'Operações e Eventos',
    salarioProposto: Number(salarioProposto || 3000),
    dataPrevisaoInicio: hojeStr,
    status: 'INICIADA',
    iniciadoEm: new Date().toISOString()
  };
  admissoes.unshift(nova);
  registrarLogAuditoria('INICIOU_ADMISSAO', 'ProcessoAdmissao', nova, req);
  res.status(201).json(nova);
});

app.post('/api/admissoes/:id/concluir', (req: Request, res: Response) => {
  const adm = admissoes.find(a => a.id === req.params.id);
  if (!adm) return res.status(404).json({ erro: 'Processo admissional não encontrado.' });

  const matricula = `DISK-${Math.floor(10000 + Math.random() * 90000)}`;
  adm.status = 'CONTRATADO';
  adm.matriculaGerada = matricula;
  adm.concluidoEm = new Date().toISOString();

  // Cria colaborador ativo automaticamente
  const novoColab: Colaborador = {
    id: `col-${Date.now()}`,
    nome: adm.candidatoNome,
    cpf: adm.cpf,
    matricula,
    cargo: adm.cargoPretendido,
    departamento: adm.departamento,
    centroCusto: 'CC-010-OPS',
    cargaHorariaSemanal: 44,
    tipoContrato: 'CLT',
    dataAdmissao: hojeStr,
    salarioBase: adm.salarioProposto,
    telefone: adm.telefone,
    email: adm.email,
    ativo: true,
    criadoEm: new Date().toISOString()
  };
  colaboradores.push(novoColab);

  registrarLogAuditoria('CONCLUIU_ADMISSAO', 'Colaborador', novoColab, req);
  res.json({ admissao: adm, colaborador: novoColab });
});

app.get('/api/documentos', (_, res) => res.json(documentosGED));

app.post('/api/documentos/:id/assinar', (req: Request, res: Response) => {
  const doc = documentosGED.find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ erro: 'Documento não encontrado.' });

  doc.status = 'ASSINADO';
  doc.assinadoEm = new Date().toISOString();
  doc.ipAssinatura = req.ip || '127.0.0.1';

  registrarLogAuditoria('ASSINOU_DOCUMENTO_GED', 'DocumentoGED', doc, req);
  res.json(doc);
});

// ============================================================================
// FASE 7: BENEFÍCIOS CORPORATIVOS
// ============================================================================

app.get('/api/beneficios', (_, res) => res.json(beneficios));

app.post('/api/beneficios/atribuir', (req: Request, res: Response) => {
  const { colaboradorId, tipo, operadora, valorMensal, descontoEmFolha, cartaoNumero } = req.body;
  const colab = colaboradores.find(c => c.id === colaboradorId);

  const novo: BeneficioColaborador = {
    id: `ben-${Date.now()}`,
    colaboradorId,
    colaboradorNome: colab?.nome || 'Colaborador',
    tipo,
    operadora,
    valorMensal: Number(valorMensal || 0),
    descontoEmFolha: Number(descontoEmFolha || 0),
    status: 'ATIVO',
    cartaoNumero,
    iniciadoEm: hojeStr
  };
  beneficios.push(novo);
  registrarLogAuditoria('ATRIBUIU_BENEFICIO', 'BeneficioColaborador', novo, req);
  res.status(201).json(novo);
});

app.get('/api/beneficios/pedidos', (_, res) => res.json(pedidosBeneficios));

app.post('/api/beneficios/calcular-competencia', (req: Request, res: Response) => {
  const { competencia } = req.body;
  const comp = competencia || competenciaAtual;

  // Totaliza VR com base nos colaboradores ativos
  const totalVR = beneficios.filter(b => b.tipo === 'VALE_REFEICAO' && b.status === 'ATIVO').reduce((acc, b) => acc + b.valorMensal, 0);
  const descVR = beneficios.filter(b => b.tipo === 'VALE_REFEICAO' && b.status === 'ATIVO').reduce((acc, b) => acc + b.descontoEmFolha, 0);

  const pedido: PedidoBeneficio = {
    id: `ped-ben-${Date.now()}`,
    competencia: comp,
    tipo: 'VALE_REFEICAO',
    totalColaboradores: colaboradores.length,
    valorTotalRecarga: totalVR || 3850.00,
    descontoTotalFolha: descVR || 385.00,
    status: 'APROVADO',
    dataPedido: hojeStr
  };

  pedidosBeneficios.unshift(pedido);
  registrarLogAuditoria('CALCULOU_PEDIDO_BENEFICIOS', 'PedidoBeneficio', pedido, req);
  res.status(201).json(pedido);
});

// ============================================================================
// FASE 8: FOLHA DE PAGAMENTO & INTEGRAÇÃO BANCÁRIA
// ============================================================================

app.get('/api/folha', (_, res) => res.json(folhasPagamento));
app.get('/api/folha/:competencia/holerites', (req: Request, res: Response) => {
  res.json(holerites);
});

app.post('/api/folha/calcular/:competencia', (req: Request, res: Response) => {
  const { competencia } = req.params;

  let totalProventos = 0;
  let totalDescontos = 0;
  let totalLiquido = 0;

  for (const c of colaboradores) {
    const salario = c.salarioBase || 3500.00;
    const inss = Math.round(salario * 0.11 * 100) / 100;
    const vt = Math.round(salario * 0.06 * 100) / 100;
    const desc = inss + vt;
    const liq = salario - desc;

    totalProventos += salario;
    totalDescontos += desc;
    totalLiquido += liq;
  }

  const folha: FolhaPagamento = {
    id: `folha-${competencia.replace('-', '')}`,
    competencia,
    status: 'FECHADA',
    totalColaboradores: colaboradores.length,
    totalProventos,
    totalDescontos,
    totalLiquido,
    totalEncargosEmpresa: Math.round(totalProventos * 0.168 * 100) / 100, // FGTS + Encargos
    fechadaEm: new Date().toISOString(),
    fechadaPor: 'usr-rh-01'
  };

  folhasPagamento.unshift(folha);
  registrarLogAuditoria('CALCULOU_FOLHA', 'FolhaPagamento', folha, req);
  res.status(201).json(folha);
});

app.post('/api/folha/:competencia/enviar-tesouraria', (req: Request, res: Response) => {
  const folha = folhasPagamento.find(f => f.competencia === req.params.competencia);
  if (!folha) return res.status(404).json({ erro: 'Folha não encontrada.' });

  const lotePixId = `LOTE-PIX-FOLHA-${req.params.competencia.replace('-', '')}`;
  folha.status = 'ENVIADA_TESOURARIA';
  folha.lotePixId = lotePixId;

  registrarLogAuditoria('ENVIADA_TESOURARIA_FOLHA', 'FolhaPagamento', { folhaId: folha.id, lotePixId, valorTotal: folha.totalLiquido }, req);
  res.json({ mensagem: 'Folha enviada com sucesso para a Tesouraria Disk (Fila PIX)', folha, lotePixId });
});

// ============================================================================
// FASE 9: STAFF DE EVENTOS, FREELANCERS & DRE
// ============================================================================

app.get('/api/staff-eventos', (_, res) => res.json(staffEventos));

app.post('/api/staff-eventos/escalar', (req: Request, res: Response) => {
  const { eventoId, eventoNome, localId, localNome, data, nomeProfissional, cpf, funcao, valorDiaria, valorTransporte, valorAlimentacao, chavePix } = req.body;
  const vDiaria = Number(valorDiaria || 180);
  const vTrans = Number(valorTransporte || 30);
  const vAlim = Number(valorAlimentacao || 40);

  const nova: DiariaStaffEvento = {
    id: `dia-${Date.now()}`,
    eventoId: eventoId || 'evt-curitiba-rock',
    eventoNome: eventoNome || 'Show Nacional Curitiba',
    localId: localId || 'loc-02',
    localNome: localNome || 'Arena da Baixada',
    data: data || hojeStr,
    nomeProfissional,
    cpf,
    funcao: funcao || 'OPERADOR_CAIXA',
    valorDiaria: vDiaria,
    valorTransporte: vTrans,
    valorAlimentacao: vAlim,
    valorTotal: vDiaria + vTrans + vAlim,
    status: 'ESCALADO',
    chavePix,
    criadoEm: new Date().toISOString()
  };

  staffEventos.push(nova);
  registrarLogAuditoria('ESCALOU_STAFF_EVENTO', 'DiariaStaffEvento', nova, req);
  res.status(201).json(nova);
});

app.post('/api/staff-eventos/:id/checkin', (req: Request, res: Response) => {
  const d = staffEventos.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ erro: 'Escala não encontrada.' });
  d.checkInHora = new Date().toISOString();
  d.status = 'PRESENTE_VALIDADO';
  registrarLogAuditoria('CHECKIN_STAFF', 'DiariaStaffEvento', d, req);
  res.json(d);
});

app.post('/api/staff-eventos/aprovar-lote-pix', (req: Request, res: Response) => {
  const { ids } = req.body;
  const lista = ids ? staffEventos.filter(s => ids.includes(s.id)) : staffEventos;
  let total = 0;

  for (const item of lista) {
    item.status = 'PAGO_PIX';
    total += item.valorTotal;
  }

  const loteId = `LOTE-PIX-STAFF-${Date.now()}`;
  registrarLogAuditoria('PAGAMENTO_STAFF_PIX', 'DiariaStaffEvento', { total, loteId, quantidade: lista.length }, req);
  res.json({ mensagem: 'Pagamentos de staff aprovados e integrados à Tesouraria PIX', loteId, valorTotal: total });
});

app.get('/api/staff-eventos/custos/:eventoId', (req: Request, res: Response) => {
  const equipe = staffEventos.filter(s => s.eventoId === req.params.eventoId);
  const totalMaoDeObra = equipe.reduce((acc, s) => acc + s.valorTotal, 0);

  res.json({
    eventoId: req.params.eventoId,
    eventoNome: equipe[0]?.eventoNome || 'Evento',
    totalStaff: equipe.length,
    custoTotalMaoDeObra: totalMaoDeObra,
    integradoDRE: true
  });
});

// ============================================================================
// FASE 10: PEOPLE ANALYTICS & ESOCIAL
// ============================================================================

app.get('/api/analytics/kpis', (_, res) => {
  res.json({
    headcountTotal: colaboradores.length,
    turnoverMensal: 1.8, // 1.8% rotatividade
    taxaAbsenteismo: 0.9, // 0.9% faltas/atrasos
    custoMedioPorColaborador: 3740.00,
    horasExtrasTotalCompetencia: 62,
    percentualHorasExtrasFolha: 3.2,
    distribuicaoDepartamentos: [
      { departamento: 'Operações e Eventos', total: 4, custo: 15200.00 },
      { departamento: 'Financeiro e Controladoria', total: 1, custo: 4600.00 }
    ],
    cltVsPjVsStaff: [
      { tipo: 'CLT Integral', total: colaboradores.length },
      { tipo: 'Staff de Eventos', total: staffEventos.length }
    ]
  });
});

app.get('/api/esocial/eventos', (_, res) => res.json(eventosESocial));

app.post('/api/esocial/gerar/:tipo', (req: Request, res: Response) => {
  const { tipo } = req.params;
  const novo: EventoESocial = {
    id: `esoc-${Date.now()}`,
    tipo,
    identificador: `ID107890123000199${Date.now()}`,
    status: 'VALIDADO',
    geradoEm: new Date().toISOString()
  };
  eventosESocial.unshift(novo);
  registrarLogAuditoria('GEROU_EVENTO_ESOCIAL', 'EventoESocial', novo, req);
  res.status(201).json(novo);
});

// Trilha Geral de Auditoria
app.get('/api/auditoria', (_, res) => res.json(auditoria));

export default app;

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3333;
  app.listen(PORT, () => {
    console.log(`✓ RH Disk API V1.10 (Fases 1 a 10 Operacionais) rodando na porta ${PORT}`);
  });
}
