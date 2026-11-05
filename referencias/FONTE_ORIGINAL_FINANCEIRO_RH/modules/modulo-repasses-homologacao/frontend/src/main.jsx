import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  WalletCards,
  ShieldCheck,
  Settings2,
  Landmark,
  CheckCircle2,
  LockKeyhole,
  FileSignature,
  Banknote,
  History,
  AlertTriangle,
  Check,
  X,
  PlusCircle,
  FileText
} from 'lucide-react';
import './style.css';

const money = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

function App() {
  const [tab, setTab] = useState('visao');
  const [perfil, setPerfil] = useState('produtor'); // 'produtor' | 'financeiro'

  // Dados em estado local sincronizados
  const [politica, setPolitica] = useState({
    percentualMinimoVendas: 50,
    percentualLiberacao: 20,
    exigirAprovacao: true,
    permitirExcecao: true,
    exigirAssinaturaDupla: true,
    exigirSegregacaoFuncoes: true
  });

  const [eventos, setEventos] = useState([
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
  ]);

  const [eventoId, setEventoId] = useState('EVT-001');

  const [solicitacoes, setSolicitacoes] = useState([
    {
      id: 'REP-2026-001',
      protocolo: 'REP-2026-00089',
      eventoId: 'EVT-001',
      eventoNome: 'Festival de Homologação 2026',
      produtorNome: 'Produtora Alpha Brasil',
      valor: 30000,
      status: 'PRONTO_LIQUIDACAO',
      solicitante: 'João Silva (Produtor)',
      criadoEm: '2026-10-01 10:20',
      dadosBancarios: {
        banco: '341 - Itaú',
        conta: 'Ag: 1822 • CC: 99401-2',
        chavePix: 'financeiro@alpha.com.br'
      },
      assinaturas: {
        produtor: { assinado: true, assinadoPor: 'João Silva (Produtor)', assinadoEm: '01/10 11:00' },
        disk: { assinado: true, assinadoPor: 'Karine (Financeiro Disk)', assinadoEm: '01/10 11:30' }
      },
      aprovacao: { aprovado: true, aprovadoPor: 'Karine (Adm do Financeiro)', aprovadoEm: '01/10 10:45' },
      liquidacao: { liquidado: false }
    }
  ]);

  const [autorizacoes, setAutorizacoes] = useState([
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
      criadoEm: '30/09/2026 10:00'
    }
  ]);

  const [auditoria, setAuditoria] = useState([
    {
      id: 'AUD-01',
      timestamp: '01/10/2026 11:30',
      usuario: 'Karine (Adm do Financeiro)',
      acao: 'ASSINATURA_DISK_REGISTRADA',
      detalhes: 'Assinatura digital do termo de repasse REP-2026-00089 concluída.'
    },
    {
      id: 'AUD-02',
      timestamp: '01/10/2026 11:00',
      usuario: 'João Silva (Produtor)',
      acao: 'ASSINATURA_PRODUTOR_REGISTRADA',
      detalhes: 'Assinatura digital do termo de repasse REP-2026-00089 efetuada.'
    },
    {
      id: 'AUD-03',
      timestamp: '30/09/2026 10:00',
      usuario: 'Karine (Adm do Financeiro)',
      acao: 'AUTORIZACAO_EXCEPCIONAL_CRIADA',
      detalhes: 'Protocolo AUT-2026-00088 criado para Show de Outono Curitiba: R$ 35.000,00.'
    }
  ]);

  // Modais
  const [modalRepasseAberto, setModalRepasseAberto] = useState(false);
  const [modalAutorizacaoAberto, setModalAutorizacaoAberto] = useState(false);
  const [valorRepasse, setValorRepasse] = useState('');
  const [valorExcecao, setValorExcecao] = useState('');
  const [motivoExcecao, setMotivoExcecao] = useState('');
  const [eventoExcecao, setEventoExcecao] = useState('EVT-002');
  const [feedback, setFeedback] = useState(null);

  const notify = (msg, tipo = 'info') => {
    setFeedback({ msg, tipo });
    setTimeout(() => setFeedback(null), 4000);
  };

  const eventoAtual = eventos.find(e => e.id === eventoId) || eventos[0];
  const autorizacaoAtiva = autorizacoes.find(a => a.eventoId === eventoAtual.id && a.status === 'ATIVA' && !a.consumida);

  // Cálculo canônico de elegibilidade
  const meta = eventoAtual.metaVendas;
  const vendas = eventoAtual.vendasRealizadas;
  const repasses = eventoAtual.repassesRealizados;
  const bloqueios = eventoAtual.valoresBloqueados;

  const progresso = meta > 0 ? (vendas / meta) * 100 : 0;
  const regraAtingida = progresso >= politica.percentualMinimoVendas;
  const faltamVendas = regraAtingida ? 0 : Math.max(0, (meta * (politica.percentualMinimoVendas / 100)) - vendas);
  const limiteBruto = regraAtingida ? vendas * (politica.percentualLiberacao / 100) : 0;
  const disponivelPadrao = Math.max(0, limiteBruto - repasses - bloqueios);

  const isExcepcional = Boolean(autorizacaoAtiva);
  const disponivelFinal = isExcepcional
    ? Math.max(0, autorizacaoAtiva.valor - repasses - bloqueios)
    : disponivelPadrao;

  // Handlers
  const handleSolicitarRepasse = () => {
    const val = parseFloat(valorRepasse);
    if (!val || val <= 0) {
      notify('Informe um valor válido maior que zero.', 'error');
      return;
    }
    if (!regraAtingida && !isExcepcional) {
      notify(`Repasse bloqueado. O evento não atingiu os ${politica.percentualMinimoVendas}% de vendas.`, 'error');
      return;
    }
    if (val > disponivelFinal) {
      notify(`Valor excede o limite disponível para repasse (${money(disponivelFinal)}).`, 'error');
      return;
    }

    const novoId = `REP-${Date.now()}`;
    const protocolo = `REP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    if (isExcepcional && autorizacaoAtiva) {
      autorizacaoAtiva.consumida = true;
      autorizacaoAtiva.payoutId = novoId;
    }

    const novaSolicitacao = {
      id: novoId,
      protocolo,
      eventoId: eventoAtual.id,
      eventoNome: eventoAtual.nome,
      produtorNome: eventoAtual.produtorNome,
      valor: val,
      status: 'EM_ANALISE',
      solicitante: perfil === 'produtor' ? 'João Silva (Produtor)' : 'Karine (Adm do Financeiro)',
      criadoEm: new Date().toLocaleString('pt-BR'),
      dadosBancarios: {
        banco: '341 - Itaú',
        conta: 'Ag: 1822 • CC: 99401-2',
        chavePix: 'financeiro@alpha.com.br'
      },
      assinaturas: {
        produtor: { assinado: false },
        disk: { assinado: false }
      },
      aprovacao: { aprovado: false },
      liquidacao: { liquidado: false }
    };

    setSolicitacoes([novaSolicitacao, ...solicitacoes]);
    setAuditoria([
      {
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        usuario: novaSolicitacao.solicitante,
        acao: 'SOLICITACAO_REPASSE_CRIADA',
        detalhes: `Solicitação ${protocolo} criada para ${eventoAtual.nome}: ${money(val)}.`
      },
      ...auditoria
    ]);

    setModalRepasseAberto(false);
    setValorRepasse('');
    notify(`Solicitação ${protocolo} criada com sucesso e enviada para análise!`, 'success');
  };

  const handleAprovar = (s) => {
    if (perfil !== 'financeiro') {
      notify('Apenas a mesa do Financeiro Disk pode aprovar repasses.', 'error');
      return;
    }
    s.status = 'AGUARDANDO_ASSINATURA_PRODUTOR';
    s.aprovacao = { aprovado: true, aprovadoPor: 'Karine (Adm do Financeiro)', aprovadoEm: new Date().toLocaleString('pt-BR') };

    setSolicitacoes([...solicitacoes]);
    setAuditoria([
      {
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        usuario: 'Karine (Adm do Financeiro)',
        acao: 'SOLICITACAO_APROVADA',
        detalhes: `Solicitação ${s.protocolo} aprovada. Aguardando assinatura do produtor.`
      },
      ...auditoria
    ]);
    notify(`Repasse ${s.protocolo} aprovado com sucesso!`, 'success');
  };

  const handleReprovar = (s) => {
    const motivo = prompt('Informe o motivo formal da reprovação:');
    if (!motivo || motivo.trim().length < 5) {
      notify('É obrigatório fornecer uma justificativa formal com no mínimo 5 caracteres.', 'error');
      return;
    }
    s.status = 'REPROVADO';
    s.aprovacao = { aprovado: false, motivoReprovacao: motivo.trim(), reprovadoPor: 'Karine (Adm Financeiro)' };
    setSolicitacoes([...solicitacoes]);
    notify(`Solicitação ${s.protocolo} reprovada.`, 'warn');
  };

  const handleAssinarProdutor = (s) => {
    s.assinaturas.produtor = {
      assinado: true,
      assinadoPor: 'João Silva (Produtor)',
      assinadoEm: new Date().toLocaleString('pt-BR'),
      ip: '177.136.241.10'
    };
    s.status = 'AGUARDANDO_ASSINATURA_DISK';
    setSolicitacoes([...solicitacoes]);
    setAuditoria([
      {
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        usuario: 'João Silva (Produtor)',
        acao: 'ASSINATURA_PRODUTOR_REGISTRADA',
        detalhes: `Termo de repasse ${s.protocolo} assinado pelo Produtor.`
      },
      ...auditoria
    ]);
    notify(`Assinatura do Produtor registrada em ${s.protocolo}!`, 'success');
  };

  const handleAssinarDisk = (s) => {
    if (!s.assinaturas.produtor.assinado) {
      notify('Trava de Governança: A Disk não pode assinar antes do Produtor.', 'error');
      return;
    }
    s.assinaturas.disk = {
      assinado: true,
      assinadoPor: 'Karine (Financeiro Disk)',
      assinadoEm: new Date().toLocaleString('pt-BR'),
      ip: '189.40.12.8'
    };
    s.status = 'PRONTO_LIQUIDACAO';
    setSolicitacoes([...solicitacoes]);
    setAuditoria([
      {
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        usuario: 'Karine (Financeiro Disk)',
        acao: 'ASSINATURA_DISK_REGISTRADA',
        detalhes: `Termo de repasse ${s.protocolo} assinado pela Disk Ingressos. Pronta p/ liquidação.`
      },
      ...auditoria
    ]);
    notify(`Assinatura Disk registrada! Operação pronta para pagamento.`, 'success');
  };

  const handleLiquidar = (s) => {
    if (s.aprovacao.aprovadoPor === 'Tesoureiro Carlos') {
      notify('Violação de SoD: quem aprovou não pode liquidar.', 'error');
      return;
    }
    const ev = eventos.find(e => e.id === s.eventoId);
    if (ev) {
      ev.repassesRealizados += s.valor;
      ev.saldoDisponivelTotal = Math.max(0, ev.saldoDisponivelTotal - s.valor);
    }
    s.status = 'LIQUIDADO';
    s.liquidacao = {
      liquidado: true,
      liquidadoPor: 'Carlos Mendes (Tesouraria)',
      liquidadoEm: new Date().toLocaleString('pt-BR'),
      comprovante: `COMP-PIX-${Date.now()}`
    };
    setSolicitacoes([...solicitacoes]);
    setEventos([...eventos]);
    setAuditoria([
      {
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        usuario: 'Carlos Mendes (Tesouraria)',
        acao: 'REPASSE_LIQUIDADO',
        detalhes: `Repasse ${s.protocolo} liquidado via PIX no valor de ${money(s.valor)}.`
      },
      ...auditoria
    ]);
    notify(`Repasse ${s.protocolo} liquidado com sucesso na tesouraria!`, 'success');
  };

  const handleCriarAutorizacao = () => {
    const val = parseFloat(valorExcecao);
    if (!val || val <= 0) {
      notify('Informe um valor válido maior que zero.', 'error');
      return;
    }
    if (!motivoExcecao || motivoExcecao.trim().length < 5) {
      notify('A justificativa formal deve conter no mínimo 5 caracteres.', 'error');
      return;
    }
    const ev = eventos.find(e => e.id === eventoExcecao);
    const novoAuth = {
      id: `AUT-${Date.now()}`,
      protocolo: `AUT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      eventoId: ev.id,
      eventoNome: ev.nome,
      valor: val,
      motivo: motivoExcecao.trim(),
      autorizadoPor: 'Karine (Adm do Financeiro)',
      status: 'ATIVA',
      consumida: false,
      criadoEm: new Date().toLocaleString('pt-BR')
    };

    setAutorizacoes([novoAuth, ...autorizacoes]);
    setAuditoria([
      {
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        usuario: 'Karine (Adm do Financeiro)',
        acao: 'AUTORIZACAO_EXCEPCIONAL_CRIADA',
        detalhes: `Autorização ${novoAuth.protocolo} emitida para ${ev.nome}: ${money(val)}. Justificativa: ${novoAuth.motivo}`
      },
      ...auditoria
    ]);

    setModalAutorizacaoAberto(false);
    setValorExcecao('');
    setMotivoExcecao('');
    notify(`Autorização excepcional ${novoAuth.protocolo} emitida com sucesso!`, 'success');
  };

  const handleCancelarAutorizacao = (auth) => {
    auth.status = 'CANCELADA';
    setAutorizacoes([...autorizacoes]);
    setAuditoria([
      {
        id: `AUD-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        usuario: 'Karine (Financeiro Disk)',
        acao: 'AUTORIZACAO_EXCEPCIONAL_CANCELADA',
        detalhes: `Autorização ${auth.protocolo} cancelada pela mesa Disk.`
      },
      ...auditoria
    ]);
    notify(`Autorização ${auth.protocolo} cancelada.`, 'info');
  };

  return (
    <div className="app">
      {feedback && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          background: feedback.tipo === 'error' ? '#ef4444' : (feedback.tipo === 'warn' ? '#f59e0b' : '#10b981'),
          color: 'white',
          padding: '12px 20px',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          zIndex: 9999,
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)'
        }}>
          {feedback.msg}
        </div>
      )}

      {/* Sidebar */}
      <aside>
        <div className="brand">DISK<span>Ingressos</span></div>
        <div className="tag">MÓDULO DE REPASSES V0.2</div>
        <nav>
          <button className={tab === 'visao' ? 'active' : ''} onClick={() => setTab('visao')}>
            <WalletCards /> <span>Visão Geral & Regras</span>
          </button>
          <button className={tab === 'solicitacoes' ? 'active' : ''} onClick={() => setTab('solicitacoes')}>
            <Landmark /> <span>Esteira de Repasses</span>
          </button>
          <button className={tab === 'autorizacoes' ? 'active' : ''} onClick={() => setTab('autorizacoes')}>
            <ShieldCheck /> <span>Autorizações (Exceções)</span>
          </button>
          <button className={tab === 'politica' ? 'active' : ''} onClick={() => setTab('politica')}>
            <Settings2 /> <span>Política de Repasse</span>
          </button>
          <button className={tab === 'auditoria' ? 'active' : ''} onClick={() => setTab('auditoria')}>
            <History /> <span>Trilha de Auditoria</span>
          </button>
        </nav>

        <div className="switch">
          <small>Ambiente de Homologação PDT Novo</small>
          <button onClick={() => setPerfil(perfil === 'produtor' ? 'financeiro' : 'produtor')}>
            {perfil === 'produtor' ? '⇄ Alternar p/ Financeiro Disk' : '⇄ Alternar p/ Produtor'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main>
        <header>
          <div>
            <p>Financeiro › Módulo de Repasses Homologação</p>
            <h1>{perfil === 'produtor' ? 'Meu Portal de Repasses' : 'Mesa de Repasses & Política'}</h1>
          </div>
          <span className="perfil">{perfil === 'produtor' ? '👤 PRODUTOR' : '🛡️ FINANCEIRO DISK'}</span>
        </header>

        {/* Tab 1: Visão Geral */}
        {tab === 'visao' && (
          <>
            <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Evento sob análise:</span>
              <select
                value={eventoId}
                onChange={e => setEventoId(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontWeight: 600 }}
              >
                {eventos.map(e => (
                  <option key={e.id} value={e.id}>{e.nome} ({e.id})</option>
                ))}
              </select>
            </div>

            <section className="hero">
              <div>
                <span>Evento em Homologação</span>
                <h2>{eventoAtual.nome}</h2>
                <p>{eventoAtual.id} · Produtor: {eventoAtual.produtorNome}</p>
              </div>
              <div className={isExcepcional ? 'warn' : (regraAtingida ? 'ok' : 'wait')}>
                {isExcepcional ? <ShieldCheck /> : (regraAtingida ? <CheckCircle2 /> : <LockKeyhole />)}
                {isExcepcional ? 'EXCEÇÃO AUTORIZADA PELA MESA DISK' : (regraAtingida ? 'REPASSE HABILITADO' : 'REPASSE BLOQUEADO')}
              </div>
            </section>

            {/* Decomposição Canônica dos 4 Cards */}
            <section className="cards">
              <article>
                <span>Vendas Realizadas</span>
                <strong>{money(vendas)}</strong>
                <small>{progresso.toFixed(1)}% da meta de {money(meta)}</small>
              </article>
              <article>
                <span>Limite Bruto Liberado</span>
                <strong>{money(limiteBruto)}</strong>
                <small>{politica.percentualLiberacao}% das vendas elegíveis</small>
              </article>
              <article>
                <span>Deduções Acumuladas</span>
                <strong>{money(repasses + bloqueios)}</strong>
                <small>Repasses {money(repasses)} + Bloq {money(bloqueios)}</small>
              </article>
              <article className="primary">
                <span>Disponível p/ Solicitar</span>
                <strong>{money(disponivelFinal)}</strong>
                <small>{isExcepcional ? 'Via Autorização Excepcional' : 'Livre para repasse imediato'}</small>
              </article>
            </section>

            {/* Painel de Elegibilidade */}
            <section className="panel">
              <div className="panelTitle">
                <div>
                  <h3>Motor Canônico de Elegibilidade</h3>
                  <p>Gatilho: atinja no mínimo {politica.percentualMinimoVendas}% da meta para liberar até {politica.percentualLiberacao}% das vendas realizadas.</p>
                </div>
                <b>{progresso.toFixed(1)}%</b>
              </div>

              <div className="progressContainer">
                <div className="progressBar">
                  <div className="progressBarFill" style={{ width: `${Math.min(progresso, 100)}%` }} />
                </div>
                <div className="targetMarker" style={{ left: `${politica.percentualMinimoVendas}%` }}>
                  <span className="targetLabel">Gatilho {politica.percentualMinimoVendas}%</span>
                </div>
              </div>

              {!regraAtingida && !isExcepcional && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: 8, marginTop: 14, color: '#b91c1c', fontSize: 13 }}>
                  <AlertTriangle style={{ width: 16, height: 16, display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                  <strong>Repasse bloqueado pela política de governança:</strong> Faltam <strong>{money(faltamVendas)}</strong> em vendas realizadas para atingir a meta mínima e habilitar o primeiro repasse.
                </div>
              )}

              {isExcepcional && (
                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '12px 16px', borderRadius: 8, marginTop: 14, color: '#5b21b6', fontSize: 13 }}>
                  <ShieldCheck style={{ width: 16, height: 16, display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                  <strong>Autorização Excepcional Ativa ({autorizacaoAtiva.protocolo}):</strong> Liberado repasse de até {money(autorizacaoAtiva.valor)}. Motivo: <em>"{autorizacaoAtiva.motivo}"</em>
                </div>
              )}

              <div className="rules">
                <div>
                  <span>Meta de Vendas</span>
                  <strong>{money(meta)}</strong>
                  <em>Base de homologação</em>
                </div>
                <div>
                  <span>Gatilho Mínimo</span>
                  <strong>{politica.percentualMinimoVendas}%</strong>
                  <em className={regraAtingida ? '' : 'blocked'}>{regraAtingida ? '✓ Atingido' : 'Pendente'}</em>
                </div>
                <div>
                  <span>Percentual Liberado</span>
                  <strong>{politica.percentualLiberacao}%</strong>
                  <em>Sobre as vendas brutas</em>
                </div>
                <div>
                  <span>Status do Repasse</span>
                  <strong>{isExcepcional ? 'Exceção Ativa' : (regraAtingida ? 'Habilitado' : 'Travado')}</strong>
                  <em>{disponivelFinal > 0 ? `${money(disponivelFinal)} livre` : 'Saldo indisponível'}</em>
                </div>
              </div>

              <div style={{ marginTop: 22 }}>
                <button
                  className="cta"
                  disabled={disponivelFinal <= 0}
                  onClick={() => {
                    setValorRepasse(disponivelFinal.toString());
                    setModalRepasseAberto(true);
                  }}
                >
                  <PlusCircle style={{ width: 16, height: 16 }} />
                  Solicitar Repasse de até {money(disponivelFinal)}
                </button>

                {perfil === 'financeiro' && (
                  <button className="outline" style={{ marginLeft: 12 }} onClick={() => setModalAutorizacaoAberto(true)}>
                    <ShieldCheck style={{ width: 16, height: 16 }} />
                    Emitir Autorização Excepcional
                  </button>
                )}
              </div>
            </section>
          </>
        )}

        {/* Tab 2: Esteira de Repasses */}
        {tab === 'solicitacoes' && (
          <section className="panel">
            <div className="panelTitle" style={{ marginBottom: 16 }}>
              <div>
                <h3>Esteira de Repasses (Workflow Completo)</h3>
                <p>Ciclo: Solicitação › Análise Mesa Disk › Assinatura Produtor › Assinatura Disk › Liquidação Tesouraria</p>
              </div>
              <button className="cta" onClick={() => setModalRepasseAberto(true)}>
                + Nova Solicitação
              </button>
            </div>

            <div className="tableContainer">
              <table>
                <thead>
                  <tr>
                    <th>Protocolo</th>
                    <th>Evento / Produtor</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Assinatura Produtor</th>
                    <th>Assinatura Disk</th>
                    <th>Ações Disponíveis</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitacoes.map(s => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.protocolo}</strong>
                        <br />
                        <small style={{ color: '#64748b' }}>{s.criadoEm}</small>
                      </td>
                      <td>
                        <strong>{s.eventoNome}</strong>
                        <br />
                        <small style={{ color: '#64748b' }}>{s.produtorNome}</small>
                      </td>
                      <td><strong>{money(s.valor)}</strong></td>
                      <td>
                        <span className={`badge badge-${s.status.toLowerCase().replace(/_/g, '-')}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        {s.assinaturas.produtor.assinado ? (
                          <span style={{ color: '#059669', fontWeight: 700, fontSize: 11 }}>
                            ✓ {s.assinaturas.produtor.assinadoPor}
                          </span>
                        ) : (
                          <span style={{ color: '#d97706', fontSize: 11 }}>Pendente</span>
                        )}
                      </td>
                      <td>
                        {s.assinaturas.disk.assinado ? (
                          <span style={{ color: '#059669', fontWeight: 700, fontSize: 11 }}>
                            ✓ {s.assinaturas.disk.assinadoPor}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: 11 }}>
                            {s.assinaturas.produtor.assinado ? 'Aguardando' : 'Trava: aguarda Produtor'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {s.status === 'EM_ANALISE' && perfil === 'financeiro' && (
                            <>
                              <button className="successBtn" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => handleAprovar(s)}>
                                Aprovar
                              </button>
                              <button className="danger" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => handleReprovar(s)}>
                                Reprovar
                              </button>
                            </>
                          )}
                          {s.status === 'AGUARDANDO_ASSINATURA_PRODUTOR' && perfil === 'produtor' && (
                            <button className="cta" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => handleAssinarProdutor(s)}>
                              <FileSignature style={{ width: 14, height: 14 }} /> Assinar Produtor
                            </button>
                          )}
                          {s.status === 'AGUARDANDO_ASSINATURA_DISK' && perfil === 'financeiro' && (
                            <button className="cta" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => handleAssinarDisk(s)}>
                              <FileSignature style={{ width: 14, height: 14 }} /> Assinar Disk
                            </button>
                          )}
                          {s.status === 'PRONTO_LIQUIDACAO' && perfil === 'financeiro' && (
                            <button className="successBtn" style={{ padding: '6px 10px', fontSize: 11 }} onClick={() => handleLiquidar(s)}>
                              <Banknote style={{ width: 14, height: 14 }} /> Liquidar PIX
                            </button>
                          )}
                          {s.status === 'LIQUIDADO' && (
                            <span style={{ color: '#059669', fontWeight: 700, fontSize: 11 }}>
                              ✓ Pago via {s.liquidacao.comprovante}
                            </span>
                          )}
                          {s.status === 'REPROVADO' && (
                            <span style={{ color: '#dc2626', fontSize: 11 }}>
                              Reprovado: {s.aprovacao?.motivoReprovacao}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab 3: Autorizações Excepcionais */}
        {tab === 'autorizacoes' && (
          <section className="panel">
            <div className="panelTitle" style={{ marginBottom: 16 }}>
              <div>
                <h3>Autorizações Excepcionais (A Trava Humana)</h3>
                <p>Mesa Financeiro Disk: Liberação de valores fora da regra padrão com justificativa obrigatória e trilha de auditoria.</p>
              </div>
              {perfil === 'financeiro' && (
                <button className="cta" onClick={() => setModalAutorizacaoAberto(true)}>
                  <PlusCircle style={{ width: 16, height: 16 }} /> + Autorizar Repasse Excepcional
                </button>
              )}
            </div>

            <div className="tableContainer">
              <table>
                <thead>
                  <tr>
                    <th>Protocolo</th>
                    <th>Evento</th>
                    <th>Valor Autorizado</th>
                    <th>Justificativa Obrigatória</th>
                    <th>Autorizado Por</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {autorizacoes.map(a => (
                    <tr key={a.id}>
                      <td><strong>{a.protocolo}</strong><br /><small>{a.criadoEm}</small></td>
                      <td><strong>{a.eventoNome}</strong></td>
                      <td><strong style={{ color: '#2563eb' }}>{money(a.valor)}</strong></td>
                      <td><span style={{ fontSize: 12, color: '#334155' }}>{a.motivo}</span></td>
                      <td><span style={{ fontSize: 12, fontWeight: 600 }}>{a.autorizadoPor}</span></td>
                      <td>
                        <span className={`badge badge-${a.status.toLowerCase()}`}>
                          {a.consumida ? 'CONSUMIDA' : a.status}
                        </span>
                      </td>
                      <td>
                        {a.status === 'ATIVA' && !a.consumida && perfil === 'financeiro' && (
                          <button className="danger" style={{ padding: '5px 8px', fontSize: 11 }} onClick={() => handleCancelarAutorizacao(a)}>
                            Revogar
                          </button>
                        )}
                        {a.consumida && <span style={{ fontSize: 11, color: '#64748b' }}>Utilizada em {a.payoutId}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab 4: Política de Repasse */}
        {tab === 'politica' && (
          <section className="panel">
            <div className="panelTitle">
              <div>
                <h3>Política de Repasse Global</h3>
                <p>Parâmetros operacionais vigentes para toda a plataforma Disk Ingressos.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginTop: 20 }}>
              <div className="formGroup">
                <label>Gatilho Mínimo de Vendas Realizadas (%)</label>
                <input
                  type="number"
                  value={politica.percentualMinimoVendas}
                  disabled={perfil !== 'financeiro'}
                  onChange={e => setPolitica({ ...politica, percentualMinimoVendas: Number(e.target.value) })}
                />
                <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>
                  Percentual da meta necessário para habilitar o botão de repasse (Padrão: 50%).
                </small>
              </div>

              <div className="formGroup">
                <label>Percentual Liberado para Repasse (%)</label>
                <input
                  type="number"
                  value={politica.percentualLiberacao}
                  disabled={perfil !== 'financeiro'}
                  onChange={e => setPolitica({ ...politica, percentualLiberacao: Number(e.target.value) })}
                />
                <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>
                  Fatia das vendas elegíveis liberada ao atingir o gatilho (Padrão: 20%).
                </small>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                className="cta"
                disabled={perfil !== 'financeiro'}
                onClick={() => {
                  setAuditoria([
                    {
                      id: `AUD-${Date.now()}`,
                      timestamp: new Date().toLocaleString('pt-BR'),
                      usuario: 'Karine (Adm do Financeiro)',
                      acao: 'POLITICA_ATUALIZADA',
                      detalhes: `Parâmetros globais atualizados: Vendas mínimas ${politica.percentualMinimoVendas}%, Liberação ${politica.percentualLiberacao}%.`
                    },
                    ...auditoria
                  ]);
                  notify('Política de repasse atualizada com sucesso!', 'success');
                }}
              >
                Salvar Alterações de Política
              </button>
            </div>
          </section>
        )}

        {/* Tab 5: Trilha de Auditoria */}
        {tab === 'auditoria' && (
          <section className="panel">
            <div className="panelTitle" style={{ marginBottom: 16 }}>
              <div>
                <h3>Trilha de Auditoria Imutável</h3>
                <p>Histórico cronológico de cada ação executada na esteira de repasses e governança.</p>
              </div>
            </div>

            <div className="timeline">
              {auditoria.map(item => (
                <div className="timelineItem" key={item.id}>
                  <div className="timelineInfo">
                    <strong>{item.acao.replace(/_/g, ' ')}</strong>
                    <p>{item.detalhes}</p>
                  </div>
                  <div className="timelineMeta">
                    <span>{item.usuario}</span>
                    {item.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modal Solicitar Repasse */}
      {modalRepasseAberto && (
        <div className="modalBackdrop">
          <div className="modalContent">
            <div className="modalHeader">
              <h3>Solicitar Repasse Financeiro</h3>
              <button className="closeBtn" onClick={() => setModalRepasseAberto(false)}><X /></button>
            </div>
            <div className="formGroup">
              <label>Evento</label>
              <input type="text" disabled value={`${eventoAtual.nome} (${eventoAtual.id})`} />
            </div>
            <div className="formGroup">
              <label>Saldo Disponível para Solicitação</label>
              <input type="text" disabled value={money(disponivelFinal)} style={{ fontWeight: 800, color: '#2563eb' }} />
            </div>
            <div className="formGroup">
              <label>Valor Desejado (R$)</label>
              <input
                type="number"
                placeholder="Ex: 50000"
                value={valorRepasse}
                onChange={e => setValorRepasse(e.target.value)}
              />
            </div>
            <div className="modalFooter">
              <button className="outline" onClick={() => setModalRepasseAberto(false)}>Cancelar</button>
              <button className="cta" onClick={handleSolicitarRepasse}>Confirmar Solicitação</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Autorização Excepcional */}
      {modalAutorizacaoAberto && (
        <div className="modalBackdrop">
          <div className="modalContent">
            <div className="modalHeader">
              <h3>Autorizar Repasse Excepcional (A Trava Humana)</h3>
              <button className="closeBtn" onClick={() => setModalAutorizacaoAberto(false)}><X /></button>
            </div>
            <div className="formGroup">
              <label>Evento Destino</label>
              <select value={eventoExcecao} onChange={e => setEventoExcecao(e.target.value)}>
                {eventos.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.nome} ({ev.id})</option>
                ))}
              </select>
            </div>
            <div className="formGroup">
              <label>Valor Autorizado em Exceção (R$)</label>
              <input
                type="number"
                placeholder="Ex: 35000"
                value={valorExcecao}
                onChange={e => setValorExcecao(e.target.value)}
              />
            </div>
            <div className="formGroup">
              <label>Justificativa Formal Obrigatória (mínimo 5 caracteres)</label>
              <textarea
                rows="3"
                placeholder="Ex: Adiantamento excepcional aprovado pela diretoria para custeio de infraestrutura..."
                value={motivoExcecao}
                onChange={e => setMotivoExcecao(e.target.value)}
              />
            </div>
            <div className="modalFooter">
              <button className="outline" onClick={() => setModalAutorizacaoAberto(false)}>Cancelar</button>
              <button className="cta" onClick={handleCriarAutorizacao}>Emitir Autorização</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
