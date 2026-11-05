import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Users,
  Clock,
  MapPin,
  CalendarDays,
  FileClock,
  ShieldCheck,
  LayoutDashboard,
  Building2,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  QrCode,
  Smartphone,
  Check,
  X,
  Radio,
  TimerReset,
  CalendarCheck,
  FileText,
  CheckCircle2,
  Lock,
  Unlock,
  RefreshCw,
  Sun,
  Stethoscope,
  UserPlus,
  Files,
  CreditCard,
  Banknote,
  Ticket,
  BarChart3,
  Send,
  Download
} from 'lucide-react';
import './style.css';

// ----------------------------------------------------------------------------
// MENU LATERAL DAS FASES 1 A 10
// ----------------------------------------------------------------------------

const menu = [
  ['visao', 'Visão Geral', LayoutDashboard],
  ['monitor', 'Monitor de Ponto', Radio],
  ['banco', 'Banco de Horas', TimerReset],
  ['espelho', 'Espelho de Ponto', FileText],
  ['fechamento', 'Fechamento Mensal', CalendarCheck],
  ['ferias', 'Férias & Ausências', Sun],
  ['atestados', 'Atestados Médicos', Stethoscope],
  ['admissao', 'Admissão & Onboarding', UserPlus],
  ['ged', 'Gestão de Documentos (GED)', Files],
  ['beneficios', 'Benefícios Corporativos', CreditCard],
  ['folha', 'Folha de Pagamento', Banknote],
  ['staff', 'Staff de Eventos & Diárias', Ticket],
  ['analytics', 'People Analytics & eSocial', BarChart3],
  ['colaboradores', 'Colaboradores', Users],
  ['locais', 'Locais & Geofences', MapPin],
  ['escalas', 'Jornadas & Escalas', CalendarDays],
  ['ajustes', 'Ajustes de Ponto', FileClock],
  ['dispositivos', 'Dispositivos Disk Ponto', Smartphone],
  ['auditoria', 'Auditoria & LGPD', ShieldCheck]
];

export function App() {
  const [tabAtiva, setTabAtiva] = useState('visao');
  const [apiConectada, setApiConectada] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState('');
  const [msgErro, setMsgErro] = useState('');

  // Estados principais
  const [dashboard, setDashboard] = useState<any>({
    colaboradoresAtivos: 5,
    trabalhandoAgora: 2,
    horasExtrasMes: 62,
    colaboradoresEmFerias: 1,
    atestadosMes: 1,
    totalFolhaLiquida: 17870.00
  });

  // Checagem de integridade com a API REST
  useEffect(() => {
    fetch('http://localhost:3333/api/saude')
      .then(r => {
        if (r.ok) {
          setApiConectada(true);
          fetch('http://localhost:3333/api/dashboard').then(res => res.json()).then(d => setDashboard(d)).catch(() => {});
        }
      })
      .catch(() => setApiConectada(false));
  }, []);

  const notificarSucesso = (texto: string) => {
    setMsgSucesso(texto);
    setTimeout(() => setMsgSucesso(''), 4000);
  };

  const notificarErro = (texto: string) => {
    setMsgErro(texto);
    setTimeout(() => setMsgErro(''), 5000);
  };

  return (
    <div className="app">
      {/* Sidebar Corporativa */}
      <aside>
        <div className="brand">
          <b>DISK</b>
          <span>RH V1</span>
        </div>
        <small>GESTÃO DE PESSOAS & PONTO</small>
        <nav style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 170px)' }}>
          {menu.map(([id, label, Icon]: any) => (
            <button
              key={id}
              onClick={() => { setTabAtiva(id); setMsgErro(''); }}
              className={tabAtiva === id ? 'active' : ''}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div>Portaria 671 MTE • eSocial</div>
          <div>Fases 1 a 10 • Enterprise</div>
        </div>
      </aside>

      {/* Conteúdo Central */}
      <main>
        <header>
          <div>
            <h1>{menu.find(m => m[0] === tabAtiva)?.[1]}</h1>
            <p>RH Disk V1 • Sistema Unificado de Gestão de Pessoas, Jornada, Folha e Eventos</p>
          </div>
          <div className="headright">
            <span className={`api ${apiConectada ? 'on' : ''}`}>
              {apiConectada ? '✓ API V1.10 Online (:3333)' : '● Modo Resiliente'}
            </span>
            <div className="avatar">RH</div>
          </div>
        </header>

        {msgSucesso && (
          <div style={{ background: '#dcfce7', color: '#166534', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} /> {msgSucesso}
          </div>
        )}
        {msgErro && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> {msgErro}
          </div>
        )}

        {/* Rotas das Telas */}
        {tabAtiva === 'visao' && <TelaVisaoGeral dashboard={dashboard} onNavegar={setTabAtiva} />}
        {tabAtiva === 'monitor' && <TelaMonitor />}
        {tabAtiva === 'banco' && <TelaBancoHoras onSucesso={notificarSucesso} />}
        {tabAtiva === 'espelho' && <TelaEspelho />}
        {tabAtiva === 'fechamento' && <TelaFechamento onSucesso={notificarSucesso} onErro={notificarErro} />}
        {tabAtiva === 'ferias' && <TelaFerias onSucesso={notificarSucesso} />}
        {tabAtiva === 'atestados' && <TelaAtestados onSucesso={notificarSucesso} />}
        {tabAtiva === 'admissao' && <TelaAdmissao onSucesso={notificarSucesso} />}
        {tabAtiva === 'ged' && <TelaGED onSucesso={notificarSucesso} />}
        {tabAtiva === 'beneficios' && <TelaBeneficios onSucesso={notificarSucesso} />}
        {tabAtiva === 'folha' && <TelaFolha onSucesso={notificarSucesso} />}
        {tabAtiva === 'staff' && <TelaStaffEventos onSucesso={notificarSucesso} />}
        {tabAtiva === 'analytics' && <TelaAnalytics onSucesso={notificarSucesso} />}
        {tabAtiva === 'colaboradores' && <TelaColaboradores onSucesso={notificarSucesso} />}
        {tabAtiva === 'locais' && <TelaLocais onSucesso={notificarSucesso} />}
        {tabAtiva === 'escalas' && <TelaEscalas onSucesso={notificarSucesso} />}
        {tabAtiva === 'ajustes' && <TelaAjustes onSucesso={notificarSucesso} />}
        {tabAtiva === 'dispositivos' && <TelaDispositivos onSucesso={notificarSucesso} />}
        {tabAtiva === 'auditoria' && <TelaAuditoria />}
      </main>
    </div>
  );
}

// ----------------------------------------------------------------------------
// COMPONENTES DE SUB-TELAS (FASES 1 A 10)
// ----------------------------------------------------------------------------

function TelaVisaoGeral({ dashboard, onNavegar }: any) {
  return (
    <>
      <section className="cards">
        <article>
          <span>Colaboradores Ativos</span>
          <strong>{dashboard.colaboradoresAtivos || 5}</strong>
          <small>Quadro operacional</small>
        </article>
        <article>
          <span>Trabalhando Agora</span>
          <strong>{dashboard.trabalhandoAgora || 2}</strong>
          <small>Ponto validado</small>
        </article>
        <article>
          <span>Horas Extras no Mês</span>
          <strong>+{dashboard.horasExtrasMes || 62}h</strong>
          <small>Banco de Horas</small>
        </article>
        <article>
          <span>Folha Líquida Prevista</span>
          <strong>R$ 17.870</strong>
          <small>Competência 10/2026</small>
        </article>
        <article>
          <span>Staff de Eventos</span>
          <strong>18 diárias</strong>
          <small>Alocadas para shows</small>
        </article>
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Ecossistema Corporativo de Recursos Humanos</h2>
          <div className="flow">
            <b>1. Admissão & GED</b><i>→</i>
            <b>2. Benefícios</b><i>→</i>
            <b>3. Escala & Geofence</b><i>→</i>
            <b>4. Ponto MTE 671</b><i>→</i>
            <b>5. Férias & Atestados</b><i>→</i>
            <b>6. Banco de Horas</b><i>→</i>
            <b>7. Folha & PIX</b>
          </div>

          {[
            'Fases 1 a 4: Ponto biométrico móvel, geofences por arena e fechamento com bloqueio por pendências.',
            'Fase 5: Controle integral de períodos aquisitivos de férias e abono automático de faltas por atestado médico.',
            'Fase 6: Admissão digital com esteira documental e assinatura eletrônica com hash SHA-256 e timestamp.',
            'Fase 7: Pedido automatizado de VT, VR e convênios com apuração de dias úteis e escalas.',
            'Fase 8: Motor de folha de pagamento, geração de holerites e remessa direta para a fila PIX da Tesouraria.',
            'Fase 9: Alocação de staff para arenas de shows com apropriação direta de custos para o DRE do Evento.',
            'Fase 10: People Analytics, taxa de turnover, absenteísmo e geração de eventos do eSocial.'
          ].map((item, idx) => (
            <div className="rule" key={idx}>
              <CheckCircle2 size={16} color="#166534" />
              <span>{item}</span>
            </div>
          ))}
        </section>

        <section className="panel">
          <h2>Acesso Rápido aos Módulos</h2>
          <button className="action" onClick={() => onNavegar('folha')}>
            <span>Folha de Pagamento & PIX</span><b>›</b>
          </button>
          <button className="action" onClick={() => onNavegar('ferias')}>
            <span>Férias & Atestados Médicos</span><b>›</b>
          </button>
          <button className="action" onClick={() => onNavegar('beneficios')}>
            <span>Recarga Mensal de Benefícios</span><b>›</b>
          </button>
          <button className="action" onClick={() => onNavegar('staff')}>
            <span>Equipes & Freelancers de Eventos</span><b>›</b>
          </button>
          <button className="action" onClick={() => onNavegar('admissao')}>
            <span>Admissão & Onboarding Digital</span><b>›</b>
          </button>
        </section>
      </div>
    </>
  );
}

// FASE 5: Férias & Ausências
function TelaFerias({ onSucesso }: any) {
  const lista = [
    { colaborador: 'Carlos Eduardo Mendes', aquisitivo: '15/01/2025 a 14/01/2026', gozo: '03/11/2026 a 22/11/2026 (20 dias)', abono: '10 dias vendidos', decimoTerceiro: 'Sim', status: 'HOMOLOGADA_RH' },
    { colaborador: 'Ana Martins', aquisitivo: '01/03/2025 a 28/02/2026', gozo: '05/01/2027 a 03/02/2027 (30 dias)', abono: 'Não', decimoTerceiro: 'Não', status: 'SOLICITADA' }
  ];

  return (
    <section className="panel">
      <div className="toolbar">
        <h2>Gestão de Férias e Períodos Aquisitivos (CLT)</h2>
        <button className="primary" onClick={() => onSucesso('Solicitação de férias registrada com sucesso!')}><Plus size={16} /> Solicitar Férias</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Período Aquisitivo</th>
              <th>Período de Gozo</th>
              <th>Abono Pecuniário</th>
              <th>Adiantamento 13º</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((f, i) => (
              <tr key={i}>
                <td><b>{f.colaborador}</b></td>
                <td><code>{f.aquisitivo}</code></td>
                <td><b>{f.gozo}</b></td>
                <td>{f.abono}</td>
                <td>{f.decimoTerceiro}</td>
                <td><span className={`badge ${f.status === 'HOMOLOGADA_RH' ? 'success' : 'warning'}`}>{f.status}</span></td>
                <td>
                  {f.status === 'SOLICITADA' ? (
                    <button className="btn-action approve" onClick={() => onSucesso('Férias homologadas pelo RH!')}>Homologar</button>
                  ) : <span style={{ fontSize: '11px', color: '#64748b' }}>Homologado</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// FASE 5: Atestados Médicos
function TelaAtestados({ onSucesso }: any) {
  const atestados = [
    { colaborador: 'Lucas Gabriel Pinheiro', emissao: '20/09/2026', dias: '2 dias', cid: 'J06.9 (Infecção vias aéreas)', medico: 'Dr. Roberto Vianna (CRM-PR 29811)', status: 'HOMOLOGADA', abono: 'Abonado no Ponto' }
  ];

  return (
    <section className="panel">
      <div className="toolbar">
        <h2>Atestados Médicos & Abono Legal de Ponto</h2>
        <button className="primary" onClick={() => onSucesso('Atestado médico anexado e abonado no ponto!')}><Plus size={16} /> Lançar Atestado</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Data Emissão</th>
              <th>Dias Afastamento</th>
              <th>CID-10</th>
              <th>Médico Emissor</th>
              <th>Status RH</th>
              <th>Impacto no Ponto</th>
            </tr>
          </thead>
          <tbody>
            {atestados.map((a, i) => (
              <tr key={i}>
                <td><b>{a.colaborador}</b></td>
                <td><code>{a.emissao}</code></td>
                <td><b>{a.dias}</b></td>
                <td><code>{a.cid}</code></td>
                <td>{a.medico}</td>
                <td><span className="badge success">{a.status}</span></td>
                <td><span className="badge info">{a.abono}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// FASE 6: Admissão & Onboarding
function TelaAdmissao({ onSucesso }: any) {
  const admissoes = [
    { candidato: 'Mariana Duarte Lopes', cargo: 'Analista de Atendimento Júnior', salario: 'R$ 2.800,00', inicio: '15/10/2026', status: 'EM_ANALISE', matricula: 'DISK-00501' }
  ];

  return (
    <section className="panel">
      <div className="toolbar">
        <h2>Esteira de Admissão & Onboarding Digital</h2>
        <button className="primary" onClick={() => onSucesso('Convite de admissão digital enviado ao candidato!')}><Plus size={16} /> Nova Admissão</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Candidato</th>
              <th>Cargo Pretendido</th>
              <th>Salário Proposto</th>
              <th>Previsão de Início</th>
              <th>Matrícula Prevista</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {admissoes.map((adm, i) => (
              <tr key={i}>
                <td><b>{adm.candidato}</b></td>
                <td>{adm.cargo}</td>
                <td>{adm.salario}</td>
                <td><code>{adm.inicio}</code></td>
                <td><code>{adm.matricula}</code></td>
                <td><span className="badge warning">{adm.status}</span></td>
                <td>
                  <button className="btn-action approve" onClick={() => onSucesso(`Admissão concluída! Colaborador ativado com matrícula ${adm.matricula}.`)}>Concluir & Contratar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// FASE 6: GED & Assinatura Digital
function TelaGED({ onSucesso }: any) {
  const docs = [
    { colaborador: 'Ana Martins', tipo: 'Contrato de Trabalho CLT', arquivo: 'contrato-ana-martins.pdf', hash: 'e3b0c442...b855', status: 'ASSINADO', data: '01/03/2024' },
    { colaborador: 'Ana Martins', tipo: 'Termo de Confidencialidade & LGPD', arquivo: 'termo-confidencialidade-ana.pdf', hash: '8f434346...aa4', status: 'ASSINADO', data: '01/03/2024' },
    { colaborador: 'Lucas Pinheiro', tipo: 'Termo de Entrega de EPI / Crachá', arquivo: 'termo-epi-lucas.pdf', hash: '12fa4c01...d8e', status: 'PENDENTE_ASSINATURA', data: '04/10/2026' }
  ];

  return (
    <section className="panel">
      <div className="toolbar">
        <h2>Gestão Eletrônica de Documentos (GED & Assinatura)</h2>
        <button className="primary" onClick={() => onSucesso('Documento anexado e enviado para assinatura digital!')}><Plus size={16} /> Upload de Documento</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Tipo de Documento</th>
              <th>Arquivo</th>
              <th>Hash SHA-256</th>
              <th>Status</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d, i) => (
              <tr key={i}>
                <td><b>{d.colaborador}</b></td>
                <td>{d.tipo}</td>
                <td><code>{d.arquivo}</code></td>
                <td><small><code>{d.hash}</code></small></td>
                <td><span className={`badge ${d.status === 'ASSINADO' ? 'success' : 'warning'}`}>{d.status}</span></td>
                <td><code>{d.data}</code></td>
                <td>
                  {d.status === 'PENDENTE_ASSINATURA' ? (
                    <button className="btn-action approve" onClick={() => onSucesso('Documento assinado digitalmente com IP e carimbo de tempo!')}>Assinar Digitalmente</button>
                  ) : <button className="btn-action" onClick={() => onSucesso('Baixando PDF assinado com certificado...')}><Download size={13} /> PDF</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// FASE 7: Benefícios Corporativos
function TelaBeneficios({ onSucesso }: any) {
  const lista = [
    { colaborador: 'Ana Martins', beneficio: 'Vale Refeição', operadora: 'Pluxee / Sodexo', valor: 'R$ 770,00', descontoFolha: 'R$ 77,00', cartao: '**** 4432', status: 'ATIVO' },
    { colaborador: 'Ana Martins', beneficio: 'Vale Transporte', operadora: 'URBS Curitiba', valor: 'R$ 330,00', descontoFolha: 'R$ 252,00 (6%)', cartao: '9812-4412-00', status: 'ATIVO' },
    { colaborador: 'Carlos Mendes', beneficio: 'Plano de Saúde', operadora: 'Unimed Curitiba Coparticipativo', valor: 'R$ 450,00', descontoFolha: 'R$ 90,00', cartao: '0 055 991201', status: 'ATIVO' }
  ];

  return (
    <section className="panel">
      <div className="toolbar">
        <h2>Benefícios Corporativos & Pedidos de Recarga</h2>
        <button className="primary" onClick={() => onSucesso('Pedido de recarga de benefícios da competência 10/2026 processado!')}><RefreshCw size={15} /> Calcular Pedido Mensal</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Benefício</th>
              <th>Operadora</th>
              <th>Valor Mensal</th>
              <th>Desconto em Folha</th>
              <th>Identificador / Cartão</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((b, i) => (
              <tr key={i}>
                <td><b>{b.colaborador}</b></td>
                <td><span className="badge info">{b.beneficio}</span></td>
                <td>{b.operadora}</td>
                <td><b>{b.valor}</b></td>
                <td><span className="bad">{b.descontoFolha}</span></td>
                <td><code>{b.cartao}</code></td>
                <td><span className="badge success">{b.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// FASE 8: Folha de Pagamento & Holerites
function TelaFolha({ onSucesso }: any) {
  return (
    <section className="panel">
      <div className="toolbar">
        <div>
          <h2>Folha de Pagamento Consolidada — 10/2026</h2>
          <small>Integrada ao Ponto, Horas Extras, Férias, Benefícios e Tesouraria PIX</small>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="secondary" onClick={() => onSucesso('Holerites PDF gerados com sucesso!')}><FileText size={15} /> Gerar Holerites</button>
          <button className="primary" onClick={() => onSucesso('Folha 10/2026 enviada para a Fila PIX da Tesouraria!')}><Send size={15} /> Enviar para Tesouraria (PIX / CNAB)</button>
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', margin: '16px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div><span>Total Proventos Brutos:</span><b style={{ display: 'block', fontSize: '18px', color: '#0f172a' }}>R$ 22.100,00</b></div>
        <div><span>Total Descontos (INSS/IR/VT):</span><b style={{ display: 'block', fontSize: '18px', color: '#b91c1c' }}>- R$ 4.230,00</b></div>
        <div><span>Líquido Total a Pagar:</span><b style={{ display: 'block', fontSize: '18px', color: '#166534' }}>R$ 17.870,00</b></div>
        <div><span>Encargos Empresa (FGTS 8%):</span><b style={{ display: 'block', fontSize: '18px', color: '#2563eb' }}>R$ 1.768,00</b></div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Cargo</th>
              <th>Salário Base</th>
              <th>Horas Extras 50%</th>
              <th>Desconto INSS</th>
              <th>Desconto IRRF</th>
              <th>Outros Descontos</th>
              <th>Líquido</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Ana Martins', 'Analista Operações', 'R$ 4.200,00', '+ R$ 238,64', '- R$ 491,24', '- R$ 175,18', '- R$ 342,00 (VT/Saúde)', 'R$ 3.430,22'],
              ['Carlos Mendes', 'Coord. Bilheteria', 'R$ 4.800,00', '+ R$ 160,00', '- R$ 575,00', '- R$ 290,00', '- R$ 378,00 (VT/Saúde)', 'R$ 3.717,00'],
              ['Camila Silveira', 'Superv. Atendimento', 'R$ 3.800,00', '+ R$ 180,00', '- R$ 420,00', '- R$ 115,00', '- R$ 318,00 (VT/Saúde)', 'R$ 3.127,00'],
              ['Lucas Pinheiro', 'Operador Bilheteria', 'R$ 2.400,00', '+ R$ 120,00', '- R$ 215,00', 'Isento', '- R$ 144,00 (VT)', 'R$ 2.161,00'],
              ['Beatriz Ramos', 'Analista Financeiro', 'R$ 4.600,00', '—', '- R$ 540,00', '- R$ 245,00', '- R$ 376,00 (VT/Saúde)', 'R$ 3.439,00']
            ].map((r, i) => (
              <tr key={i}>
                <td><b>{r[0]}</b></td>
                <td>{r[1]}</td>
                <td>{r[2]}</td>
                <td><span className="good">{r[3]}</span></td>
                <td><span className="bad">{r[4]}</span></td>
                <td>{r[5]}</td>
                <td><small>{r[6]}</small></td>
                <td><b style={{ color: '#166534' }}>{r[7]}</b></td>
                <td><span className="badge success">PRONTO PIX</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// FASE 9: Staff de Eventos, Diárias & DRE
function TelaStaffEventos({ onSucesso }: any) {
  const staff = [
    { nome: 'Lucas Gabriel Pinheiro', evento: 'Festival Curitiba Rock 2026', funcao: 'Operador de Caixa', diaria: 'R$ 180,00', trans: 'R$ 30,00', alim: 'R$ 40,00', total: 'R$ 250,00', status: 'APROVADO_PAGAMENTO', pix: '67890123456' },
    { nome: 'Rodrigo Fontana (Freelancer)', evento: 'Festival Curitiba Rock 2026', funcao: 'Controlador de Acesso', diaria: 'R$ 160,00', trans: 'R$ 30,00', alim: 'R$ 40,00', total: 'R$ 230,00', status: 'APROVADO_PAGAMENTO', pix: '44555666788' },
    { nome: 'Mariana Duarte (Freelancer)', evento: 'Show Ligga Arena', funcao: 'Atendente de Bar', diaria: 'R$ 150,00', trans: 'R$ 30,00', alim: 'R$ 40,00', total: 'R$ 220,00', status: 'ESCALADO', pix: '99887766554' }
  ];

  return (
    <section className="panel">
      <div className="toolbar">
        <div>
          <h2>Staff de Eventos & Diárias de Produção</h2>
          <small>Alocação de mão de obra direta para arenas e alimentação do DRE do Evento</small>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="secondary" onClick={() => onSucesso('Nova escala de staff adicionada para o show!')}><Plus size={15} /> Escalar Staff</button>
          <button className="primary" onClick={() => onSucesso('Lote de diárias de staff pago via PIX e integrado ao DRE do Evento!')}><Send size={15} /> Pagar Diárias via PIX</button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Profissional / Staff</th>
              <th>Evento / Show</th>
              <th>Função</th>
              <th>Diária</th>
              <th>Transporte</th>
              <th>Alimentação</th>
              <th>Total Diária</th>
              <th>Chave PIX</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s, i) => (
              <tr key={i}>
                <td><b>{s.nome}</b></td>
                <td><span className="badge info">{s.evento}</span></td>
                <td>{s.funcao}</td>
                <td>{s.diaria}</td>
                <td>{s.trans}</td>
                <td>{s.alim}</td>
                <td><b style={{ color: '#0f172a' }}>{s.total}</b></td>
                <td><code>{s.pix}</code></td>
                <td>
                  <span className={`badge ${s.status === 'APROVADO_PAGAMENTO' ? 'success' : 'warning'}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// FASE 10: People Analytics & eSocial
function TelaAnalytics({ onSucesso }: any) {
  return (
    <div className="grid">
      <section className="panel">
        <h2>People Analytics & Indicadores Executivos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', margin: '16px 0' }}>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Turnover Mensal:</span>
            <strong style={{ display: 'block', fontSize: '22px', color: '#166534', margin: '4px 0' }}>1.8%</strong>
            <small style={{ color: '#166534' }}>Abaixo do mercado</small>
          </div>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Taxa de Absenteísmo:</span>
            <strong style={{ display: 'block', fontSize: '22px', color: '#0f172a', margin: '4px 0' }}>0.9%</strong>
            <small style={{ color: '#166534' }}>Faltas e atrasos mínimos</small>
          </div>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Custo Per Capita Médio:</span>
            <strong style={{ display: 'block', fontSize: '22px', color: '#2563eb', margin: '4px 0' }}>R$ 3.740</strong>
            <small>Salário + Benefícios</small>
          </div>
        </div>

        <h3>Distribuição por Centro de Custo</h3>
        <div className="rule">
          <span><b>CC-010-OPS (Operações & Eventos):</b> 4 colaboradores (R$ 15.200/mês)</span>
        </div>
        <div className="rule">
          <span><b>CC-002-FIN (Financeiro & Controladoria):</b> 1 colaborador (R$ 4.600/mês)</span>
        </div>
      </section>

      <section className="panel">
        <h2>Monitor de Eventos do eSocial</h2>
        <p style={{ fontSize: '12px', color: '#64748b' }}>Validação estrutural e geração de arquivos XML/JSON para transmissão ao ambiente nacional do eSocial.</p>

        {[
          { codigo: 'S-1000', nome: 'Informações do Empregador Disk', status: 'TRANSMITIDO' },
          { codigo: 'S-2200', nome: 'Cadastramento Inicial e Admissões', status: 'TRANSMITIDO' },
          { codigo: 'S-1200', nome: 'Remuneração de Trabalhador (Folha)', status: 'VALIDADO' },
          { codigo: 'S-1210', nome: 'Pagamentos de Rendimentos do Trabalho', status: 'VALIDADO' }
        ].map((e, idx) => (
          <div className="rule" key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <b>{e.codigo}</b> — {e.nome}
            </div>
            <span className={`badge ${e.status === 'TRANSMITIDO' ? 'success' : 'info'}`}>{e.status}</span>
          </div>
        ))}

        <button className="primary" style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }} onClick={() => onSucesso('Eventos periódicos S-1200 e S-1210 transmitidos com recibo do eSocial!')}>
          Transmitir Lote eSocial
        </button>
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------------
// COMPONENTES DE PONTO, BANCO DE HORAS E FECHAMENTO (FASES 1 A 4)
// ----------------------------------------------------------------------------

function TelaMonitor() {
  const batidas = [
    { colaborador: 'Ana Martins', tipo: 'ENTRADA', hora: '08:01', local: 'Sede DiskIngressos Curitiba', dist: '4m', status: 'VALIDADA' },
    { colaborador: 'Carlos Mendes', tipo: 'ENTRADA', hora: '08:01', local: 'Sede DiskIngressos Curitiba', dist: '5m', status: 'VALIDADA' },
    { colaborador: 'Lucas Pinheiro', tipo: 'ENTRADA', hora: '14:02', local: 'Arena da Baixada (Ligga Arena)', dist: '24m', status: 'VALIDADA' }
  ];

  return (
    <section className="panel">
      <h2>Monitor Operacional de Hoje (Tempo Real - Portaria 671 MTE)</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Tipo</th>
              <th>Horário</th>
              <th>Local / Cerca Virtual</th>
              <th>Distância</th>
              <th>Status Portaria 671</th>
            </tr>
          </thead>
          <tbody>
            {batidas.map((b, i) => (
              <tr key={i}>
                <td><b>{b.colaborador}</b></td>
                <td><span className="badge info">{b.tipo}</span></td>
                <td>{b.hora}</td>
                <td>{b.local}</td>
                <td>{b.dist}</td>
                <td><span className="badge success">{b.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TelaBancoHoras({ onSucesso }: any) {
  const saldos = [
    { colab: 'Ana Martins', comp: '2026-10', prev: '176h', trab: '181h 20m', extras: '5h 20m', deb: '0h', saldo: '+5h 20m', pos: true },
    { colab: 'Carlos Mendes', comp: '2026-10', prev: '176h', trab: '174h 45m', extras: '1h 10m', deb: '2h 25m', saldo: '-1h 15m', pos: false },
    { colab: 'Camila Silveira', comp: '2026-10', prev: '176h', trab: '179h 05m', extras: '3h 05m', deb: '0h', saldo: '+3h 05m', pos: true }
  ];

  return (
    <section className="panel">
      <div className="toolbar">
        <h2>Banco de Horas & Horas Extras — Competência 10/2026</h2>
        <button className="primary" onClick={() => onSucesso('Banco de horas recalculado com sucesso!')}><RefreshCw size={15} /> Recalcular Competência</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Competência</th>
              <th>Carga Prevista</th>
              <th>Trabalhado</th>
              <th>Horas Extras</th>
              <th>Débito</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {saldos.map((s, i) => (
              <tr key={i}>
                <td><b>{s.colab}</b></td>
                <td><code>{s.comp}</code></td>
                <td>{s.prev}</td>
                <td><b>{s.trab}</b></td>
                <td><span className="good">+{s.extras}</span></td>
                <td><span className="bad">{s.deb}</span></td>
                <td><b className={s.pos ? 'good' : 'bad'}>{s.saldo}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TelaEspelho() {
  return (
    <section className="panel">
      <h2>Espelho de Ponto Individual — Ana Martins (10/2026)</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Entrada</th>
              <th>Início Intervalo</th>
              <th>Fim Intervalo</th>
              <th>Saída</th>
              <th>Total Dia</th>
              <th>Ocorrências</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['01/10/2026', '08:01', '12:02', '13:01', '17:59', '8h 57m', 'Normal'],
              ['02/10/2026', '07:58', '12:01', '13:00', '18:07', '9h 08m', '+20m extra'],
              ['03/10/2026', '08:04', '12:03', '13:02', '18:00', '8h 55m', 'Normal'],
              ['04/10/2026', '08:01', '—', '—', '—', 'Em andamento', 'Jornada ativa']
            ].map((r, i) => (
              <tr key={i}>
                <td><code>{r[0]}</code></td>
                <td><b>{r[1]}</b></td>
                <td>{r[2]}</td>
                <td>{r[3]}</td>
                <td><b>{r[4]}</b></td>
                <td>{r[5]}</td>
                <td><span className="badge success">{r[6]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TelaFechamento({ onSucesso, onErro }: any) {
  const [temPendencia, setTemPendencia] = useState(true);
  const [status, setStatus] = useState('EM_ANALISE');

  const tentarFechar = () => {
    if (temPendencia) {
      onErro('BLOQUEIO DE SEGURANÇA: Existem 1 ajuste de ponto pendente. Regularize-o antes do fechamento!');
      return;
    }
    setStatus('FECHADO');
    onSucesso('Competência 10/2026 FECHADA e homologada com sucesso!');
  };

  return (
    <div className="grid">
      <section className="panel">
        <h2>Fechamento Mensal de Ponto</h2>
        <div className={`bigstatus ${status === 'FECHADO' ? 'fechado' : 'analise'}`}>
          {status === 'FECHADO' ? 'COMPETÊNCIA FECHADA' : 'EM ANÁLISE / APURAÇÃO'}
        </div>
        <div className="rule">
          <span>Ajustes pendentes: <b style={{ color: temPendencia ? '#b91c1c' : '#166534' }}>{temPendencia ? '1 pendente' : '0 pendentes'}</b></span>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button className="primary" onClick={tentarFechar}><Lock size={15} /> Fechar Competência</button>
          {temPendencia && (
            <button className="secondary" onClick={() => { setTemPendencia(false); onSucesso('Ajuste pendente aprovado pelo gestor!'); }}>
              Simular Resolução de Ajuste
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Checklist Trabalhista</h2>
        {[
          { label: 'Escalas atribuídas', ok: true },
          { label: 'Batidas Portaria 671 validadas', ok: true },
          { label: 'Ajustes analisados', ok: !temPendencia },
          { label: 'Banco de Horas calculado', ok: true }
        ].map((chk, i) => (
          <div className="rule" key={i}>
            {chk.ok ? <CheckCircle2 size={16} color="#166534" /> : <AlertTriangle size={16} color="#b91c1c" />}
            <span>{chk.label}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function TelaColaboradores({ onSucesso }: any) {
  return (
    <section className="panel">
      <div className="toolbar">
        <h2>Colaboradores da DiskIngressos</h2>
        <button className="primary" onClick={() => onSucesso('Novo colaborador cadastrado!')}><Plus size={16} /> Novo Colaborador</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Matrícula</th><th>Nome</th><th>Cargo</th><th>Departamento</th><th>Centro de Custo</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td><code>DISK-00128</code></td><td><b>Ana Martins</b></td><td>Analista Operações</td><td>Operações</td><td>CC-010-OPS</td><td><span className="badge success">ATIVO</span></td></tr>
            <tr><td><code>DISK-00101</code></td><td><b>Carlos Eduardo Mendes</b></td><td>Coord. Bilheteria</td><td>Operações</td><td>CC-010-OPS</td><td><span className="badge success">ATIVO</span></td></tr>
            <tr><td><code>DISK-00205</code></td><td><b>Camila Fernandes Silveira</b></td><td>Superv. Atendimento</td><td>Operações</td><td>CC-010-OPS</td><td><span className="badge success">ATIVO</span></td></tr>
            <tr><td><code>DISK-00388</code></td><td><b>Lucas Gabriel Pinheiro</b></td><td>Operador Caixa</td><td>Operações</td><td>CC-010-OPS</td><td><span className="badge success">ATIVO</span></td></tr>
            <tr><td><code>DISK-00412</code></td><td><b>Beatriz Nogueira Ramos</b></td><td>Analista Financeiro</td><td>Financeiro</td><td>CC-002-FIN</td><td><span className="badge success">ATIVO</span></td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TelaLocais({ onSucesso }: any) {
  return (
    <section className="panel">
      <div className="toolbar">
        <h2>Locais de Ponto e Geofences (Cercas Virtuais)</h2>
        <button className="primary" onClick={() => onSucesso('Novo local cadastrado com cerca virtual!')}><Plus size={16} /> Novo Local</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Local / Arena</th><th>Endereço</th><th>Coordenadas</th><th>Raio</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td><b>Sede DiskIngressos Curitiba</b></td><td>Rua Visconde de Nácar, 1505</td><td><code>-25.4284, -49.2733</code></td><td>150m</td><td><span className="badge success">HABILITADA</span></td></tr>
            <tr><td><b>Arena da Baixada (Ligga Arena)</b></td><td>Rua Buenos Aires, 1260</td><td><code>-25.4484, -49.2770</code></td><td>350m</td><td><span className="badge success">HABILITADA</span></td></tr>
            <tr><td><b>Pedreira Paulo Leminski</b></td><td>Rua João Gava, 970</td><td><code>-25.3855, -49.2789</code></td><td>400m</td><td><span className="badge success">HABILITADA</span></td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TelaEscalas({ onSucesso }: any) {
  return (
    <section className="panel">
      <div className="toolbar">
        <h2>Escalas Operacionais Ativas</h2>
        <button className="primary" onClick={() => onSucesso('Escala operacional gravada!')}><Plus size={16} /> Nova Escala</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Colaborador</th><th>Jornada</th><th>Local Autorizado</th><th>Data</th><th>Evento</th></tr>
          </thead>
          <tbody>
            <tr><td><b>Ana Martins</b></td><td>Comercial Padrão 44h</td><td>Sede DiskIngressos</td><td><code>04/10/2026</code></td><td><span className="badge info">Sede</span></td></tr>
            <tr><td><b>Carlos Mendes</b></td><td>Comercial Padrão 44h</td><td>Sede DiskIngressos</td><td><code>04/10/2026</code></td><td><span className="badge info">Sede</span></td></tr>
            <tr><td><b>Lucas Pinheiro</b></td><td>Show Turno Noturno</td><td>Arena da Baixada</td><td><code>04/10/2026</code></td><td><span className="badge info">Curitiba Rock</span></td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TelaAjustes({ onSucesso }: any) {
  return (
    <section className="panel">
      <h2>Ajustes e Regularizações de Ponto</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Colaborador</th><th>Data</th><th>Tipo</th><th>Horário</th><th>Justificativa</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Beatriz Nogueira Ramos</b></td>
              <td><code>04/10/2026</code></td>
              <td>SAIDA</td>
              <td>18:18</td>
              <td>Reunião prolongada de fechamento de borderô.</td>
              <td><span className="badge warning">PENDENTE</span></td>
              <td>
                <button className="btn-action approve" onClick={() => onSucesso('Ajuste aprovado pelo gestor de RH!')}>Aprovar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TelaDispositivos({ onSucesso }: any) {
  return (
    <section className="panel">
      <h2>Dispositivos Móveis Autorizados (Disk Ponto Android)</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Colaborador</th><th>Identificador</th><th>Aparelho</th><th>Plataforma</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            <tr><td><b>Ana Martins</b></td><td><code>dev-samsung-a55-ana</code></td><td>Galaxy A55 (Corporativo)</td><td>Android 14</td><td><span className="badge success">AUTORIZADO</span></td><td><button className="btn-action reject" onClick={() => onSucesso('Aparelho bloqueado!')}>Bloquear</button></td></tr>
            <tr><td><b>Carlos Mendes</b></td><td><code>dev-moto-g84-carlos</code></td><td>Moto G84 (Pessoal)</td><td>Android 13</td><td><span className="badge success">AUTORIZADO</span></td><td><button className="btn-action reject" onClick={() => onSucesso('Aparelho bloqueado!')}>Bloquear</button></td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TelaAuditoria() {
  return (
    <section className="panel">
      <h2>Trilha Imutável de Auditoria (Portaria 671 MTE & LGPD)</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Data/Hora</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Detalhes</th></tr>
          </thead>
          <tbody>
            <tr><td><code>04/10/2026 16:15</code></td><td>Gestor RH Disk</td><td><span className="badge info">FECHOU_COMPETENCIA</span></td><td>FechamentoPonto</td><td>Competência 10/2026 homologada com sucesso</td></tr>
            <tr><td><code>04/10/2026 08:01</code></td><td>Ana Martins</td><td><span className="badge info">REGISTRO_PONTO</span></td><td>BatidaPonto</td><td>Entrada NSR 1003 validada na Sede Disk (4m da cerca)</td></tr>
            <tr><td><code>04/10/2026 08:01</code></td><td>Carlos Mendes</td><td><span className="badge info">REGISTRO_PONTO</span></td><td>BatidaPonto</td><td>Entrada NSR 1001 validada na Sede Disk (5m da cerca)</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Inicialização da Aplicação
createRoot(document.getElementById('root')!).render(<App />);
