/**
 * Tipos e Definições do Core Financeiro Disk Ingressos (TypeScript)
 */

export type PerfilUsuario = "PRODUTOR" | "FINANCEIRO" | "ADMINISTRADOR";

export type TipoSolicitacao = "REPASSE" | "ANTECIPACAO" | "BORDERO";

export type StatusSolicitacao =
  | "RASCUNHO"
  | "ENVIADO"
  | "AGUARDANDO_ANALISE"
  | "EM_ANALISE"
  | "APROVADO"
  | "REJEITADO"
  | "AGUARDANDO_ASSINATURA_PRODUTOR"
  | "AGUARDANDO_ASSINATURA_FINANCEIRO"
  | "ASSINADO"
  | "PROGRAMADO"
  | "PROCESSANDO"
  | "PAGO"
  | "CONCLUIDO"
  | "CANCELADO";

export interface UsuarioSession {
  id: string;
  email: string;
  nome: string;
  perfil: PerfilUsuario;
  produtorId?: string | null;
  cargo?: string;
  token?: string;
}

export interface Produtor {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  emailFinanceiro: string;
  telefone: string;
  status: 'ATIVO' | 'BLOQUEADO' | 'PENDENCIA_CADASTRAL';
  taxaComissaoPadrao: number;
  limiteAntecipacao: number;
}

export interface Evento {
  id: string;
  produtorId: string;
  nome: string;
  categoria: string;
  local: string;
  cidade: string;
  dataRealizacao: string;
  statusVendas: 'ABERTO' | 'ESGOTANDO' | 'ENCERRADO';
}

export interface SaldoEvento {
  eventoId: string;
  vendasBrutas: number;
  taxasDeducoes: number;
  saldoDisponivel: number;
  aReceber: number;
  bloqueadoReserva: number;
}

export interface AssinaturaSignatario {
  assinado: boolean;
  assinadoPor?: string;
  dataHora?: string;
  perfil?: PerfilUsuario;
  ipOrigem?: string;
  hashAssinatura?: string;
}

export interface AssinaturasContrato {
  documentoId: string;
  produtor: AssinaturaSignatario;
  financeiroDisk: AssinaturaSignatario;
}

export interface RejeicaoFormal {
  motivoCategoria: string;
  observacao: string;
  rejeitadoPor: string;
  rejeitadoEm: string;
}

export interface SolicitacaoFinanceira {
  id: string;
  protocolo: string;
  produtorId: string;
  produtorNome: string;
  eventoId: string;
  eventoNome: string;
  tipo: TipoSolicitacao;
  status: StatusSolicitacao;
  dataCriacao: string;
  valorBruto: number;
  taxaDesconto: number;
  valorLiquido: number;
  dadosBancarios: {
    banco: string;
    agencia: string;
    conta: string;
    chavePix?: string;
  };
  aprovadoPor?: string;
  aprovadoEm?: string;
  rejeicao?: RejeicaoFormal;
  assinaturas: AssinaturasContrato;
  dataLiquidacao?: string;
  codigoAutenticacaoBancaria?: string;
}

export interface LedgerEntry {
  id: string;
  dataHora: string;
  produtorId: string;
  eventoId: string;
  tipoOperacao: 'VENDA' | 'TAXA' | 'MDR' | 'ESTORNO' | 'CHARGEBACK' | 'REPASSE' | 'ANTECIPACAO' | 'AJUSTE' | 'BLOQUEIO' | 'DESBLOQUEIO';
  origem: string;
  referencia: string;
  contaDebito: string;
  contaCredito: string;
  valorDebito: number;
  valorCredito: number;
  saldoApos: number;
  usuarioResponsavel: string;
}

export interface NotificacaoOperacional {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'INFO' | 'SOLICITACAO' | 'APROVACAO' | 'ASSINATURA' | 'PAGAMENTO' | 'ALERTA';
  dataHora: string;
  lida: boolean;
  linkAcao?: string;
}
