import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatBRLFromCentavos, formatDateBR } from '@/lib/format';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#1e293b' },
  h1: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#475569', marginBottom: 4 },
  aviso: { fontSize: 8, color: '#64748b', marginBottom: 16 },
  card: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, padding: 10, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  codigo: { fontSize: 10, fontWeight: 700, color: '#1e40af' },
  severidade: { fontSize: 8, fontWeight: 700 },
  titulo: { fontSize: 10, fontWeight: 700, marginBottom: 4 },
  descricao: { fontSize: 9, lineHeight: 1.4, marginBottom: 6 },
  secaoLabel: { fontSize: 8, fontWeight: 700, color: '#475569', marginTop: 6, marginBottom: 2, textTransform: 'uppercase' },
  texto: { fontSize: 9, lineHeight: 1.4 },
  duasColunas: { flexDirection: 'row', gap: 12, marginTop: 6 },
  coluna: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 4, padding: 8 },
  colunaTitulo: { fontSize: 8, fontWeight: 700, color: '#475569', marginBottom: 4 },
  linhaCampo: { flexDirection: 'row', marginBottom: 2 },
  campoLabel: { fontSize: 8, color: '#64748b', width: 70 },
  campoValor: { fontSize: 8, color: '#1e293b', flex: 1 },
  itemEvidencia: { fontSize: 9, marginBottom: 2 },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, fontSize: 8, color: '#94a3b8' },
  impacto: { fontSize: 10, fontWeight: 700 },
});

const CORES_SEVERIDADE: Record<string, string> = { ALTA: '#b91c1c', MEDIA: '#b45309', BAIXA: '#475569' };
const ROTULOS_SEVERIDADE: Record<string, string> = { ALTA: 'ALTA', MEDIA: 'MÉDIA', BAIXA: 'BAIXA' };

export interface RegistroResumoPdf {
  tipo: string;
  nit: string | null;
  nomeTrabalhador: string | null;
  matricula?: string | null;
  especieBeneficio?: string | null;
  cid?: string | null;
  dataInicio?: Date | null;
  dataFim?: Date | null;
  dataAdmissao?: Date | null;
  dataDesligamento?: Date | null;
  valorCentavos?: number | null;
}

export interface ItemDossiePdf {
  codigo: string;
  titulo: string;
  descricao: string;
  fundamentacaoLegal: string;
  evidenciaNecessaria: string[];
  severidade: string;
  impactoEstimadoCentavos: number;
  justificativa: string;
  registroExtrato: RegistroResumoPdf;
  registroInterno: RegistroResumoPdf | null;
}

export interface DossieDocumentProps {
  razaoSocial: string;
  cnpj: string;
  cnaeSubclasse: string;
  anoVigencia: number;
  itens: ItemDossiePdf[];
  geradoEm: Date;
}

function linhaRegistro(label: string, valor: string | null | undefined) {
  if (!valor) return null;
  return (
    <View style={styles.linhaCampo}>
      <Text style={styles.campoLabel}>{label}</Text>
      <Text style={styles.campoValor}>{valor}</Text>
    </View>
  );
}

function RegistroExtratoBloco({ registro }: { registro: RegistroResumoPdf }) {
  return (
    <View style={styles.coluna}>
      <Text style={styles.colunaTitulo}>REGISTRO DO EXTRATO</Text>
      {linhaRegistro('Tipo', registro.especieBeneficio ? `${registro.tipo} (${registro.especieBeneficio})` : registro.tipo)}
      {linhaRegistro('NIT', registro.nit)}
      {linhaRegistro('Trabalhador', registro.nomeTrabalhador)}
      {linhaRegistro('CID', registro.cid)}
      {linhaRegistro('Data início', registro.dataInicio ? formatDateBR(registro.dataInicio) : null)}
      {linhaRegistro('Data fim', registro.dataFim ? formatDateBR(registro.dataFim) : null)}
      {linhaRegistro('Valor', registro.valorCentavos ? formatBRLFromCentavos(registro.valorCentavos) : null)}
    </View>
  );
}

function RegistroInternoBloco({ registro }: { registro: RegistroResumoPdf | null }) {
  return (
    <View style={styles.coluna}>
      <Text style={styles.colunaTitulo}>REGISTRO INTERNO</Text>
      {registro ? (
        <>
          {linhaRegistro('Tipo', registro.tipo)}
          {linhaRegistro('NIT', registro.nit)}
          {linhaRegistro('Trabalhador', registro.nomeTrabalhador)}
          {linhaRegistro('Matrícula', registro.matricula)}
          {linhaRegistro('Admissão', registro.dataAdmissao ? formatDateBR(registro.dataAdmissao) : null)}
          {linhaRegistro('Desligamento', registro.dataDesligamento ? formatDateBR(registro.dataDesligamento) : null)}
        </>
      ) : (
        <Text style={styles.texto}>Sem correspondência nos registros internos.</Text>
      )}
    </View>
  );
}

function CardDivergencia({ item, indice }: { item: ItemDossiePdf; indice: number }) {
  return (
    <View style={styles.card} wrap={false}>
      <View style={styles.cardHeader}>
        <Text style={styles.codigo}>
          {indice}. {item.codigo}
        </Text>
        <Text style={[styles.impacto, { color: '#047857' }]}>{formatBRLFromCentavos(item.impactoEstimadoCentavos)}</Text>
        <Text style={[styles.severidade, { color: CORES_SEVERIDADE[item.severidade] ?? '#475569' }]}>
          Severidade: {ROTULOS_SEVERIDADE[item.severidade] ?? item.severidade}
        </Text>
      </View>

      <Text style={styles.titulo}>{item.titulo}</Text>
      <Text style={styles.descricao}>{item.descricao}</Text>

      <Text style={styles.secaoLabel}>Fundamentação legal</Text>
      <Text style={styles.texto}>{item.fundamentacaoLegal}</Text>

      <Text style={styles.secaoLabel}>Justificativa registrada</Text>
      <Text style={styles.texto}>{item.justificativa}</Text>

      <View style={styles.duasColunas}>
        <RegistroExtratoBloco registro={item.registroExtrato} />
        <RegistroInternoBloco registro={item.registroInterno} />
      </View>

      <Text style={styles.secaoLabel}>Evidência necessária (pendente de anexação)</Text>
      {item.evidenciaNecessaria.map((evidencia) => (
        <Text key={evidencia} style={styles.itemEvidencia}>
          {'[ ] '} {evidencia}
        </Text>
      ))}
    </View>
  );
}

export function DossieDocument({ razaoSocial, cnpj, cnaeSubclasse, anoVigencia, itens, geradoEm }: DossieDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.h1}>Dossiê de Evidências — Revisão Jurídica</Text>
        <Text style={styles.subtitle}>
          {razaoSocial} · CNPJ {cnpj} · CNAE {cnaeSubclasse} · ano de vigência {anoVigencia}
        </Text>
        <Text style={styles.aviso}>
          Documento interno de trabalho, não destinado ao cliente. Contém dados de trabalhadores identificados e
          detalhes técnicos de cada divergência confirmada, para validação da equipe jurídica antes do protocolo da
          contestação.
        </Text>

        {itens.length === 0 ? (
          <Text style={styles.texto}>Nenhuma divergência confirmada neste ciclo até o momento.</Text>
        ) : (
          itens.map((item, i) => <CardDivergencia key={`${item.codigo}-${i}`} item={item} indice={i + 1} />)
        )}

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Dossiê gerado em ${formatDateBR(geradoEm)} · página ${pageNumber} de ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}
