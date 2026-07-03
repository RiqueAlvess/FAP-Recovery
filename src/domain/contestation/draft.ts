import { buscarDivergenciaPorCodigo } from '../divergences/catalog';
import { LIMITE_CARACTERES_CONTESTACAO } from './rules';

export interface ItemMinuta {
  codigo: string;
  referencia: string;
  detalhe: string;
}

/**
 * Gera a minuta de contestação eletrônica (FAPWeb): campo de texto puro, sem
 * anexos, limitado a LIMITE_CARACTERES_CONTESTACAO caracteres. Quando as
 * divergências não cabem no limite, as excedentes são sinalizadas em vez de
 * cortadas no meio de um item.
 */
export function gerarMinutaContestacao(itens: ItemMinuta[], limite = LIMITE_CARACTERES_CONTESTACAO): string {
  const cabecalho = 'CONTESTAÇÃO AO ÍNDICE FAP\n\n';
  let texto = cabecalho;
  let incluidos = 0;

  for (const item of itens) {
    const catalogo = buscarDivergenciaPorCodigo(item.codigo);
    const titulo = catalogo ? `${item.codigo} - ${catalogo.descricao}` : item.codigo;
    const fundamentacao = catalogo ? ` Fundamentação: ${catalogo.fundamentacaoLegal}` : '';
    const paragrafo = `${incluidos + 1}. [${titulo}] ${item.detalhe}.${fundamentacao}`;
    const candidato = incluidos === 0 ? texto + paragrafo : `${texto}\n${paragrafo}`;

    const restantesSeParar = itens.length - incluidos - 1;
    const rodapeSeParar =
      restantesSeParar > 0 ? `\n[...] +${restantesSeParar} divergência(s) omitida(s) por limite de caracteres.` : '';

    if (candidato.length + rodapeSeParar.length > limite) {
      const totalOmitidas = itens.length - incluidos;
      const textoComRodape = `${texto}\n[...] +${totalOmitidas} divergência(s) omitida(s) por limite de caracteres.`;
      return textoComRodape.slice(0, limite);
    }

    texto = candidato;
    incluidos += 1;
  }

  return texto.length > limite ? texto.slice(0, limite) : texto;
}
