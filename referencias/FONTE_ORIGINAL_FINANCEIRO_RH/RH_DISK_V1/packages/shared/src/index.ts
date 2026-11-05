// ============================================================================
// RH DISK V1 + DISK PONTO - PACOTE DE TIPOS COMPARTILHADOS (SHARED TYPES)
// FASES 1 A 10: ECOSSISTEMA COMPLETO DE RECURSOS HUMANOS & DEPARTAMENTO PESSOAL
// ============================================================================

export type Perfil = 'ADMINISTRADOR' | 'RH' | 'GESTOR' | 'COLABORADOR';

export type TipoBatida = 'ENTRADA' | 'INICIO_INTERVALO' | 'FIM_INTERVALO' | 'SAIDA';

export type StatusBatida = 
  | 'VALIDADA' 
  | 'FORA_DA_AREA' 
  | 'PENDENTE_ANALISE' 
  | 'OFFLINE_SINCRONIZADA';

export type StatusAjuste = 'PENDENTE' | 'APROVADO' | 'REPROVADO';

export type StatusFechamento = 'ABERTO' | 'EM_ANALISE' | 'FECHADO' | 'REABERTO';

export type StatusDispositivo = 'PENDENTE' | 'AUTORIZADO' | 'BLOQUEADO';

// Fase 5 Enums
export type StatusFerias = 'SOLICITADA' | 'APROVADA_GESTOR' | 'HOMOLOGADA_RH' | 'EM_GOZO' | 'CONCLUIDA' | 'CANCELADA';
export type TipoAusencia = 'ATESTADO_MEDICO' | 'LICENCA_MATERNIDADE' | 'LICENCA_PATERNIDADE' | 'LUTO_NOJO' | 'CASAMENTO_GALA' | 'DOACAO_SANGUE' | 'CONVOCACAO_JUDICIAL' | 'FOLGA_BANCO' | 'OUTROS';
export type StatusAusencia = 'PENDENTE' | 'HOMOLOGADA' | 'RECUSADA';

// Fase 6 Enums
export type StatusAdmissao = 'INICIADA' | 'DOCUMENTOS_ENVIADOS' | 'EM_ANALISE' | 'APROVADA' | 'CONTRATADO' | 'CANCELADA';
export type TipoDocumento = 'CONTRATO_TRABALHO' | 'TERMO_CONFIDENCIALIDADE' | 'TERMO_EQUIPAMENTO' | 'ASO_ADMISSIONAL' | 'ASO_PERIODICO' | 'RG_CPF' | 'COMPROVANTE_RESIDENCIA' | 'CERTIDAO' | 'OUTROS';
export type StatusDocumento = 'PENDENTE_ASSINATURA' | 'ASSINADO' | 'VALIDO' | 'VENCIDO' | 'REJEITADO';

// Fase 7 Enums
export type TipoBeneficio = 'VALE_TRANSPORTE' | 'VALE_REFEICAO' | 'VALE_ALIMENTACAO' | 'PLANO_SAUDE' | 'PLANO_ODONTO' | 'SEGURO_VIDA' | 'CONVENIO_FARMACIA';
export type StatusBeneficio = 'ATIVO' | 'SUSPENSO' | 'CANCELADO';

// Fase 8 Enums
export type StatusFolha = 'PREVIA' | 'FECHADA' | 'ENVIADA_TESOURARIA' | 'PAGA';
export type TipoRubrica = 'PROVENTO' | 'DESCONTO' | 'INFORMATIVA';

// Fase 9 Enums
export type FuncaoStaffEvento = 'COORDENADOR_BILHETERIA' | 'OPERADOR_CAIXA' | 'CONTROLADOR_ACESSO' | 'SUPERVISOR_BAR' | 'SUPORTE_TI' | 'BRIGADISTA';
export type StatusDiaria = 'ESCALADO' | 'PRESENTE_VALIDADO' | 'APROVADO_PAGAMENTO' | 'PAGO_PIX' | 'FALTOU';

// Fase 10 Enums
export type TipoEventoESocial = 'S_1000' | 'S_2200' | 'S_2206' | 'S_2299' | 'S_1200' | 'S_1210';
export type StatusESocial = 'GERADO' | 'VALIDADO' | 'TRANSMITIDO' | 'REJEITADO';

// ----------------------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------------------

export interface UsuarioDTO {
  id: string;
  email: string;
  perfil: Perfil;
  nome?: string;
  colaboradorId?: string;
  criadoEm?: string;
}

export interface ColaboradorDTO {
  id: string;
  usuarioId?: string;
  nome: string;
  cpf: string;
  matricula: string;
  cargo: string;
  departamento: string;
  gestorId?: string;
  centroCusto?: string;
  cargaHorariaSemanal?: number;
  tipoContrato?: 'CLT' | 'PJ' | 'ESTAGIO' | 'FREELANCER_EVENTO';
  dataAdmissao?: string;
  ativo: boolean;
  telefone?: string;
  email?: string;
  chavePix?: string;
  tipoChavePix?: string;
  banco?: string;
  salario?: number;
  criadoEm?: string;
}

export interface LocalPontoDTO {
  id: string;
  nome: string;
  endereco?: string;
  latitude: number;
  longitude: number;
  raioMetros: number;
  ativo: boolean;
}

export interface JornadaDTO {
  id: string;
  nome: string;
  entrada: string;
  inicioIntervalo?: string;
  fimIntervalo?: string;
  saida: string;
  toleranciaMinutos?: number;
  cargaMinutos?: number;
}

export interface EscalaDTO {
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

export interface BatidaPontoDTO {
  id: string;
  nsr?: number;
  colaboradorId: string;
  colaboradorNome?: string;
  colaboradorMatricula?: string;
  tipo: TipoBatida;
  status: StatusBatida;
  instanteServidor: string;
  instanteDispositivo?: string;
  latitude: number;
  longitude: number;
  precisaoMetros?: number;
  distanciaLocalMetros?: number;
  localId?: string;
  localNome?: string;
  eventoId?: string;
  eventoNome?: string;
  offline: boolean;
  dispositivoId?: string;
  mockLocationSuspeita: boolean;
  comprovanteNsr?: string;
  hashIntegridade?: string;
  criadoEm: string;
}

export interface AjustePontoDTO {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  batidaId?: string;
  dataPonto: string;
  tipoBatida: TipoBatida;
  horarioCorreto: string;
  motivo?: string;
  justificativa: string;
  status: StatusAjuste;
  solicitadoEm: string;
  analisadoEm?: string;
  analisadoPor?: string;
  parecer?: string;
}

export interface BancoHorasDTO {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  competencia: string;
  minutosSaldo: number;
  minutosExtras: number;
  minutosDebito: number;
  atualizadoEm: string;
}

export interface FechamentoPontoDTO {
  id: string;
  competencia: string;
  status: StatusFechamento;
  fechadoEm?: string;
  fechadoPor?: string;
  observacao?: string;
  criadoEm: string;
}

export interface DispositivoDTO {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  identificador: string;
  nome?: string;
  plataforma?: string;
  status: StatusDispositivo;
  ultimoAcesso?: string;
  criadoEm: string;
}

// ----------------------------------------------------------------------------
// DTOs FASE 5: FÉRIAS, ATESTADOS E AUSÊNCIAS
// ----------------------------------------------------------------------------

export interface FeriasDTO {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  periodoAquisitivoInicio: string;
  periodoAquisitivoFim: string;
  dataInicio: string;
  dataFim: string;
  diasGozados: number;
  abonoPecuniarioDias: number; // Ex: 10 dias vendidos
  adiantamento13: boolean;
  status: StatusFerias;
  solicitadoEm: string;
  homologadoEm?: string;
  homologadoPor?: string;
}

export interface AtestadoMedicoDTO {
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
  status: StatusAusencia;
  abonarHorasPonto: boolean;
  solicitadoEm: string;
  analisadoPor?: string;
}

export interface AusenciaLegalDTO {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  tipo: TipoAusencia;
  dataInicio: string;
  dataFim: string;
  dias: number;
  motivo: string;
  comprovanteUrl?: string;
  status: StatusAusencia;
}

// ----------------------------------------------------------------------------
// DTOs FASE 6: ADMISSÃO, ONBOARDING & GED
// ----------------------------------------------------------------------------

export interface ProcessoAdmissaoDTO {
  id: string;
  candidatoNome: string;
  cpf: string;
  email: string;
  telefone: string;
  cargoPretendido: string;
  departamento: string;
  salarioProposto: number;
  dataPrevisaoInicio: string;
  status: StatusAdmissao;
  checklistDocumentos: {
    rgCpf: boolean;
    ctpsDigital: boolean;
    comprovanteEndereco: boolean;
    tituloEleitor: boolean;
    asoAdmissional: boolean;
  };
  matriculaGerada?: string;
  iniciadoEm: string;
  concluidoEm?: string;
}

export interface DocumentoGEDDTO {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  tipo: TipoDocumento;
  titulo: string;
  arquivoUrl: string;
  hashSHA256: string;
  status: StatusDocumento;
  requerAssinatura: boolean;
  assinadoEm?: string;
  ipAssinatura?: string;
  dataUpload: string;
  dataVencimento?: string;
}

// ----------------------------------------------------------------------------
// DTOs FASE 7: BENEFÍCIOS
// ----------------------------------------------------------------------------

export interface BeneficioColaboradorDTO {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  tipo: TipoBeneficio;
  operadora: string;
  valorMensal: number;
  descontoEmFolha: number;
  status: StatusBeneficio;
  cartaoNumero?: string;
  iniciadoEm: string;
}

export interface PedidoBeneficioMensalDTO {
  id: string;
  competencia: string;
  tipo: TipoBeneficio;
  totalColaboradores: number;
  valorTotalRecarga: number;
  descontoTotalFolha: number;
  status: 'COTACAO' | 'APROVADO' | 'RECARREGADO';
  dataPedido: string;
}

// ----------------------------------------------------------------------------
// DTOs FASE 8: FOLHA DE PAGAMENTO & CNAB 240 / PIX LOTE
// ----------------------------------------------------------------------------

export interface ItemRubricaDTO {
  codigo: string;
  descricao: string;
  tipo: TipoRubrica;
  referencia: string; // Ex: "176h", "5h20m", "7.5%"
  valor: number;
}

export interface HoleriteDTO {
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
  rubricas: ItemRubricaDTO[];
  baseINSS: number;
  baseIRRF: number;
  baseFGTS: number;
  fgtsRecolher: number;
  chavePix?: string;
}

export interface FolhaPagamentoDTO {
  id: string;
  competencia: string;
  status: StatusFolha;
  totalColaboradores: number;
  totalProventos: number;
  totalDescontos: number;
  totalLiquido: number;
  totalEncargosEmpresa: number; // FGTS + INSS Patronal
  fechadaEm?: string;
  fechadaPor?: string;
  lotePixId?: string;
}

// ----------------------------------------------------------------------------
// DTOs FASE 9: STAFF DE EVENTOS, FREELANCERS & DRE
// ----------------------------------------------------------------------------

export interface DiariaStaffEventoDTO {
  id: string;
  eventoId: string;
  eventoNome: string;
  localId: string;
  localNome: string;
  data: string;
  colaboradorId?: string;
  nomeProfissional: string;
  cpf: string;
  funcao: FuncaoStaffEvento;
  valorDiaria: number;
  valorTransporte: number;
  valorAlimentacao: number;
  valorTotal: number;
  checkInHora?: string;
  checkOutHora?: string;
  status: StatusDiaria;
  chavePix: string;
  aprovadoPor?: string;
}

export interface ConsolidadoCustosEventoDTO {
  eventoId: string;
  eventoNome: string;
  totalStaff: number;
  custoTotalDiarias: number;
  custoTotalAlimentacao: number;
  custoTotalTransporte: number;
  custoTotalMaoDeObra: number;
  integradoDRE: boolean;
}

// ----------------------------------------------------------------------------
// DTOs FASE 10: PEOPLE ANALYTICS, ESOCIAL & AUDITORIA
// ----------------------------------------------------------------------------

export interface EventoESocialDTO {
  id: string;
  tipo: TipoEventoESocial;
  identificador: string;
  reciboEntrega?: string;
  status: StatusESocial;
  geradoEm: string;
  transmitidoEm?: string;
  payloadXmlJson?: any;
}

export interface PeopleAnalyticsDTO {
  headcountTotal: number;
  turnoverMensal: number;
  taxaAbsenteismo: number;
  custoMedioPorColaborador: number;
  horasExtrasTotalCompetencia: number;
  percentualHorasExtrasFolha: number;
  distribuicaoDepartamentos: { departamento: string; total: number; custo: number }[];
  cltVsPjVsStaff: { tipo: string; total: number }[];
}

export interface AuditoriaDTO {
  id: string;
  usuarioId?: string;
  usuarioNome?: string;
  acao: string;
  entidade: string;
  entidadeId?: string;
  dados?: any;
  criadoEm: string;
  ip?: string;
}
