/**
 * Definições de Tipos Oficiais do Core Financeiro Disk Ingressos
 */

export type PerfilUsuario =
  | "PRODUTOR"
  | "FINANCEIRO"
  | "ADMINISTRADOR";

export type TipoSolicitacao =
  | "REPASSE"
  | "ANTECIPACAO"
  | "BORDERO";

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
  | "PAGO"
  | "CONCLUIDO";

export interface ContextoRequisicao {
  usuarioId: string;
  perfil: PerfilUsuario;
  produtorId: string | null;
  permissoes: string[];
}

export interface ContextoFinanceiroGlobal {
  produtorId: string | null; // null = Todos os Produtores
  eventoId: string | null;   // null = Todos os Eventos
  termoBusca?: string;
}

export interface AuditRecord {
  id: string;
  solicitacaoId?: string;
  dataHora: string;
  autor: string;
  acao: string;
  detalhes?: string;
  ip?: string;
}

export interface RejeicaoFormal {
  motivoCategoria: string;
  justificativa: string;
  rejeitadoPor: string;
  rejeitadoEm: string;
}

export interface AssinaturaSequencial {
  produtor: {
    assinado: boolean;
    assinadoPor: string | null;
    assinadoEm: string | null;
    ip: string | null;
    certificado: string | null;
  };
  financeiro: {
    assinado: boolean;
    assinadoPor: string | null;
    assinadoEm: string | null;
    ip: string | null;
    certificado: string | null;
    bloqueadoAguardandoProdutor: boolean;
  };
}
