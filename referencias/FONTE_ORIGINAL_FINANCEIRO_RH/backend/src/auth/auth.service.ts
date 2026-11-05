/**
 * Serviço de Autenticação Central & Controle de Sessão
 * Regra de Segurança: O login identifica o perfil e injeta o contexto obrigatório de isolamento
 */

import { ContextoRequisicao, PerfilUsuario } from '../types';
import { mockSeedData } from '../../../database/seed';

export class AuthService {
  /**
   * Autentica usuário de demonstração ou credenciais oficiais
   */
  static autenticar(email: string): { usuario: any; contexto: ContextoRequisicao } {
    const user = mockSeedData.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      throw new Error(`401 — Credenciais inválidas para o e-mail: ${email}`);
    }

    const contexto: ContextoRequisicao = {
      usuarioId: user.id,
      perfil: user.perfil as PerfilUsuario,
      produtorId: user.produtorId,
      permissoes: this.gerarPermissoes(user.perfil as PerfilUsuario)
    };

    return { usuario: user, contexto };
  }

  /**
   * Mapeamento de permissões granulares por perfil
   */
  private static gerarPermissoes(perfil: PerfilUsuario): string[] {
    switch (perfil) {
      case "PRODUTOR":
        return [
          "PRODUTOR_VISUALIZAR_PROPRIO",
          "PRODUTOR_SOLICITAR_REPASSE",
          "PRODUTOR_SOLICITAR_ANTECIPACAO",
          "PRODUTOR_TRANSFERIR_EVENTOS",
          "PRODUTOR_ASSINAR_DIGITALMENTE",
          "PRODUTOR_EXPORTAR_RELATORIOS"
        ];
      case "FINANCEIRO":
        return [
          "FINANCEIRO_VISAO_TRANSVERSAL",
          "FINANCEIRO_ANALISAR_SOLICITACOES",
          "FINANCEIRO_APROVAR_REJEITAR",
          "FINANCEIRO_ASSINAR_ULTIMO",
          "FINANCEIRO_EXECUTAR_PAGAMENTOS",
          "FINANCEIRO_GERIR_TESOURARIA",
          "FINANCEIRO_GERIR_GATEWAYS",
          "FINANCEIRO_CONSULTAR_LEDGER",
          "FINANCEIRO_CONCILIACAO_BANCARIA"
        ];
      case "ADMINISTRADOR":
        return ["*"]; // Acesso irrestrito total
      default:
        return [];
    }
  }
}
