import crypto from 'crypto';

export interface Geofence {
  id: string;
  nome: string;
  tipo: 'SEDE' | 'FILIAL' | 'ARENA_EVENTO' | 'LOCAL_EXTERNO';
  latitude: number;
  longitude: number;
  raioMetros: number;
  endereco: string;
  cidade: string;
  uf: string;
  ativo: boolean;
  eventoId?: string;
}

export interface ColaboradorDTO {
  id: string;
  matricula: string;
  nome: string;
  cpf: string;
  rg?: string;
  email: string;
  telefone: string;
  fotoUrl?: string;
  cargo: string;
  departamento: string;
  tipoContrato: 'CLT' | 'PJ' | 'FREELANCER_EVENTO' | 'ESTAGIO';
  status: 'ATIVO' | 'FERIAS' | 'AFASTADO' | 'DESLIGADO';
  salario: number;
  valorDiariaEvento?: number;
  chavePix?: string;
  tipoChavePix?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  geofencePadraoId?: string;
}

export interface RegistroPontoInput {
  uuidDispositivo?: string;
  colaboradorId: string;
  tipo: 'ENTRADA' | 'INTERVALO_INICIO' | 'INTERVALO_FIM' | 'SAIDA';
  dataHoraMarcacao: string; // ISO String
  latitude?: number;
  longitude?: number;
  precisaoMetros?: number;
  geofenceId?: string;
  dispositivoInfo?: string;
  ipOrigem?: string;
  modoCaptura?: 'APP_ONLINE' | 'APP_OFFLINE_SYNC' | 'WEB_ADMIN';
}

export interface RegistroPontoRecord {
  id: string;
  nsr: number;
  colaboradorId: string;
  tipo: 'ENTRADA' | 'INTERVALO_INICIO' | 'INTERVALO_FIM' | 'SAIDA';
  dataHoraMarcacao: string;
  dataHoraServidor: string;
  latitude?: number;
  longitude?: number;
  precisaoMetros?: number;
  geofenceId?: string;
  dentroGeofence: boolean;
  distanciaGeofence?: number;
  modoCaptura: 'APP_ONLINE' | 'APP_OFFLINE_SYNC' | 'WEB_ADMIN';
  hashIntegridade: string;
  comprovanteNsr: string;
  ipOrigem?: string;
  dispositivoInfo?: string;
  uuidDispositivo?: string;
  sincronizado: boolean;
  sincronizadoEm?: string;
}

export interface SolicitacaoAjusteInput {
  colaboradorId: string;
  dataPonto: string;
  tipoAjuste: 'ENTRADA' | 'INTERVALO_INICIO' | 'INTERVALO_FIM' | 'SAIDA';
  horarioCorreto: string; // "HH:MM"
  motivo: string;
  justificativa: string;
  comprovanteUrl?: string;
}

export interface CustoMaoDeObraEventoRecord {
  id: string;
  eventoId: string;
  colaboradorId: string;
  colaboradorNome: string;
  cargoFuncao: string;
  tipoContratacao: 'CLT' | 'PJ' | 'FREELANCER_EVENTO';
  valorDiaria: number;
  horasTrabalhadas: number;
  valorHorasExtras: number;
  auxilioAlimentacao: number;
  auxilioTransporte: number;
  valorTotal: number;
  statusPagamento: 'PREVISTO' | 'AUTORIZADO_RH' | 'ENVIADO_TESOURARIA' | 'PAGO_PIX';
  chavePixDestino?: string;
  pagoEm?: string;
}

export class RHService {
  private static nsrCounter = 1000;
  private static registrosPonto = new Map<string, RegistroPontoRecord>();
  private static uuidIndex = new Set<string>();
  private static ajustesPonto = new Map<string, any>();
  private static geofences = new Map<string, Geofence>();
  private static colaboradores = new Map<string, ColaboradorDTO>();
  private static custosEvento = new Map<string, CustoMaoDeObraEventoRecord>();
  private static auditLogs: any[] = [];

  static {
    // Inicialização de Geofences Oficiais Curitiba
    this.cadastrarGeofence({
      id: 'geo-sede-disk',
      nome: 'Sede DiskIngressos Curitiba',
      tipo: 'SEDE',
      latitude: -25.4284,
      longitude: -49.2733,
      raioMetros: 150,
      endereco: 'Rua Visconde de Nácar, 1505 - Centro',
      cidade: 'Curitiba',
      uf: 'PR',
      ativo: true
    });

    this.cadastrarGeofence({
      id: 'geo-arena-baixada',
      nome: 'Arena da Baixada (Ligga Arena)',
      tipo: 'ARENA_EVENTO',
      latitude: -25.4484,
      longitude: -49.2770,
      raioMetros: 350,
      endereco: 'Rua Buenos Aires, 1260 - Água Verde',
      cidade: 'Curitiba',
      uf: 'PR',
      ativo: true,
      eventoId: 'evt-xyz-1' // Show Nacional de Rock Curitiba
    });

    this.cadastrarGeofence({
      id: 'geo-pedreira-paulo-leminski',
      nome: 'Pedreira Paulo Leminski',
      tipo: 'ARENA_EVENTO',
      latitude: -25.3855,
      longitude: -49.2789,
      raioMetros: 400,
      endereco: 'Rua João Gava, 970 - Abranches',
      cidade: 'Curitiba',
      uf: 'PR',
      ativo: true
    });

    this.cadastrarGeofence({
      id: 'geo-teatro-positivo',
      nome: 'Teatro Positivo Grande Auditório',
      tipo: 'ARENA_EVENTO',
      latitude: -25.4503,
      longitude: -49.3601,
      raioMetros: 250,
      endereco: 'Rua Prof. Pedro Viriato Parigot de Souza, 5300',
      cidade: 'Curitiba',
      uf: 'PR',
      ativo: true
    });

    // Colaboradores iniciais para testes e operação
    this.cadastrarColaborador({
      id: 'colab-001',
      matricula: 'DISK-00101',
      nome: 'Carlos Eduardo Mendes',
      cpf: '234.567.890-12',
      email: 'carlos.mendes@diskingressos.com.br',
      telefone: '(41) 98822-1144',
      cargo: 'Coordenador de Bilheteria de Campo',
      departamento: 'Operações e Eventos',
      tipoContrato: 'CLT',
      status: 'ATIVO',
      salario: 4500.00,
      chavePix: '23456789012',
      tipoChavePix: 'CPF',
      banco: '033 - Santander',
      agencia: '3210',
      conta: '98765-4',
      geofencePadraoId: 'geo-sede-disk'
    });

    this.cadastrarColaborador({
      id: 'colab-002',
      matricula: 'DISK-00205',
      nome: 'Camila Fernandes Silveira',
      cpf: '456.789.012-34',
      email: 'camila.silveira@diskingressos.com.br',
      telefone: '(41) 99755-4433',
      cargo: 'Supervisora de Atendimento e Acesso',
      departamento: 'Operações e Eventos',
      tipoContrato: 'CLT',
      status: 'ATIVO',
      salario: 3800.00,
      chavePix: 'camila.silveira@diskingressos.com.br',
      tipoChavePix: 'EMAIL',
      banco: '260 - Nu Pagamentos',
      agencia: '0001',
      conta: '1234567-8',
      geofencePadraoId: 'geo-sede-disk'
    });

    this.cadastrarColaborador({
      id: 'colab-003',
      matricula: 'DISK-00388',
      nome: 'Lucas Gabriel Pinheiro',
      cpf: '678.901.234-56',
      email: 'lucas.freelance@gmail.com',
      telefone: '(41) 99111-2233',
      cargo: 'Operador de Bilheteria / Caixa Freelancer',
      departamento: 'Equipe de Campo Eventos',
      tipoContrato: 'FREELANCER_EVENTO',
      status: 'ATIVO',
      salario: 0.00,
      valorDiariaEvento: 180.00,
      chavePix: '67890123456',
      tipoChavePix: 'CPF',
      banco: '341 - Itaú Unibanco',
      agencia: '0412',
      conta: '55441-2',
      geofencePadraoId: 'geo-arena-baixada'
    });
  }

  /**
   * Cálculo geodésico de distância usando a fórmula de Haversine.
   * Retorna a distância exata em metros entre duas coordenadas geográficas.
   */
  public static calcularDistanciaHaversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Raio da Terra em metros
    const dLat = this.degToRad(lat2 - lat1);
    const dLon = this.degToRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degToRad(lat1)) *
      Math.cos(this.degToRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100; // precisão de 2 casas decimais
  }

  private static degToRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Valida se a coordenada informada está dentro do raio permitido de uma geofence.
   */
  public static validarGeofence(
    lat: number,
    lon: number,
    geofenceId: string
  ): { dentro: boolean; distanciaMetros: number; geofence: Geofence } {
    const geo = this.geofences.get(geofenceId);
    if (!geo) {
      throw new Error(`Cerca virtual (geofence) não encontrada: ${geofenceId}`);
    }

    const distancia = this.calcularDistanciaHaversine(lat, lon, geo.latitude, geo.longitude);
    const dentro = distancia <= geo.raioMetros;
    return { dentro, distanciaMetros: distancia, geofence: geo };
  }

  /**
   * Gera o hash SHA-256 e o comprovante digital conforme a Portaria 671 MTE.
   */
  public static gerarHashIntegridade(
    nsr: number,
    colaboradorId: string,
    dataHoraMarcacao: string,
    tipo: string,
    lat?: number,
    lon?: number
  ): { hash: string; comprovante: string } {
    const raw = `${nsr}|${colaboradorId}|${dataHoraMarcacao}|${tipo}|${lat ?? '0'}|${lon ?? '0'}|DISK_RH_SALT_SECURE_2026`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const comprovante = `MTE671-${String(nsr).padStart(9, '0')}-${hash.substring(0, 8).toUpperCase()}`;
    return { hash, comprovante };
  }

  /**
   * Registro oficial de ponto (Portaria 671 MTE).
   * Coleta geolocalização estritamente no momento do registro.
   */
  public static registrarPonto(input: RegistroPontoInput): RegistroPontoRecord {
    // 1. Idempotência por UUID do dispositivo (caso retransmitido pelo app móvel)
    if (input.uuidDispositivo && this.uuidIndex.has(input.uuidDispositivo)) {
      const existente = Array.from(this.registrosPonto.values()).find(
        r => r.uuidDispositivo === input.uuidDispositivo
      );
      if (existente) return existente;
    }

    const colaborador = this.colaboradores.get(input.colaboradorId);
    if (!colaborador) {
      throw new Error(`Colaborador não cadastrado: ${input.colaboradorId}`);
    }

    // 2. Validação de Geofence
    let dentroGeofence = true;
    let distanciaGeofence: number | undefined = undefined;
    let geoAlvoId = input.geofenceId || colaborador.geofencePadraoId;

    if (input.latitude !== undefined && input.longitude !== undefined && geoAlvoId) {
      const geo = this.geofences.get(geoAlvoId);
      if (geo) {
        distanciaGeofence = this.calcularDistanciaHaversine(
          input.latitude,
          input.longitude,
          geo.latitude,
          geo.longitude
        );
        dentroGeofence = distanciaGeofence <= geo.raioMetros;
      }
    }

    // 3. Sequencial NSR Atômico (Portaria 671)
    const nsr = ++this.nsrCounter;

    // 4. Assinatura e Hash Criptográfico
    const { hash, comprovante } = this.gerarHashIntegridade(
      nsr,
      input.colaboradorId,
      input.dataHoraMarcacao,
      input.tipo,
      input.latitude,
      input.longitude
    );

    const record: RegistroPontoRecord = {
      id: `ponto-${nsr}`,
      nsr,
      colaboradorId: input.colaboradorId,
      tipo: input.tipo,
      dataHoraMarcacao: input.dataHoraMarcacao,
      dataHoraServidor: new Date().toISOString(),
      latitude: input.latitude,
      longitude: input.longitude,
      precisaoMetros: input.precisaoMetros,
      geofenceId: geoAlvoId,
      dentroGeofence,
      distanciaGeofence,
      modoCaptura: input.modoCaptura || 'APP_ONLINE',
      hashIntegridade: hash,
      comprovanteNsr: comprovante,
      ipOrigem: input.ipOrigem || '127.0.0.1',
      dispositivoInfo: input.dispositivoInfo || 'Disk Ponto Android APK',
      uuidDispositivo: input.uuidDispositivo,
      sincronizado: true,
      sincronizadoEm: new Date().toISOString()
    };

    this.registrosPonto.set(record.id, record);
    if (input.uuidDispositivo) {
      this.uuidIndex.add(input.uuidDispositivo);
    }

    this.registrarAuditLog({
      colaboradorAfetadoId: colaborador.id,
      acao: 'REGISTRO_PONTO',
      entidade: 'RegistroPonto',
      detalhes: `Ponto registrado tipo ${record.tipo}, NSR ${record.nsr}, Geofence: ${dentroGeofence ? 'DENTRO' : 'FORA'} (${distanciaGeofence || 0}m)`
    });

    return record;
  }

  /**
   * Sincronização em lote de pontos coletados offline no APK Android.
   * Garante idempotência absoluta e preservação do timestamp do hardware.
   */
  public static sincronizarPontosOffline(pontos: RegistroPontoInput[]): {
    processados: number;
    duplicadosIgnorados: number;
    registros: RegistroPontoRecord[];
  } {
    let processados = 0;
    let duplicadosIgnorados = 0;
    const registros: RegistroPontoRecord[] = [];

    // Ordena cronologicamente antes de processar
    const ordenados = [...pontos].sort((a, b) => 
      new Date(a.dataHoraMarcacao).getTime() - new Date(b.dataHoraMarcacao).getTime()
    );

    for (const ponto of ordenados) {
      if (ponto.uuidDispositivo && this.uuidIndex.has(ponto.uuidDispositivo)) {
        duplicadosIgnorados++;
        continue;
      }

      const rec = this.registrarPonto({
        ...ponto,
        modoCaptura: 'APP_OFFLINE_SYNC'
      });
      registros.push(rec);
      processados++;
    }

    return { processados, duplicadosIgnorados, registros };
  }

  /**
   * Espelho de ponto completo por colaborador e mês.
   * Calcula horas trabalhadas, horas extras e intervalos.
   */
  public static obterEspelhoPonto(colaboradorId: string, mesAno?: string) {
    const colaborador = this.colaboradores.get(colaboradorId);
    if (!colaborador) throw new Error(`Colaborador não encontrado: ${colaboradorId}`);

    const pontos = Array.from(this.registrosPonto.values())
      .filter(r => r.colaboradorId === colaboradorId)
      .sort((a, b) => new Date(a.dataHoraMarcacao).getTime() - new Date(b.dataHoraMarcacao).getTime());

    // Agrupamento por dia (YYYY-MM-DD)
    const porDia: Record<string, RegistroPontoRecord[]> = {};
    for (const p of pontos) {
      const dia = p.dataHoraMarcacao.substring(0, 10);
      if (mesAno && !dia.startsWith(mesAno)) continue;
      if (!porDia[dia]) porDia[dia] = [];
      porDia[dia].push(p);
    }

    const dias = Object.keys(porDia).map(dia => {
      const batidas = porDia[dia];
      const entrada = batidas.find(b => b.tipo === 'ENTRADA');
      const intervaloInicio = batidas.find(b => b.tipo === 'INTERVALO_INICIO');
      const intervaloFim = batidas.find(b => b.tipo === 'INTERVALO_FIM');
      const saida = batidas.find(b => b.tipo === 'SAIDA');

      let minutosTrabalhados = 0;
      if (entrada && saida) {
        const total = (new Date(saida.dataHoraMarcacao).getTime() - new Date(entrada.dataHoraMarcacao).getTime()) / 60000;
        let intervalo = 60; // 1h padrão
        if (intervaloInicio && intervaloFim) {
          intervalo = (new Date(intervaloFim.dataHoraMarcacao).getTime() - new Date(intervaloInicio.dataHoraMarcacao).getTime()) / 60000;
        }
        minutosTrabalhados = Math.max(0, Math.round(total - intervalo));
      }

      const horasNormais = Math.min(minutosTrabalhados, 8 * 60) / 60;
      const horasExtras = Math.max(0, minutosTrabalhados - 8 * 60) / 60;

      return {
        dia,
        batidas,
        entrada: entrada?.dataHoraMarcacao,
        intervaloInicio: intervaloInicio?.dataHoraMarcacao,
        intervaloFim: intervaloFim?.dataHoraMarcacao,
        saida: saida?.dataHoraMarcacao,
        minutosTrabalhados,
        horasNormais: Number(horasNormais.toFixed(2)),
        horasExtras: Number(horasExtras.toFixed(2))
      };
    });

    const totalHorasNormais = dias.reduce((acc, d) => acc + d.horasNormais, 0);
    const totalHorasExtras = dias.reduce((acc, d) => acc + d.horasExtras, 0);

    return {
      colaborador,
      mesAno: mesAno || new Date().toISOString().substring(0, 7),
      totalDias: dias.length,
      totalHorasNormais: Number(totalHorasNormais.toFixed(2)),
      totalHorasExtras: Number(totalHorasExtras.toFixed(2)),
      espelho: dias
    };
  }

  /**
   * Submissão de Ajuste de Ponto pelo Colaborador.
   */
  public static solicitarAjustePonto(input: SolicitacaoAjusteInput): any {
    if (!input.justificativa || input.justificativa.length < 5) {
      throw new Error('Justificativa é obrigatória (mínimo 5 caracteres).');
    }

    const ajuste = {
      id: `ajuste-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...input,
      status: 'PENDENTE',
      criadoEm: new Date().toISOString()
    };

    this.ajustesPonto.set(ajuste.id, ajuste);
    return ajuste;
  }

  /**
   * Aprovação de Ajuste de Ponto pelo Gestor/RH (Segregação de Funções).
   */
  public static aprovarAjustePonto(
    ajusteId: string,
    aprovador: { id: string; perfil: string },
    parecer: string
  ): any {
    if (aprovador.perfil !== 'ADMINISTRADOR' && aprovador.perfil !== 'FINANCEIRO') {
      throw new Error('Apenas Gestores de RH/Admin podem aprovar ajustes de ponto.');
    }

    const ajuste = this.ajustesPonto.get(ajusteId);
    if (!ajuste) throw new Error(`Ajuste não encontrado: ${ajusteId}`);
    if (ajuste.status !== 'PENDENTE') throw new Error(`Ajuste já processado (${ajuste.status}).`);

    ajuste.status = 'APROVADO';
    ajuste.analisadoPorId = aprovador.id;
    ajuste.analisadoEm = new Date().toISOString();
    ajuste.parecerRH = parecer;

    // Gera o ponto retroativo regularizado
    const dataHoraIso = `${ajuste.dataPonto}T${ajuste.horarioCorreto}:00.000Z`;
    this.registrarPonto({
      colaboradorId: ajuste.colaboradorId,
      tipo: ajuste.tipoAjuste,
      dataHoraMarcacao: dataHoraIso,
      modoCaptura: 'WEB_ADMIN',
      dispositivoInfo: `Ajuste Administrativo RH Aprovado por ${aprovador.id}`
    });

    return ajuste;
  }

  /**
   * Gestão de Mão de Obra e Custos por Evento (Alimentando DRE e Tesouraria PIX).
   */
  public static alocarEquipeEvento(
    eventoId: string,
    colaboradorId: string,
    cargoFuncao: string,
    tipoContratacao: 'CLT' | 'PJ' | 'FREELANCER_EVENTO',
    valorDiaria: number,
    auxAlimentacao: number = 40.0,
    auxTransporte: number = 30.0
  ): CustoMaoDeObraEventoRecord {
    const colaborador = this.colaboradores.get(colaboradorId);
    if (!colaborador) throw new Error(`Colaborador não encontrado: ${colaboradorId}`);

    const id = `custo-mo-${eventoId}-${colaboradorId}`;
    const valorTotal = valorDiaria + auxAlimentacao + auxTransporte;

    const record: CustoMaoDeObraEventoRecord = {
      id,
      eventoId,
      colaboradorId,
      colaboradorNome: colaborador.nome,
      cargoFuncao,
      tipoContratacao,
      valorDiaria,
      horasTrabalhadas: 8.0,
      valorHorasExtras: 0.0,
      auxilioAlimentacao: auxAlimentacao,
      auxilioTransporte: auxTransporte,
      valorTotal,
      statusPagamento: 'PREVISTO',
      chavePixDestino: colaborador.chavePix
    };

    this.custosEvento.set(id, record);
    return record;
  }

  /**
   * Consolidação de Custos de Pessoal do Evento para DRE e Fila de Pagamento PIX.
   */
  public static consolidarCustosMaoDeObraEvento(eventoId: string) {
    const itens = Array.from(this.custosEvento.values()).filter(c => c.eventoId === eventoId);

    const totalDiarias = itens.reduce((acc, i) => acc + i.valorDiaria, 0);
    const totalHorasExtras = itens.reduce((acc, i) => acc + i.valorHorasExtras, 0);
    const totalAlimentacao = itens.reduce((acc, i) => acc + i.auxilioAlimentacao, 0);
    const totalTransporte = itens.reduce((acc, i) => acc + i.auxilioTransporte, 0);
    const totalGeral = itens.reduce((acc, i) => acc + i.valorTotal, 0);

    return {
      eventoId,
      headcountAlocado: itens.length,
      totalDiarias,
      totalHorasExtras,
      totalAlimentacao,
      totalTransporte,
      totalGeralPessoal: totalGeral,
      equipe: itens
    };
  }

  /**
   * Envio de pagamentos de diárias de freelancers e equipe de evento para Tesouraria (PIX).
   */
  public static enviarPagamentosEquipeParaTesouraria(
    eventoId: string,
    autorizador: { id: string; perfil: string }
  ) {
    if (autorizador.perfil !== 'ADMINISTRADOR' && autorizador.perfil !== 'FINANCEIRO') {
      throw new Error('Somente Administrador ou Financeiro pode enviar pagamentos para a Tesouraria.');
    }

    const itens = Array.from(this.custosEvento.values()).filter(
      c => c.eventoId === eventoId && c.statusPagamento === 'PREVISTO'
    );

    if (itens.length === 0) {
      throw new Error('Não há pagamentos pendentes de aprovação para este evento.');
    }

    const loteId = `LOTE-PIX-RH-${Date.now()}`;
    for (const item of itens) {
      item.statusPagamento = 'ENVIADO_TESOURARIA';
    }

    this.registrarAuditLog({
      usuarioId: autorizador.id,
      acao: 'PAGAMENTO_EQUIPE_ENVIADO_TESOURARIA',
      entidade: 'CustoMaoDeObraEvento',
      detalhes: `Lote ${loteId}: ${itens.length} colaboradores enviados para pagamento PIX. Total: R$ ${itens.reduce((acc, i) => acc + i.valorTotal, 0).toFixed(2)}`
    });

    return {
      loteId,
      totalColaboradores: itens.length,
      valorTotalLote: itens.reduce((acc, i) => acc + i.valorTotal, 0),
      status: 'ENVIADO_TESOURARIA'
    };
  }

  // Métodos auxiliares de cadastro
  public static cadastrarGeofence(geo: Geofence): Geofence {
    this.geofences.set(geo.id, geo);
    return geo;
  }

  public static listarGeofences(): Geofence[] {
    return Array.from(this.geofences.values());
  }

  public static cadastrarColaborador(colab: ColaboradorDTO): ColaboradorDTO {
    this.colaboradores.set(colab.id, colab);
    return colab;
  }

  public static listarColaboradores(): ColaboradorDTO[] {
    return Array.from(this.colaboradores.values());
  }

  public static obterColaborador(id: string): ColaboradorDTO | undefined {
    return this.colaboradores.get(id);
  }

  public static listarRegistrosPonto(): RegistroPontoRecord[] {
    return Array.from(this.registrosPonto.values());
  }

  public static registrarAuditLog(log: any) {
    this.auditLogs.push({
      id: `audit-rh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      criadoEm: new Date().toISOString(),
      ...log
    });
  }

  public static listarAuditLogs() {
    return [...this.auditLogs];
  }
}
