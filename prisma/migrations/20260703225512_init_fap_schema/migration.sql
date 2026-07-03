-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "razaoSocial" TEXT NOT NULL,
    "cnpjRaiz" TEXT NOT NULL,
    "contatoNome" TEXT,
    "contatoEmail" TEXT,
    "percentualExito" INTEGER NOT NULL DEFAULT 25,
    "estagio" TEXT NOT NULL DEFAULT 'PROSPECT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Estabelecimento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "cnaeSubclasse" TEXT NOT NULL,
    "aliquotaRat" INTEGER NOT NULL,
    "folhaMediaMensalCentavos" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Estabelecimento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CicloFap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estabelecimentoId" TEXT NOT NULL,
    "anoVigencia" INTEGER NOT NULL,
    "fapAtribuido" INTEGER NOT NULL,
    "indiceFrequencia" REAL NOT NULL,
    "indiceGravidade" REAL NOT NULL,
    "indiceCusto" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IMPORTADO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CicloFap_estabelecimentoId_fkey" FOREIGN KEY ("estabelecimentoId") REFERENCES "Estabelecimento" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistroExtrato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cicloFapId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nit" TEXT,
    "nomeTrabalhador" TEXT,
    "especieBeneficio" TEXT,
    "dataInicio" DATETIME,
    "dataFim" DATETIME,
    "valorCentavos" INTEGER NOT NULL DEFAULT 0,
    "cid" TEXT,
    "dadosBrutosJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistroExtrato_cicloFapId_fkey" FOREIGN KEY ("cicloFapId") REFERENCES "CicloFap" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegistroInterno" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cicloFapId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nit" TEXT,
    "nomeTrabalhador" TEXT,
    "matricula" TEXT,
    "dataAdmissao" DATETIME,
    "dataDesligamento" DATETIME,
    "dadosBrutosJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistroInterno_cicloFapId_fkey" FOREIGN KEY ("cicloFapId") REFERENCES "CicloFap" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Divergencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cicloFapId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "registroExtratoId" TEXT NOT NULL,
    "registroInternoId" TEXT,
    "severidade" TEXT NOT NULL,
    "impactoIndice" TEXT NOT NULL,
    "impactoEstimadoCentavos" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DETECTADA',
    "justificativa" TEXT,
    "fundamentacaoLegal" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Divergencia_cicloFapId_fkey" FOREIGN KEY ("cicloFapId") REFERENCES "CicloFap" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Divergencia_registroExtratoId_fkey" FOREIGN KEY ("registroExtratoId") REFERENCES "RegistroExtrato" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Divergencia_registroInternoId_fkey" FOREIGN KEY ("registroInternoId") REFERENCES "RegistroInterno" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contestacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cicloFapId" TEXT NOT NULL,
    "textoMinuta" TEXT NOT NULL,
    "caracteres" INTEGER NOT NULL,
    "protocoladaEm" DATETIME,
    "resultado" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contestacao_cicloFapId_fkey" FOREIGN KEY ("cicloFapId") REFERENCES "CicloFap" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CicloFap_estabelecimentoId_anoVigencia_key" ON "CicloFap"("estabelecimentoId", "anoVigencia");

-- CreateIndex
CREATE UNIQUE INDEX "Divergencia_cicloFapId_codigo_registroExtratoId_key" ON "Divergencia"("cicloFapId", "codigo", "registroExtratoId");
