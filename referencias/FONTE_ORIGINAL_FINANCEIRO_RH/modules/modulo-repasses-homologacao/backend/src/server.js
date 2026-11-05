import express from 'express';
import cors from 'cors';
import { calcularElegibilidade } from './domain/elegibilidade.js';

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================================
// BASE DE DADOS EM MEMÓRIA PARA HOMOLOGAÇÃO
// ============================================================================

let politica = {
  percentualMinimoVendas: 50,
  percentualLiberacao: 20,
  exigirAprovacao: true,
  permitirExcecao: true,
  exigirAssinaturaDupla: true,
  exigirSegregacaoFuncoes: true,
  atualizadoEm: new Date().toISOString(),
  atualizadoPor: 'Diretoria Financeira Disk'
};

const criarEventosIniciais = () => [
  {
    id: 'EVT-001',
    nome: 'Festival de Homologação 2026',
    produtorId: 'PROD-001',
    produtorNome: 'Produtora Alpha Brasil',
    metaVendas: 1000000,
    vendasRealizadas: 520000,
    repassesRealizados: 40000,
    valoresBloqueados: 10000,
    saldoDisponivelTotal: 470000
  },
  {
    id: 'EVT-002',
    nome: 'Show de Outono Curitiba',
    produtorId: 'PROD-001',
    produtorNome: 'Produtora Alpha Brasil',
    metaVendas: 800000,
    vendasRealizadas: 240000,
    repassesRealizados: 0,
    valoresBloqueados: 0,
    saldoDisponivelTotal: 240000
  },
  {
    id: 'EVT-003',
    nome: 'Arena Eletrônica Fest',
    produtorId: 'PROD-002',
    produtorNome: 'Beta Entretenimento',
    metaVendas: 2000000,
    vendasRealizadas: 1500000,
    repassesRealizados: 200000,
    valoresBloqueados: 50000,
    saldoDisponivelTotal: 1250000
  }
];

let eventos = criarEventosIniciais();
let solicitacoes = [];
let autorizacoes = [
  {
    id: 'AUT-2026-00088',
    protocolo: 'AUT-2026-00088',
    eventoId: 'EVT-002',
    eventoNome: 'Show de Outono Curitiba',
    valor: 35000,
    motivo: 'Adiantamento contratual pré-produção de palco autorizado por diretoria',
    autorizadoPor: 'Karine (Adm do Financeiro)',
    status: 'ATIVA',
    consumida: false,
    payoutId: null,
    criadoEm: '2026-09-30T10:00:00.000Z'
  }
];

let auditoria = [
  {
    id: 'AUD-001',
    timestamp: new Date().toISOString(),
    usuario: 'Sistema',
    acao: 'INICIALIZACAO_SISTEMA',
    detalhes: 'Módulo de Repasses Homologação V0.2 inicializado com sucesso.'
  },
  {
    id: 'AUD-002',
    timestamp: '2026-09-30T10:00:00.000Z',
    usuario: 'Karine (Adm do Financeiro)',
    acao: 'AUTORIZACAO_EXCEPCIONAL_CRIADA',
    detalhes: 'Protocolo AUT-2026-00088 criado para Show de Outono Curitiba no valor de R$ 35.000,00.'
  }
];

function registrarAuditoria(usuario, acao, detalhes, dadosAdicionais = {}) {
  const log = {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    usuario,
    acao,
    detalhes,
    ...dadosAdicionais
  };
  auditoria.unshift(log);
  return log;
}

// ============================================================================
// ROTAS DE POLÍTICA
// ============================================================================

app.get('/api/repasses/politica', (req, res) => {
  res.json(politica);
});

app.put('/api/repasses/politica', (req, res) => {
  const { percentualMinimoVendas, percentualLiberacao, exigirAprovacao, permitirExcecao, exigirAssinaturaDupla, exigirSegregacaoFuncoes, usuario } = req.body;

  if (percentualMinimoVendas !== undefined && (percentualMinimoVendas < 0 || percentualMinimoVendas > 100)) {
    return res.status(400).json({ erro: 'Percentual mínimo de vendas deve estar entre 0 e 100.' });
  }
  if (percentualLiberacao !== undefined && (percentualLiberacao < 0 || percentualLiberacao > 100)) {
    return res.status(400).json({ erro: 'Percentual de liberação deve estar entre 0 e 100.' });
  }

  politica = {
    ...politica,
    ...(percentualMinimoVendas !== undefined ? { percentualMinimoVendas: Number(percentualMinimoVendas) } : {}),
    ...(percentualLiberacao !== undefined ? { percentualLiberacao: Number(percentualLiberacao) } : {}),
    ...(exigirAprovacao !== undefined ? { exigirAprovacao: Boolean(exigirAprovacao) } : {}),
    ...(permitirExcecao !== undefined ? { permitirExcecao: Boolean(permitirExcecao) } : {}),
    ...(exigirAssinaturaDupla !== undefined ? { exigirAssinaturaDupla: Boolean(exigirAssinaturaDupla) } : {}),
    ...(exigirSegregacaoFuncoes !== undefined ? { exigirSegregacaoFuncoes: Boolean(exigirSegregacaoFuncoes) } : {}),
    atualizadoEm: new Date().toISOString(),
    atualizadoPor: usuario || 'Financeiro Disk'
  };

  registrarAuditoria(
    usuario || 'Financeiro Disk',
    'POLITICA_ATUALIZADA',
    `Política de repasse atualizada: Mínimo vendas = ${politica.percentualMinimoVendas}%, Liberação = ${politica.percentualLiberacao}%.`
  );

  res.json(politica);
});

// ============================================================================
// ROTAS DE ELEGIBILIDADE E EVENTOS
// ============================================================================

app.get('/api/repasses/eventos', (req, res) => {
  const lista = eventos.map(ev => {
    const autorizacaoAtiva = autorizacoes.find(a => a.eventoId === ev.id && a.status === 'ATIVA' && !a.consumida);
    const elig = calcularElegibilidade({
      metaVendas: ev.metaVendas,
      vendasRealizadas: ev.vendasRealizadas,
      repassesRealizados: ev.repassesRealizados,
      valoresBloqueados: ev.valoresBloqueados,
      politica,
      autorizacaoExcepcional: autorizacaoAtiva
    });
    return { ...ev, elegibilidade: elig };
  });
  res.json(lista);
});

app.get('/api/repasses/elegibilidade/:eventoId', (req, res) => {
  const ev = eventos.find(e => e.id === req.params.eventoId);
  if (!ev) {
    return res.status(404).json({ erro: 'Evento não encontrado.' });
  }

  const autorizacaoAtiva = autorizacoes.find(a => a.eventoId === ev.id && a.status === 'ATIVA' && !a.consumida);
  const elig = calcularElegibilidade({
    metaVendas: ev.metaVendas,
    vendasRealizadas: ev.vendasRealizadas,
    repassesRealizados: ev.repassesRealizados,
    valoresBloqueados: ev.valoresBloqueados,
    politica,
    autorizacaoExcepcional: autorizacaoAtiva
  });

  res.json({
    evento: ev,
    elegibilidade: elig,
    politica
  });
});

// ============================================================================
// ROTAS DE AUTORIZAÇÃO EXCEPCIONAL (A TRAVA HUMANA)
// ============================================================================

app.get('/api/repasses/autorizacoes', (req, res) => {
  res.json(autorizacoes);
});

app.post('/api/repasses/autorizacoes', (req, res) => {
  const { eventoId, valor, motivo, autorizador } = req.body;

  const ev = eventos.find(e => e.id === eventoId);
  if (!ev) {
    return res.status(404).json({ erro: 'Evento informado não existe.' });
  }

  const numericValor = Number(valor);
  if (!numericValor || numericValor <= 0) {
    return res.status(400).json({ erro: 'Valor da autorização excepcional deve ser maior que zero.' });
  }

  if (numericValor > ev.saldoDisponivelTotal) {
    return res.status(400).json({
      erro: `Valor da autorização (R$ ${numericValor.toFixed(2)}) excede o saldo financeiro total do evento (R$ ${ev.saldoDisponivelTotal.toFixed(2)}).`
    });
  }

  if (!motivo || motivo.trim().length < 5) {
    return res.status(400).json({ erro: 'Justificativa formal obrigatória com no mínimo 5 caracteres para auditoria.' });
  }

  const novoId = `AUT-${Date.now()}`;
  const protocolo = `AUT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  const auth = {
    id: novoId,
    protocolo,
    eventoId: ev.id,
    eventoNome: ev.nome,
    valor: numericValor,
    motivo: motivo.trim(),
    autorizadoPor: autorizador || 'Mesa Financeiro Disk',
    status: 'ATIVA',
    consumida: false,
    payoutId: null,
    criadoEm: new Date().toISOString()
  };

  autorizacoes.unshift(auth);

  registrarAuditoria(
    auth.autorizadoPor,
    'AUTORIZACAO_EXCEPCIONAL_CRIADA',
    `Autorização excepcional ${protocolo} emitida para ${ev.nome}: R$ ${numericValor.toFixed(2)}. Justificativa: ${motivo.trim()}`
  );

  res.status(201).json(auth);
});

app.post('/api/repasses/autorizacoes/:id/cancelar', (req, res) => {
  const auth = autorizacoes.find(a => a.id === req.params.id);
  if (!auth) {
    return res.status(404).json({ erro: 'Autorização não encontrada.' });
  }

  if (auth.status !== 'ATIVA' || auth.consumida) {
    return res.status(422).json({ erro: 'Apenas autorizações ativas e não consumidas podem ser canceladas.' });
  }

  auth.status = 'CANCELADA';
  auth.canceladoEm = new Date().toISOString();
  auth.canceladoPor = req.body.usuario || 'Financeiro Disk';

  registrarAuditoria(
    auth.canceladoPor,
    'AUTORIZACAO_EXCEPCIONAL_CANCELADA',
    `Autorização ${auth.protocolo} para ${auth.eventoNome} cancelada.`
  );

  res.json(auth);
});

// ============================================================================
// ROTAS DE SOLICITAÇÕES DE REPASSE (ESTEIRA COMPLETA)
// ============================================================================

app.get('/api/repasses/solicitacoes', (req, res) => {
  res.json(solicitacoes);
});

app.get('/api/repasses/solicitacoes/:id', (req, res) => {
  const s = solicitacoes.find(item => item.id === req.params.id || item.protocolo === req.params.id);
  if (!s) return res.status(404).json({ erro: 'Solicitação não encontrada.' });
  res.json(s);
});

app.post('/api/repasses/solicitacoes', (req, res) => {
  const { eventoId, valor, solicitante, banco, conta, chavePix } = req.body;

  const ev = eventos.find(e => e.id === eventoId);
  if (!ev) {
    return res.status(404).json({ erro: 'Evento não encontrado.' });
  }

  const autorizacaoAtiva = autorizacoes.find(a => a.eventoId === ev.id && a.status === 'ATIVA' && !a.consumida);
  const elig = calcularElegibilidade({
    metaVendas: ev.metaVendas,
    vendasRealizadas: ev.vendasRealizadas,
    repassesRealizados: ev.repassesRealizados,
    valoresBloqueados: ev.valoresBloqueados,
    politica,
    autorizacaoExcepcional: autorizacaoAtiva
  });

  const numericValor = Number(valor);
  if (!numericValor || numericValor <= 0) {
    return res.status(400).json({ erro: 'Valor solicitado deve ser maior que zero.' });
  }

  if (!elig.regraAtingida && !elig.isExcepcional) {
    return res.status(422).json({
      erro: `Evento ainda não atingiu o percentual mínimo de vendas (${elig.percentualMinimoVendas}%). Faltam R$ ${elig.faltamVendas.toFixed(2)} em vendas para liberar o primeiro repasse.`,
      elegibilidade: elig
    });
  }

  if (numericValor > elig.disponivel) {
    return res.status(422).json({
      erro: `Valor solicitado (R$ ${numericValor.toFixed(2)}) excede o limite disponível para repasse (R$ ${elig.disponivel.toFixed(2)}).`,
      disponivel: elig.disponivel
    });
  }

  const payoutId = `REP-${Date.now()}`;
  const protocolo = `REP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  if (elig.isExcepcional && autorizacaoAtiva) {
    autorizacaoAtiva.consumida = true;
    autorizacaoAtiva.consumidaEm = new Date().toISOString();
    autorizacaoAtiva.payoutId = payoutId;
  }

  const solicitacao = {
    id: payoutId,
    protocolo,
    eventoId: ev.id,
    eventoNome: ev.nome,
    produtorId: ev.produtorId,
    produtorNome: ev.produtorNome,
    valor: numericValor,
    status: 'EM_ANALISE',
    solicitante: solicitante || `${ev.produtorNome} (Produtor)`,
    criadoEm: new Date().toISOString(),
    dadosBancarios: {
      banco: banco || '341 - Banco Itaú S.A.',
      conta: conta || 'Ag: 1822 • CC: 99401-2',
      chavePix: chavePix || 'financeiro@produtor.com.br'
    },
    elegibilidadeSnapshot: elig,
    excecaoUtilizada: elig.isExcepcional ? autorizacaoAtiva : null,
    assinaturas: {
      produtor: {
        assinado: false,
        assinadoPor: null,
        assinadoEm: null,
        ip: null
      },
      disk: {
        assinado: false,
        assinadoPor: null,
        assinadoEm: null,
        ip: null
      }
    },
    aprovacao: {
      aprovado: false,
      aprovadoPor: null,
      aprovadoEm: null,
      motivoReprovacao: null
    },
    liquidacao: {
      liquidado: false,
      liquidadoPor: null,
      liquidadoEm: null,
      comprovante: null,
      metodo: null
    }
  };

  solicitacoes.unshift(solicitacao);

  registrarAuditoria(
    solicitacao.solicitante,
    'SOLICITACAO_REPASSE_CRIADA',
    `Solicitação ${protocolo} no valor de R$ ${numericValor.toFixed(2)} criada para o evento ${ev.nome}.`
  );

  res.status(201).json(solicitacao);
});

// APROVAÇÃO (Financeiro Disk)
app.post('/api/repasses/solicitacoes/:id/aprovar', (req, res) => {
  const s = solicitacoes.find(item => item.id === req.params.id);
  if (!s) return res.status(404).json({ erro: 'Solicitação não encontrada.' });

  if (s.status !== 'EM_ANALISE') {
    return res.status(422).json({ erro: `Solicitação não pode ser aprovada no status atual: ${s.status}.` });
  }

  const aprovador = req.body.aprovador || 'Karine (Adm do Financeiro)';

  // SoD: criador não pode aprovar
  if (politica.exigirSegregacaoFuncoes && s.solicitante && s.solicitante.toLowerCase().includes(aprovador.toLowerCase())) {
    return res.status(403).json({ erro: 'Segregação de Funções: o solicitante não pode aprovar o próprio repasse.' });
  }

  s.status = 'AGUARDANDO_ASSINATURA_PRODUTOR';
  s.aprovacao.aprovado = true;
  s.aprovacao.aprovadoPor = aprovador;
  s.aprovacao.aprovadoEm = new Date().toISOString();

  registrarAuditoria(
    aprovador,
    'SOLICITACAO_APROVADA',
    `Solicitação ${s.protocolo} aprovada pela mesa financeira. Aguardando assinatura do produtor.`
  );

  res.json(s);
});

// REPROVAÇÃO
app.post('/api/repasses/solicitacoes/:id/reprovar', (req, res) => {
  const s = solicitacoes.find(item => item.id === req.params.id);
  if (!s) return res.status(404).json({ erro: 'Solicitação não encontrada.' });

  if (s.status !== 'EM_ANALISE' && s.status !== 'AGUARDANDO_ASSINATURA_PRODUTOR') {
    return res.status(422).json({ erro: `Solicitação não pode ser reprovada no status atual: ${s.status}.` });
  }

  const { motivo, reprovadoPor } = req.body;
  if (!motivo || motivo.trim().length < 5) {
    return res.status(400).json({ erro: 'Motivo da reprovação obrigatório com no mínimo 5 caracteres.' });
  }

  s.status = 'REPROVADO';
  s.aprovacao.aprovado = false;
  s.aprovacao.motivoReprovacao = motivo.trim();
  s.aprovacao.reprovadoPor = reprovadoPor || 'Financeiro Disk';
  s.aprovacao.reprovadoEm = new Date().toISOString();

  // Se tinha exceção vinculada, reativa a autorização
  if (s.excecaoUtilizada) {
    const auth = autorizacoes.find(a => a.id === s.excecaoUtilizada.id);
    if (auth) {
      auth.consumida = false;
      auth.payoutId = null;
    }
  }

  registrarAuditoria(
    s.aprovacao.reprovadoPor,
    'SOLICITACAO_REPROVADA',
    `Solicitação ${s.protocolo} reprovada. Motivo: ${motivo.trim()}`
  );

  res.json(s);
});

// ASSINATURAS DIGITAIS (Ordem estrita: Produtor primeiro, depois Disk)
app.post('/api/repasses/solicitacoes/:id/assinar', (req, res) => {
  const s = solicitacoes.find(item => item.id === req.params.id);
  if (!s) return res.status(404).json({ erro: 'Solicitação não encontrada.' });

  const { papel, assinante, ip } = req.body; // papel: 'produtor' | 'disk'

  if (papel === 'produtor') {
    if (s.status !== 'AGUARDANDO_ASSINATURA_PRODUTOR') {
      return res.status(422).json({ erro: `Solicitação não está no estágio de assinatura do produtor (status: ${s.status}).` });
    }
    s.assinaturas.produtor.assinado = true;
    s.assinaturas.produtor.assinadoPor = assinante || s.produtorNome;
    s.assinaturas.produtor.assinadoEm = new Date().toISOString();
    s.assinaturas.produtor.ip = ip || '177.136.241.10';
    s.status = 'AGUARDANDO_ASSINATURA_DISK';

    registrarAuditoria(
      s.assinaturas.produtor.assinadoPor,
      'ASSINATURA_PRODUTOR_REGISTRADA',
      `Termo de repasse ${s.protocolo} assinado digitalmente pelo Produtor (${s.assinaturas.produtor.assinadoPor}).`
    );

    return res.json(s);
  }

  if (papel === 'disk') {
    // Ordem estrita: Produtor DEVE ter assinado antes da Disk
    if (!s.assinaturas.produtor.assinado) {
      return res.status(422).json({ erro: 'Violação de Governança: a Disk Ingressos não pode assinar antes do Produtor.' });
    }
    if (s.status !== 'AGUARDANDO_ASSINATURA_DISK') {
      return res.status(422).json({ erro: `Solicitação não está no estágio de assinatura Disk (status: ${s.status}).` });
    }

    s.assinaturas.disk.assinado = true;
    s.assinaturas.disk.assinadoPor = assinante || 'Karine (Adm do Financeiro)';
    s.assinaturas.disk.assinadoEm = new Date().toISOString();
    s.assinaturas.disk.ip = ip || '189.40.12.8';
    s.status = 'PRONTO_LIQUIDACAO';

    registrarAuditoria(
      s.assinaturas.disk.assinadoPor,
      'ASSINATURA_DISK_REGISTRADA',
      `Termo de repasse ${s.protocolo} assinado pela Disk Ingressos (${s.assinaturas.disk.assinadoPor}). Operação pronta para liquidação.`
    );

    return res.json(s);
  }

  res.status(400).json({ erro: 'Papel de assinatura inválido. Utilize "produtor" ou "disk".' });
});

// LIQUIDAÇÃO NA TESOURARIA
app.post('/api/repasses/solicitacoes/:id/liquidar', (req, res) => {
  const s = solicitacoes.find(item => item.id === req.params.id);
  if (!s) return res.status(404).json({ erro: 'Solicitação não encontrada.' });

  if (s.status === 'LIQUIDADO') {
    return res.status(422).json({ erro: 'Idempotência: esta solicitação de repasse já se encontra liquidada.' });
  }

  if (s.status !== 'PRONTO_LIQUIDACAO') {
    return res.status(422).json({ erro: `Solicitação não está pronta para liquidação (status: ${s.status}). Ambas as assinaturas são obrigatórias.` });
  }

  const { executor, metodo, bancoOrigem } = req.body;
  const executorNome = executor || 'Tesouraria Disk';

  // SoD: quem aprovou não pode liquidar
  if (politica.exigirSegregacaoFuncoes && s.aprovacao.aprovadoPor && s.aprovacao.aprovadoPor.toLowerCase() === executorNome.toLowerCase()) {
    return res.status(403).json({
      erro: `Violação de Segregação de Funções (SoD): O usuário que aprovou o repasse (${s.aprovacao.aprovadoPor}) não tem permissão para liquidar o pagamento.`
    });
  }

  // Atualiza repasses realizados no evento correspondente
  const ev = eventos.find(e => e.id === s.eventoId);
  if (ev) {
    ev.repassesRealizados += s.valor;
    ev.saldoDisponivelTotal = Math.max(0, ev.saldoDisponivelTotal - s.valor);
  }

  s.status = 'LIQUIDADO';
  s.liquidacao.liquidado = true;
  s.liquidacao.liquidadoPor = executorNome;
  s.liquidacao.liquidadoEm = new Date().toISOString();
  s.liquidacao.comprovante = `COMP-PIX-${Date.now()}`;
  s.liquidacao.metodo = metodo || 'PIX';
  s.liquidacao.bancoOrigem = bancoOrigem || '033 - Banco Santander (Brasil) S.A.';

  registrarAuditoria(
    executorNome,
    'REPASSE_LIQUIDADO',
    `Repasse ${s.protocolo} no valor de R$ ${s.valor.toFixed(2)} liquidado via ${s.liquidacao.metodo}. Comprovante: ${s.liquidacao.comprovante}.`
  );

  res.json(s);
});

// TRILHA DE AUDITORIA
app.get('/api/repasses/auditoria', (req, res) => {
  res.json(auditoria);
});

// RESET PARA HOMOLOGAÇÃO
app.post('/api/repasses/reset', (req, res) => {
  eventos = criarEventosIniciais();
  solicitacoes = [];
  autorizacoes = [
    {
      id: 'AUT-2026-00088',
      protocolo: 'AUT-2026-00088',
      eventoId: 'EVT-002',
      eventoNome: 'Show de Outono Curitiba',
      valor: 35000,
      motivo: 'Adiantamento contratual pré-produção de palco autorizado por diretoria',
      autorizadoPor: 'Karine (Adm do Financeiro)',
      status: 'ATIVA',
      consumida: false,
      payoutId: null,
      criadoEm: new Date().toISOString()
    }
  ];
  auditoria = [
    {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString(),
      usuario: 'Sistema',
      acao: 'RESET_AMBIENTE',
      detalhes: 'Base de dados resetada para estado padrão de homologação.'
    }
  ];
  res.json({ mensagem: 'Ambiente de homologação resetado com sucesso.' });
});

const PORT = process.env.PORT || 3333;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`API de Repasses Homologação executando em http://localhost:${PORT}`);
  });
}

export { app, calcularElegibilidade };
