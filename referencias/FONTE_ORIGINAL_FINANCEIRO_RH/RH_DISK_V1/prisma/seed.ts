import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Seed do Banco PostgreSQL: RH Disk & Disk Ponto (Fases 1 a 10) ---');

  const defaultHash = await bcrypt.hash('Disk@123', 10);

  // 1. Locais e Geofences
  const sede = await prisma.localPonto.upsert({
    where: { id: 'sede-disk' },
    update: {},
    create: {
      id: 'sede-disk',
      nome: 'Sede DiskIngressos Curitiba',
      endereco: 'Rua Visconde de Nácar, 1505 - Centro, Curitiba/PR',
      latitude: -25.4284,
      longitude: -49.2733,
      raioMetros: 150,
      ativo: true
    }
  });

  const arena = await prisma.localPonto.upsert({
    where: { id: 'arena-baixada' },
    update: {},
    create: {
      id: 'arena-baixada',
      nome: 'Arena da Baixada (Ligga Arena)',
      endereco: 'Rua Buenos Aires, 1260 - Água Verde, Curitiba/PR',
      latitude: -25.4484,
      longitude: -49.2770,
      raioMetros: 350,
      ativo: true
    }
  });

  // 2. Jornadas
  const jornada44 = await prisma.jornada.upsert({
    where: { id: 'jor-padrao-44h' },
    update: {},
    create: {
      id: 'jor-padrao-44h',
      nome: 'Comercial Padrão 44h (Seg-Sex)',
      entrada: '08:00',
      inicioIntervalo: '12:00',
      fimIntervalo: '13:00',
      saida: '17:48',
      toleranciaMinutos: 10,
      cargaMinutos: 480
    }
  });

  const jornadaShow = await prisma.jornada.upsert({
    where: { id: 'jor-show-noturno' },
    update: {},
    create: {
      id: 'jor-show-noturno',
      nome: 'Operação Show Turno Noturno',
      entrada: '14:00',
      inicioIntervalo: '18:00',
      fimIntervalo: '19:00',
      saida: '23:00',
      toleranciaMinutos: 15,
      cargaMinutos: 540
    }
  });

  // 3. Usuários e Colaboradores
  const userAdmin = await prisma.usuario.upsert({
    where: { email: 'admin@diskingressos.com.br' },
    update: {},
    create: {
      email: 'admin@diskingressos.com.br',
      senhaHash: defaultHash,
      perfil: 'ADMINISTRADOR'
    }
  });

  const userRh = await prisma.usuario.upsert({
    where: { email: 'rh@diskingressos.com.br' },
    update: {},
    create: {
      email: 'rh@diskingressos.com.br',
      senhaHash: defaultHash,
      perfil: 'RH'
    }
  });

  const userAna = await prisma.usuario.upsert({
    where: { email: 'ana.martins@diskingressos.com.br' },
    update: {},
    create: {
      email: 'ana.martins@diskingressos.com.br',
      senhaHash: defaultHash,
      perfil: 'COLABORADOR'
    }
  });

  const colabAna = await prisma.colaborador.upsert({
    where: { cpf: '123.456.789-01' },
    update: {},
    create: {
      nome: 'Ana Martins',
      cpf: '123.456.789-01',
      matricula: 'DISK-00128',
      cargo: 'Analista de Operações Pleno',
      departamento: 'Operações e Eventos',
      centroCusto: 'CC-010-OPS',
      cargaHorariaSemanal: 44,
      salarioBase: 4200.00,
      chavePix: '12345678901',
      tipoChavePix: 'CPF',
      usuarioId: userAna.id,
      ativo: true
    }
  });

  const userCarlos = await prisma.usuario.upsert({
    where: { email: 'carlos.souza@diskingressos.com.br' },
    update: {},
    create: {
      email: 'carlos.souza@diskingressos.com.br',
      senhaHash: defaultHash,
      perfil: 'COLABORADOR'
    }
  });

  const colabCarlos = await prisma.colaborador.upsert({
    where: { cpf: '234.567.890-12' },
    update: {},
    create: {
      nome: 'Carlos Souza',
      cpf: '234.567.890-12',
      matricula: 'DISK-00101',
      cargo: 'Coordenador de Bilheteria',
      departamento: 'Operações e Eventos',
      centroCusto: 'CC-010-OPS',
      cargaHorariaSemanal: 44,
      salarioBase: 4800.00,
      chavePix: '23456789012',
      tipoChavePix: 'CPF',
      usuarioId: userCarlos.id,
      ativo: true
    }
  });

  // 4. Escalas Operacionais
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);

  await prisma.escala.upsert({
    where: { colaboradorId_data: { colaboradorId: colabAna.id, data: hoje } },
    update: {},
    create: {
      colaboradorId: colabAna.id,
      jornadaId: jornada44.id,
      localId: sede.id,
      data: hoje,
      eventoNome: 'Operação Sede Disk',
      observacao: 'Escala presencial'
    }
  });

  await prisma.escala.upsert({
    where: { colaboradorId_data: { colaboradorId: colabCarlos.id, data: hoje } },
    update: {},
    create: {
      colaboradorId: colabCarlos.id,
      jornadaId: jornadaShow.id,
      localId: arena.id,
      data: hoje,
      eventoNome: 'Festival Curitiba 2026',
      observacao: 'Show Turno Noturno'
    }
  });

  // 5. Banco de Horas & Fechamento
  await prisma.bancoHoras.upsert({
    where: { colaboradorId_competencia: { colaboradorId: colabAna.id, competencia: '2026-10' } },
    update: {},
    create: {
      colaboradorId: colabAna.id,
      competencia: '2026-10',
      minutosSaldo: 320,
      minutosExtras: 320,
      minutosDebito: 0
    }
  });

  await prisma.fechamentoPonto.upsert({
    where: { competencia: '2026-09' },
    update: {},
    create: {
      competencia: '2026-09',
      status: 'FECHADO',
      fechadoEm: new Date('2026-10-01T10:00:00Z'),
      fechadoPor: userRh.id,
      observacao: 'Competência Setembro/2026 homologada'
    }
  });

  // 6. Benefícios Corporativos (Fase 7)
  await prisma.beneficioColaborador.upsert({
    where: { id: 'ben-vr-ana' },
    update: {},
    create: {
      id: 'ben-vr-ana',
      colaboradorId: colabAna.id,
      tipo: 'VALE_REFEICAO',
      operadora: 'Pluxee / Sodexo',
      valorMensal: 770.00,
      descontoEmFolha: 77.00,
      cartaoNumero: '4432',
      status: 'ATIVO'
    }
  });

  await prisma.beneficioColaborador.upsert({
    where: { id: 'ben-vt-ana' },
    update: {},
    create: {
      id: 'ben-vt-ana',
      colaboradorId: colabAna.id,
      tipo: 'VALE_TRANSPORTE',
      operadora: 'URBS Curitiba',
      valorMensal: 330.00,
      descontoEmFolha: 252.00,
      cartaoNumero: '9812-4412-00',
      status: 'ATIVO'
    }
  });

  // 7. Folha de Pagamento & Holerite (Fase 8)
  const folha = await prisma.folhaPagamento.upsert({
    where: { competencia: '2026-09' },
    update: {},
    create: {
      id: 'folha-202609',
      competencia: '2026-09',
      status: 'PAGA',
      totalColaboradores: 2,
      totalProventos: 9000.00,
      totalDescontos: 1720.00,
      totalLiquido: 7280.00,
      totalEncargosEmpresa: 1512.00,
      fechadaEm: new Date('2026-10-01T15:00:00Z'),
      fechadaPor: userRh.id,
      lotePixId: 'LOTE-PIX-FOLHA-202609'
    }
  });

  await prisma.holerite.upsert({
    where: { id: 'hol-ana-202609' },
    update: {},
    create: {
      id: 'hol-ana-202609',
      folhaId: folha.id,
      colaboradorId: colabAna.id,
      competencia: '2026-09',
      salarioBase: 4200.00,
      totalVencimentos: 4486.36,
      totalDescontos: 835.42,
      valorLiquido: 3650.94,
      baseINSS: 4486.36,
      baseIRRF: 3995.12,
      baseFGTS: 4486.36,
      fgtsRecolher: 358.91,
      rubricas: [
        { codigo: '001', descricao: 'Salário Base', tipo: 'PROVENTO', valor: 4200.00 },
        { codigo: '015', descricao: 'Horas Extras 50%', tipo: 'PROVENTO', valor: 238.64 },
        { codigo: '020', descricao: 'DSR Horas Extras', tipo: 'PROVENTO', valor: 47.72 },
        { codigo: '101', descricao: 'INSS Folha', tipo: 'DESCONTO', valor: 491.24 },
        { codigo: '102', descricao: 'IRRF s/ Salário', tipo: 'DESCONTO', valor: 175.18 },
        { codigo: '201', descricao: 'Desconto VT (6%)', tipo: 'DESCONTO', valor: 252.00 }
      ]
    }
  });

  // 8. Staff de Evento (Fase 9)
  await prisma.diariaStaffEvento.upsert({
    where: { id: 'dia-staff-carlos' },
    update: {},
    create: {
      id: 'dia-staff-carlos',
      eventoId: 'evt-curitiba-rock',
      eventoNome: 'Festival Curitiba Rock 2026',
      localId: arena.id,
      localNome: arena.nome,
      data: hoje,
      colaboradorId: colabCarlos.id,
      nomeProfissional: colabCarlos.nome,
      cpf: colabCarlos.cpf,
      funcao: 'COORDENADOR_BILHETERIA',
      valorDiaria: 250.00,
      valorTransporte: 40.00,
      valorAlimentacao: 50.00,
      valorTotal: 340.00,
      status: 'APROVADO_PAGAMENTO',
      chavePix: colabCarlos.cpf
    }
  });

  // 9. Evento eSocial (Fase 10)
  await prisma.eventoESocial.upsert({
    where: { identificador: 'ID1078901230001992026100108000000001' },
    update: {},
    create: {
      id: 'esoc-seed-01',
      tipo: 'S_1000',
      identificador: 'ID1078901230001992026100108000000001',
      reciboEntrega: '1.2.202610.000000000001234567',
      status: 'TRANSMITIDO'
    }
  });

  console.log('✓ Seed completo executado com sucesso para as Fases 1 a 10!');
}

main()
  .catch((e) => {
    console.error('Erro no seed Prisma:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
