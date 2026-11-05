/**
 * Motor de Elegibilidade Canônico de Repasse — Disk Ingressos
 * Regra: Vendas Realizadas >= 50% da Meta -> Libera até 20% do Bruto Elegível.
 * Parametrizável sem hardcode. Suporte a Autorização Excepcional Administrativa da Mesa Disk.
 */

export function calcularElegibilidade({
  metaVendas = 0,
  vendasRealizadas = 0,
  repassesRealizados = 0,
  valoresBloqueados = 0,
  politica = {},
  autorizacaoExcepcional = null
}) {
  const percentualMinimoVendas = Number(politica.percentualMinimoVendas ?? 50);
  const percentualLiberacao = Number(politica.percentualLiberacao ?? 20);

  const percentualVendido = metaVendas > 0 ? (vendasRealizadas / metaVendas) * 100 : 0;
  const regraAtingida = percentualVendido >= percentualMinimoVendas;

  const vendasNecessarias = metaVendas * (percentualMinimoVendas / 100);
  const faltamVendas = regraAtingida ? 0 : Math.max(0, vendasNecessarias - vendasRealizadas);

  const limiteBruto = regraAtingida ? (vendasRealizadas * (percentualLiberacao / 100)) : 0;
  const totalDeducoes = repassesRealizados + valoresBloqueados;
  const disponivelPadrao = Math.max(0, limiteBruto - totalDeducoes);

  const isExcepcional = Boolean(autorizacaoExcepcional && autorizacaoExcepcional.status === 'ATIVA' && !autorizacaoExcepcional.consumida);
  let disponivelFinal = disponivelPadrao;

  if (isExcepcional) {
    disponivelFinal = Math.max(0, Number(autorizacaoExcepcional.valor) - totalDeducoes);
  }

  return {
    metaVendas,
    vendasRealizadas,
    percentualVendido: Math.round(percentualVendido * 100) / 100,
    percentualMinimoVendas,
    percentualLiberacao,
    regraAtingida,
    faltamVendas: Math.round(faltamVendas * 100) / 100,
    limiteBruto: Math.round(limiteBruto * 100) / 100,
    repassesRealizados,
    valoresBloqueados,
    totalDeducoes,
    disponivelPadrao: Math.round(disponivelPadrao * 100) / 100,
    disponivel: Math.round(disponivelFinal * 100) / 100,
    isExcepcional,
    autorizacaoExcepcional: isExcepcional ? autorizacaoExcepcional : null,
    status: isExcepcional ? 'EXCECAO_AUTORIZADA' : (regraAtingida ? 'HABILITADO' : 'BLOQUEADO')
  };
}
