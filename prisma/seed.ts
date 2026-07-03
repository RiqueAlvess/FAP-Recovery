import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function data(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

interface Trabalhador {
  nome: string;
  nit: string;
  matricula: string;
}

// 22 trabalhadores reais na folha do estabelecimento + 1 "fantasma" (NIT que
// aparece no extrato oficial mas não existe nos registros internos).
const TRABALHADORES: Trabalhador[] = [
  { nome: 'Antonio Carlos Ferreira', nit: '10011122233', matricula: 'MAT-0001' },
  { nome: 'Bruno Henrique Souza', nit: '10011122234', matricula: 'MAT-0002' },
  { nome: 'Carlos Eduardo Lima', nit: '10011122235', matricula: 'MAT-0003' },
  { nome: 'Daniel Rodrigues Alves', nit: '10011122236', matricula: 'MAT-0004' },
  { nome: 'Eduardo Santos Pereira', nit: '10011122237', matricula: 'MAT-0005' },
  { nome: 'Felipe Augusto Costa', nit: '10011122238', matricula: 'MAT-0006' },
  { nome: 'Gabriel Nunes Barbosa', nit: '10011122239', matricula: 'MAT-0007' },
  { nome: 'Hugo Martins Ribeiro', nit: '10011122240', matricula: 'MAT-0008' },
  { nome: 'Igor Cardoso Teixeira', nit: '10011122241', matricula: 'MAT-0009' },
  { nome: 'João Paulo Mendes', nit: '10011122242', matricula: 'MAT-0010' },
  { nome: 'Kleber Vieira Rocha', nit: '10011122243', matricula: 'MAT-0011' },
  { nome: 'Leonardo Dias Correia', nit: '10011122244', matricula: 'MAT-0012' },
  { nome: 'Marcos Vinicius Araujo', nit: '10011122245', matricula: 'MAT-0013' },
  { nome: 'Nelson Batista Gomes', nit: '10011122246', matricula: 'MAT-0014' }, // CAT duplicada
  { nome: 'Otavio Freitas Cunha', nit: '10011122247', matricula: 'MAT-0015' },
  { nome: 'Paulo Roberto Castro', nit: '10011122248', matricula: 'MAT-0016' },
  { nome: 'Rafael Moreira Duarte', nit: '10011122249', matricula: 'MAT-0017' }, // B91 suspeito (NTEP)
  { nome: 'Sergio Luis Farias', nit: '10011122250', matricula: 'MAT-0018' },
  { nome: 'Vitor Hugo Ramos', nit: '10011122252', matricula: 'MAT-0020' },
  { nome: 'Wagner Luiz Barros', nit: '10011122253', matricula: 'MAT-0021' },
  { nome: 'Xavier Antunes Melo', nit: '10011122254', matricula: 'MAT-0022' },
  { nome: 'Yuri Camargo Silveira', nit: '10011122255', matricula: 'MAT-0023' },
];

const TRABALHADOR_FANTASMA = { nome: 'Thiago Nogueira Pinto', nit: '99988877766' };

const PERIODO_BASE = { inicio: data(2023, 1, 1), fim: data(2024, 12, 31) };

async function main() {
  await prisma.divergencia.deleteMany();
  await prisma.contestacao.deleteMany();
  await prisma.registroExtrato.deleteMany();
  await prisma.registroInterno.deleteMany();
  await prisma.cicloFap.deleteMany();
  await prisma.estabelecimento.deleteMany();
  await prisma.cliente.deleteMany();

  const cliente = await prisma.cliente.create({
    data: {
      razaoSocial: 'Construtora Horizonte Sul Ltda.',
      cnpjRaiz: '12345678',
      contatoNome: 'Marcos Andrade',
      contatoEmail: 'marcos.andrade@construtorahorizontesul.com.br',
      percentualExito: 25,
      estagio: 'DIAGNOSTICO',
    },
  });

  const estabelecimento = await prisma.estabelecimento.create({
    data: {
      clienteId: cliente.id,
      cnpj: '12.345.678/0001-90',
      cnaeSubclasse: '41.20-4-00', // Construção de edifícios
      aliquotaRat: 3,
      folhaMediaMensalCentavos: 75_000_000, // R$ 750.000,00/mês
    },
  });

  const ciclo = await prisma.cicloFap.create({
    data: {
      estabelecimentoId: estabelecimento.id,
      anoVigencia: 2025,
      fapAtribuido: 11_850, // FAP 1,1850
      indiceFrequencia: 0.64,
      indiceGravidade: 0.71,
      indiceCusto: 0.68,
      status: 'IMPORTADO',
    },
  });

  // ---- RegistroExtrato ---------------------------------------------------

  const catsExtrato = TRABALHADORES.slice(0, 14).map((t, i) => ({
    cicloFapId: ciclo.id,
    tipo: 'CAT',
    nit: t.nit,
    nomeTrabalhador: t.nome,
    dataInicio: data(2023 + Math.floor(i / 8), (i % 12) + 1, 5 + (i % 20)),
    valorCentavos: 0,
    dadosBrutosJson: JSON.stringify({ matricula: t.matricula, nit: t.nit, nome: t.nome, tipoRegistro: 'CAT' }),
  }));

  // DIV-001: CAT duplicada — mesma matrícula/data de Nelson Batista Gomes repetida no extrato.
  const nelson = TRABALHADORES[13]!;
  const dataCatNelson = data(2024, 3, 10);
  catsExtrato[13] = { ...catsExtrato[13]!, dataInicio: dataCatNelson };
  const catDuplicadaNelson = {
    cicloFapId: ciclo.id,
    tipo: 'CAT',
    nit: nelson.nit,
    nomeTrabalhador: nelson.nome,
    dataInicio: dataCatNelson,
    valorCentavos: 0,
    dadosBrutosJson: JSON.stringify({
      matricula: nelson.matricula,
      nit: nelson.nit,
      nome: nelson.nome,
      tipoRegistro: 'CAT',
      observacao: 'linha duplicada no extrato oficial',
    }),
  };

  const cidsAcidenteTrabalho = ['S82.9', 'M54.5', 'S62.1', 'S93.4', 'M75.1', 'S42.0', 'S91.3', 'S83.2'];
  const beneficiosB91Cat = TRABALHADORES.slice(0, 8).map((t, i) => ({
    cicloFapId: ciclo.id,
    tipo: 'BENEFICIO',
    nit: t.nit,
    nomeTrabalhador: t.nome,
    especieBeneficio: 'B91',
    cid: cidsAcidenteTrabalho[i],
    dataInicio: catsExtrato[i]!.dataInicio,
    dataFim: null,
    valorCentavos: 180_000 + i * 5_000, // ~R$ 1.800,00/mês de benefício
    dadosBrutosJson: JSON.stringify({ matricula: t.matricula, nit: t.nit, especie: 'B91', cid: cidsAcidenteTrabalho[i] }),
  }));

  const igor = TRABALHADORES[8]!;
  const beneficioB92Igor = {
    cicloFapId: ciclo.id,
    tipo: 'BENEFICIO',
    nit: igor.nit,
    nomeTrabalhador: igor.nome,
    especieBeneficio: 'B92',
    cid: 'S14.1', // lesão medular — invalidez permanente
    dataInicio: data(2023, 9, 12),
    dataFim: null,
    valorCentavos: 320_000,
    dadosBrutosJson: JSON.stringify({ matricula: igor.matricula, nit: igor.nit, especie: 'B92', cid: 'S14.1' }),
  };

  // DIV-003: B91 "suspeito" — CID de transtorno depressivo (F32.1) sem relação
  // plausível com o risco da construção civil, indicando NTEP questionável.
  const rafael = TRABALHADORES[16]!;
  const beneficioB91Suspeito = {
    cicloFapId: ciclo.id,
    tipo: 'BENEFICIO',
    nit: rafael.nit,
    nomeTrabalhador: rafael.nome,
    especieBeneficio: 'B91',
    cid: 'F32.1',
    dataInicio: data(2024, 6, 3),
    dataFim: null,
    valorCentavos: 210_000,
    dadosBrutosJson: JSON.stringify({
      matricula: rafael.matricula,
      nit: rafael.nit,
      especie: 'B91',
      cid: 'F32.1',
      observacao: 'NTEP aplicado sem nexo técnico plausível com o CNAE',
    }),
  };

  // DIV-002: benefício de trabalhador sem vínculo — NIT não existe em nenhum RegistroInterno.
  const beneficioSemVinculo = {
    cicloFapId: ciclo.id,
    tipo: 'BENEFICIO',
    nit: TRABALHADOR_FANTASMA.nit,
    nomeTrabalhador: TRABALHADOR_FANTASMA.nome,
    especieBeneficio: 'B91',
    cid: 'S92.3',
    dataInicio: data(2024, 8, 20),
    dataFim: null,
    valorCentavos: 195_000,
    dadosBrutosJson: JSON.stringify({
      nit: TRABALHADOR_FANTASMA.nit,
      especie: 'B91',
      cid: 'S92.3',
      observacao: 'NIT não consta na folha nem no eSocial da empresa',
    }),
  };

  // DIV-006: massa salarial do extrato diverge da folha interna.
  const massaSalarialExtrato = {
    cicloFapId: ciclo.id,
    tipo: 'MASSA_SALARIAL',
    dataInicio: PERIODO_BASE.inicio,
    dataFim: PERIODO_BASE.fim,
    valorCentavos: 900_000_000, // R$ 9.000.000,00 declarados no extrato
    dadosBrutosJson: JSON.stringify({ origem: 'extrato_fapweb', valor: 9_000_000.0 }),
  };

  const vinculosResumoExtrato = TRABALHADORES.slice(19, 22).map((t) => ({
    cicloFapId: ciclo.id,
    tipo: 'VINCULO',
    nit: t.nit,
    nomeTrabalhador: t.nome,
    dataInicio: data(2022, 5, 2),
    dadosBrutosJson: JSON.stringify({ matricula: t.matricula, nit: t.nit }),
  }));

  const registrosExtrato = [
    ...catsExtrato.slice(0, 13),
    catsExtrato[13]!,
    catDuplicadaNelson,
    ...beneficiosB91Cat,
    beneficioB92Igor,
    beneficioB91Suspeito,
    beneficioSemVinculo,
    massaSalarialExtrato,
    ...vinculosResumoExtrato,
  ];

  const extratoCriados = [];
  for (const registro of registrosExtrato) {
    extratoCriados.push(await prisma.registroExtrato.create({ data: registro }));
  }

  // ---- RegistroInterno ----------------------------------------------------

  const vinculosInternos = TRABALHADORES.map((t) => ({
    cicloFapId: ciclo.id,
    tipo: 'VINCULO',
    nit: t.nit,
    nomeTrabalhador: t.nome,
    matricula: t.matricula,
    dataAdmissao: data(2021, 3, 15),
    dataDesligamento: null,
    dadosBrutosJson: JSON.stringify({ matricula: t.matricula, nit: t.nit, status: 'ativo' }),
  }));
  // Observação: TRABALHADOR_FANTASMA (NIT 99988877766) NÃO recebe registro
  // interno — é exatamente essa ausência que caracteriza a DIV-002.

  const antonio = TRABALHADORES[0]!;
  const carlos = TRABALHADORES[2]!;
  const catsInternos = [antonio, carlos].map((t) => ({
    cicloFapId: ciclo.id,
    tipo: 'CAT',
    nit: t.nit,
    nomeTrabalhador: t.nome,
    matricula: t.matricula,
    dataAdmissao: data(2021, 3, 15),
    dataDesligamento: null,
    dadosBrutosJson: JSON.stringify({ matricula: t.matricula, nit: t.nit, origem: 'registro_interno_cat' }),
  }));

  const massaSalarialInterna = {
    cicloFapId: ciclo.id,
    tipo: 'MASSA_SALARIAL',
    dataAdmissao: null,
    dataDesligamento: null,
    dadosBrutosJson: JSON.stringify({ origem: 'folha_esocial', valor: 8_700_000.0 }),
  };
  // valorCentavos não existe em RegistroInterno — o valor da massa salarial
  // interna fica registrado em dadosBrutosJson (R$ 8.700.000,00), divergente
  // do extrato (R$ 9.000.000,00) — DIV-006.

  const registrosInterno = [...vinculosInternos, ...catsInternos, massaSalarialInterna];

  for (const registro of registrosInterno) {
    await prisma.registroInterno.create({ data: registro });
  }

  console.log('Seed concluído:');
  console.log(`- Cliente: ${cliente.razaoSocial} (${cliente.id})`);
  console.log(`- Estabelecimento: ${estabelecimento.cnpj} (${estabelecimento.id})`);
  console.log(`- CicloFap: ano ${ciclo.anoVigencia} (${ciclo.id})`);
  console.log(`- RegistroExtrato: ${registrosExtrato.length} linhas`);
  console.log(`- RegistroInterno: ${registrosInterno.length} linhas`);
  console.log('- Divergências propositalmente presentes nos dados brutos:');
  console.log('  DIV-001 CAT duplicada: Nelson Batista Gomes, 2024-03-10');
  console.log('  DIV-002 benefício sem vínculo: NIT 99988877766 (Thiago Nogueira Pinto)');
  console.log('  DIV-003 B91 suspeito (NTEP): Rafael Moreira Duarte, CID F32.1');
  console.log('  DIV-006 massa salarial divergente: extrato R$ 9.000.000,00 x interno R$ 8.700.000,00');
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
