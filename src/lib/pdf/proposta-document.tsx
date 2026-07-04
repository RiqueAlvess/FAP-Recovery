import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatBRLFromCentavos, formatDateBR, formatFapFromDecimal } from '@/lib/format';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1e293b' },
  logoBox: {
    width: 120,
    height: 32,
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoText: { fontSize: 8, color: '#64748b' },
  h1: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  h2: { fontSize: 13, fontWeight: 700, marginTop: 20, marginBottom: 8 },
  subtitle: { fontSize: 11, color: '#475569', marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metricBox: { width: '31%', padding: 10, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4 },
  metricLabel: { fontSize: 8, color: '#64748b', marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: 700 },
  metricValueSuccess: { fontSize: 16, fontWeight: 700, color: '#047857' },
  p: { fontSize: 10, lineHeight: 1.5, marginBottom: 8 },
  table: { marginTop: 8 },
  tableRowHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 4 },
  colCodigo: { width: '15%', fontSize: 9 },
  colTitulo: { width: '45%', fontSize: 9 },
  colSeveridade: { width: '20%', fontSize: 9 },
  colImpacto: { width: '20%', fontSize: 9, textAlign: 'right' },
  headerCell: { fontSize: 8, fontWeight: 700, color: '#475569' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#94a3b8' },
  disclaimer: { fontSize: 8, color: '#64748b', lineHeight: 1.4, marginTop: 16, padding: 10, backgroundColor: '#f8fafc' },
  li: { fontSize: 10, marginBottom: 6, lineHeight: 1.4 },
});

export interface DivergenciaResumoPdf {
  codigo: string;
  titulo: string;
  severidade: string;
  impactoEstimadoCentavos: number;
}

export interface PropostaDocumentProps {
  razaoSocial: string;
  cnpj: string;
  cnaeSubclasse: string;
  anoVigencia: number;
  fapAtual: number;
  fapSimulado: number;
  economiaAnualCentavos: number;
  creditoRetroativoCentavos: number;
  honorarioProjetadoCentavos: number;
  percentualExito: number;
  divergencias: DivergenciaResumoPdf[];
  geradoEm: Date;
}

const ROTULOS_SEVERIDADE: Record<string, string> = { ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' };

export function PropostaDocument(props: PropostaDocumentProps) {
  const totalGeral = props.economiaAnualCentavos + props.creditoRetroativoCentavos;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>[ LOGOTIPO ]</Text>
        </View>

        <Text style={styles.h1}>Proposta de Recuperação de Créditos — FAP</Text>
        <Text style={styles.subtitle}>
          {props.razaoSocial} · CNPJ {props.cnpj} · CNAE {props.cnaeSubclasse} · ano de vigência {props.anoVigencia}
        </Text>

        <Text style={styles.h2}>Resumo executivo</Text>
        <Text style={styles.p}>
          Com base no diagnóstico das divergências identificadas no extrato oficial do FAP, projetamos a seguinte
          oportunidade de economia e recuperação de créditos para o estabelecimento acima:
        </Text>

        <View style={styles.row}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>FAP atual para simulado</Text>
            <Text style={styles.metricValue}>
              {formatFapFromDecimal(props.fapAtual)} {'->'} {formatFapFromDecimal(props.fapSimulado)}
            </Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Economia anual estimada</Text>
            <Text style={styles.metricValueSuccess}>{formatBRLFromCentavos(props.economiaAnualCentavos)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Crédito retroativo estimado</Text>
            <Text style={styles.metricValueSuccess}>{formatBRLFromCentavos(props.creditoRetroativoCentavos)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Total geral estimado (economia + retroativo)</Text>
            <Text style={styles.metricValueSuccess}>{formatBRLFromCentavos(totalGeral)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Honorário por êxito ({props.percentualExito}%)</Text>
            <Text style={styles.metricValue}>{formatBRLFromCentavos(props.honorarioProjetadoCentavos)}</Text>
          </View>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Divergências consideradas</Text>
            <Text style={styles.metricValue}>{props.divergencias.length}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Proposta gerada em {formatDateBR(props.geradoEm)} · página 1 de 3</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Divergências identificadas</Text>
        <Text style={styles.p}>
          Cada item abaixo corresponde a uma divergência detectada entre o extrato oficial do FAP e os registros
          internos do estabelecimento, com fundamentação legal própria. Detalhes de registros e trabalhadores
          identificados constam apenas no dossiê técnico interno.
        </Text>

        <View style={styles.table}>
          <View style={styles.tableRowHeader}>
            <Text style={[styles.headerCell, styles.colCodigo]}>Código</Text>
            <Text style={[styles.headerCell, styles.colTitulo]}>Divergência</Text>
            <Text style={[styles.headerCell, styles.colSeveridade]}>Severidade</Text>
            <Text style={[styles.headerCell, styles.colImpacto]}>Impacto estimado</Text>
          </View>
          {props.divergencias.map((d) => (
            <View style={styles.tableRow} key={d.codigo + d.titulo}>
              <Text style={styles.colCodigo}>{d.codigo}</Text>
              <Text style={styles.colTitulo}>{d.titulo}</Text>
              <Text style={styles.colSeveridade}>{ROTULOS_SEVERIDADE[d.severidade] ?? d.severidade}</Text>
              <Text style={styles.colImpacto}>{formatBRLFromCentavos(d.impactoEstimadoCentavos)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Proposta gerada em {formatDateBR(props.geradoEm)} · página 2 de 3</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Próximos passos</Text>
        <Text style={styles.li}>1. Assinatura do contrato de honorário por êxito ({props.percentualExito}% sobre o valor recuperado/economizado).</Text>
        <Text style={styles.li}>
          2. Reunião técnica para validação das evidências (PPP, laudos, eSocial/GFIP) que fundamentam cada
          divergência confirmada.
        </Text>
        <Text style={styles.li}>
          3. Protocolo da contestação do índice FAP na janela eletrônica (01 a 30 de novembro), quando aplicável.
        </Text>
        <Text style={styles.li}>
          4. Apuração e protocolo do PER/DCOMP para recuperação retroativa dos créditos dos últimos 5 anos.
        </Text>
        <Text style={styles.li}>5. Acompanhamento do julgamento e eventual recurso administrativo.</Text>

        <Text style={styles.h2}>Disclaimer</Text>
        <Text style={styles.disclaimer}>
          Os valores desta proposta são estimativas obtidas por aproximação técnica a partir dos registros
          disponíveis no momento do diagnóstico, sem acesso aos dados completos da subclasse CNAE utilizados pela
          Previdência Social para o cálculo oficial do FAP. Os números finais de economia e crédito retroativo
          dependem da confirmação das divergências por evidência documental, do resultado do julgamento
          administrativo da contestação e/ou da homologação da compensação/restituição pela Receita Federal,
          podendo variar para mais ou para menos em relação ao aqui projetado.
        </Text>

        <Text style={styles.footer}>Proposta gerada em {formatDateBR(props.geradoEm)} · página 3 de 3</Text>
      </Page>
    </Document>
  );
}
