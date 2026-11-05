/**
 * Adapter de Integração do PDT Novo — Disk Ingressos (Homologação & Produção)
 * Define os contratos de ponte para consultar Produtores por CNPJ, Eventos,
 * Vendas apuradas e sincronização de lançamentos financeiros no Core/Ledger corporativo.
 */

export const pdtNovoAdapter = {
  // Flag de status da conexão
  isConnected: false,
  endpoint: process.env.PDT_NOVO_API_URL || "https://pdtnovo.diskingressos.com.br/api/financeiro",

  /**
   * Consulta dados cadastrais e fiscais do produtor por CNPJ
   * @param {string} cnpj
   */
  async getProducerByCnpj(cnpj) {
    if (!this.isConnected) {
      // Mock homologação
      return {
        id: "PROD-001",
        cnpj: cnpj || "14.829.301/0001-92",
        legalName: "Produtora Alpha Brasil Ltda.",
        tradeName: "Alpha Shows & Festivais",
        bankValidated: true,
        accountStatus: "ATIVA"
      };
    }
    const res = await fetch(`${this.endpoint}/produtores/cnpj/${encodeURIComponent(cnpj)}`);
    if (!res.ok) throw new Error(`Erro ao consultar produtor no PDT Novo: ${res.statusText}`);
    return await res.json();
  },

  /**
   * Consulta eventos associados ao CNPJ do produtor no PDT Novo
   * @param {string} producerId
   */
  async getEventsByProducer(producerId) {
    if (!this.isConnected) {
      return [
        { id: "EV-001", name: "Festival de Homologação 2026", salesTarget: 1000000.0, sold: 540000.0 },
        { id: "EV-002", name: "Show de Outono Curitiba", salesTarget: 800000.0, sold: 240000.0 },
        { id: "EV-003", name: "Arena Eletrônica Fest", salesTarget: 2000000.0, sold: 1500000.0 }
      ];
    }
    const res = await fetch(`${this.endpoint}/produtores/${producerId}/eventos`);
    if (!res.ok) throw new Error(`Erro ao buscar eventos no PDT Novo: ${res.statusText}`);
    return await res.json();
  },

  /**
   * Apura resumo de vendas brutas, taxas, estornos e líquido para um evento
   * @param {string} eventId
   */
  async getSalesSummary(eventId) {
    if (!this.isConnected) {
      return {
        eventId,
        grossSales: 540000.0,
        refunds: 10000.0,
        processingFees: 24000.0,
        diskServiceFees: 20000.0,
        netSales: 486000.0,
        ticketsSold: 4160,
        lastTransactionAt: new Date().toISOString()
      };
    }
    const res = await fetch(`${this.endpoint}/eventos/${eventId}/vendas-resumo`);
    if (!res.ok) throw new Error(`Erro ao apurar vendas no PDT Novo: ${res.statusText}`);
    return await res.json();
  },

  /**
   * Publica lançamento contábil no Ledger central do PDT Novo
   * @param {object} entry
   */
  async publishFinancialEntry(entry) {
    if (!this.isConnected) {
      return {
        success: true,
        protocol: `PDT-${Date.now()}`,
        recordedAt: new Date().toISOString(),
        entry
      };
    }
    const res = await fetch(`${this.endpoint}/ledger/lancamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry)
    });
    if (!res.ok) throw new Error(`Erro ao publicar lançamento no PDT Novo: ${res.statusText}`);
    return await res.json();
  }
};