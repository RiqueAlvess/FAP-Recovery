import { LIMITE_CARACTERES_CONTESTACAO } from '@/domain/contestation';
import { buscarDivergenciaPorCodigo } from '@/domain/catalogo-divergencias';
import type { DadosEmpresaParaMinuta, Divergencia } from './types';

function montarCabecalho(dados: DadosEmpresaParaMinuta): string {
  return (
    `${dados.razaoSocial}, CNPJ ${dados.cnpj}, estabelecimento enquadrado na subclasse CNAE ${dados.cnaeSubclasse}, ` +
    `vem, respeitosamente, apresentar CONTESTAÇÃO ao Fator Acidentário de Prevenção (FAP) atribuído para o ano de ` +
    `vigência ${dados.anoVigencia}, com fundamento no art. 10 da Lei 10.666/2003 e na Resolução CNPS nº 1.316/2010, ` +
    `pelos fatos e fundamentos a seguir expostos.\n\nDOS FATOS E FUNDAMENTOS`
  );
}

function montarParagrafo(indice: number, divergencia: Divergencia): string {
  const catalogo = buscarDivergenciaPorCodigo(divergencia.codigo);
  const titulo = catalogo?.titulo ?? divergencia.codigo;
  const referencia =
    divergencia.registroExtrato.nomeTrabalhador ?? divergencia.registroExtrato.nit ?? divergencia.registroExtrato.id;

  return (
    `${indice}. [${divergencia.codigo} - ${titulo}] Registro de ${referencia}: ${divergencia.justificativa} ` +
    `Fundamentação: ${divergencia.fundamentacaoLegal}`
  );
}

function montarPedido(): string {
  return (
    'DO PEDIDO\n\nDiante do exposto, requer-se a retificação dos registros indicados e o recálculo do índice FAP ' +
    'do estabelecimento, com a consequente correção da contribuição ao Seguro Acidente do Trabalho (RAT/FAP) do ' +
    'período de vigência informado.\n\nTermos em que pede deferimento.'
  );
}

function montarNotaOmissao(excluidas: Divergencia[]): string {
  if (excluidas.length === 0) return '';
  const codigos = excluidas.map((d) => d.codigo).join(', ');
  return (
    `\n\n[Aviso: ${excluidas.length} divergência(s) não incluída(s) nesta minuta por limite de ` +
    `${LIMITE_CARACTERES_CONTESTACAO} caracteres: ${codigos}. Recomenda-se protocolo complementar ou edição manual.]`
  );
}

function montarTexto(cabecalho: string, paragrafos: string[], pedido: string, excluidas: Divergencia[]): string {
  const corpo = paragrafos.length > 0 ? paragrafos.join('\n') : '(nenhuma divergência confirmada informada)';
  return `${cabecalho}\n\n${corpo}\n\n${pedido}${montarNotaOmissao(excluidas)}`;
}

/**
 * Monta a minuta de contestação a partir das divergências confirmadas,
 * respeitando o limite HARD de `LIMITE_CARACTERES_CONTESTACAO` (5.000,
 * conforme regra da janela eletrônica de contestação — ver
 * src/domain/contestation/rules.ts). Quando o texto completo estouraria o
 * limite, as divergências são priorizadas por `impactoEstimadoCentavos`
 * decrescente e o texto final avisa explicitamente quais ficaram de fora.
 */
export function gerarMinutaContestacao(divergenciasConfirmadas: Divergencia[], dadosEmpresa: DadosEmpresaParaMinuta): string {
  const ordenadas = [...divergenciasConfirmadas].sort((a, b) => b.impactoEstimadoCentavos - a.impactoEstimadoCentavos);
  const cabecalho = montarCabecalho(dadosEmpresa);
  const pedido = montarPedido();

  const paragrafosIncluidos: string[] = [];
  let quantidadeIncluida = 0;

  for (const divergencia of ordenadas) {
    const paragrafo = montarParagrafo(quantidadeIncluida + 1, divergencia);
    const candidatoParagrafos = [...paragrafosIncluidos, paragrafo];
    const excluidasSeParar = ordenadas.slice(quantidadeIncluida + 1);
    const candidato = montarTexto(cabecalho, candidatoParagrafos, pedido, excluidasSeParar);

    if (candidato.length > LIMITE_CARACTERES_CONTESTACAO) break;

    paragrafosIncluidos.push(paragrafo);
    quantidadeIncluida += 1;
  }

  const excluidas = ordenadas.slice(quantidadeIncluida);
  const textoFinal = montarTexto(cabecalho, paragrafosIncluidos, pedido, excluidas);

  return textoFinal.length > LIMITE_CARACTERES_CONTESTACAO ? textoFinal.slice(0, LIMITE_CARACTERES_CONTESTACAO) : textoFinal;
}
