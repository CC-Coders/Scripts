var nomeObraAtual = null;
const tipoPermissaoUsuario = 1;//Permissao Para Usuario
const tipoPermissaoGrupo = 2;//Permissao para Grupo
const tipoPermissaoTodos = 3;//Permissão para Todos

const nivelPermissaoLer = 0; //Permissão Leitura
const nivelPermissaoGravar = 1;//Permissão Gravar
const nivelPermissaoModificar = 2;//Permissão Modificar
const nivelPermissaoTotal = 3;//Permissão Total

const nomePastaCriacao = "Contabilidade";//Nome da Pasta Raiz na Obra

// Estrutura de Pastas que vai ser criada Dentro da Pasta acima
// O algoritmo é recursivo, de forma que cada item dentro da lista "pastas" pode ter as suas próprias "pastas"
const estruturaDaPasta = [
    {
        nome: "Guias - ISS",
        pastas: [
            {
                nome: "2025",
                pastas: [
                    { nome: "01 - JANEIRO" },
                    { nome: "02 - FEVEREIRO" },
                    { nome: "03 - MARÇO" },
                    { nome: "04 - ABRIL" },
                    { nome: "05 - MAIO" },
                    { nome: "06 - JUNHO" },
                    { nome: "07 - JULHO" },
                    { nome: "08 - AGOSTO" },
                    { nome: "09 - SETEMBRO" },
                    { nome: "10 - OUTUBRO" },
                    { nome: "11 - NOVEMBRO" },
                    { nome: "12 - DEZEMBRO" }
                ]

            }
        ]
    }
];

async function CriaPastaNasPastasDeObras() {
    console.log("Iniciando Criação das Pastas");
    console.log("");

    var pastaRegionais = await buscaDocumentosDaPasta(1245095);
    // var pastaRegionais = await buscaDocumentosDaPasta(7883);
    for (const pastaRegional of pastaRegionais) {
        if (pastaRegional.type != 1) {
            // Se o type for diferente de 1
            // Então não é uma pasta e ignora pula para o proximo looping
            continue;
        }

        var idPastaRegional = pastaRegional.id;
        console.log("");
        console.warn("Verificando Pasta: ", pastaRegional.description);
        var pastasObras = await buscaDocumentosDaPasta(idPastaRegional);


        for (const pastaObra of pastasObras) {
            if (pastaObra.type != 1) {
                // Se o type for diferente de 1
                // Então não é uma pasta e ignora pula para o proximo looping
                continue;
            }


            var nomePasta = pastaObra.description;
            console.log("");
            console.warn("Verificando Pasta: ", nomePasta);
            // if (nomePasta != "1.5.022 - Conserva Gandu - Contrato 05 00701/2024") {
            if (nomePasta.split(" - ")[1]?.split(" ")[0]?.toLowerCase().trim() != "obra") {
                // Se o nome da pasta não começar com OBRA
                // Pula para o proximo looping
                console.error("A pasta (" + nomePasta + ") não tem padrão de pasta de Obra (CCUSTO - NOME)");
                continue;
            }
            nomeObraAtual = nomePasta.split(" - ")[1];

            var pastasDaObra = await buscaDocumentosDaPasta(pastaObra.id);
            var idPastaTarget
            var found = pastasDaObra.find(e => e.description == nomePastaCriacao);
            if (found) {
                console.log(`Pasta (${nomePastaCriacao}) encontrada!`);
                idPastaTarget = found.id;
            }
            if (!found) {
                console.log(`Pasta (${nomePastaCriacao}) não encontrada, criando...`);
                var retorno = await promiseCriaPasta(pastaObra.id, "Contabilidade");
                idPastaTarget = retorno.documentId;
            }

            var dataPastaPai = await buscaDocumentosDaPasta(idPastaTarget);
            for (const pastaFilhoEstrutura of estruturaDaPasta) {
                await asyncCriaEstruturaDePastas(idPastaTarget, pastaFilhoEstrutura.nome, pastaFilhoEstrutura.pastas, dataPastaPai);
            }
        }
    }

    console.log("");
    console.log("");
    console.log("Fim da Criação das Pastas");
}



async function asyncCriaEstruturaDePastas(parentId, nome, pastasFilho, dataPastaPai) {
    try {
        var found = dataPastaPai.find(pastas => pastas.description == nome);
        var idPastaTarget = null;
        if (!found) {
            // Se não foi encontrado na Pasta Pai, uma pasta como o "nome"
            // Então Cria a pasta
            console.log(`Pasta (${nome}) não encontrada, criando...`);
            var pastaCriada = await promiseCriaPasta(parentId, nome);
            idPastaTarget = pastaCriada.documentId;

            if (nome == "Guias - ISS") {
                const permissionVO = {
                    securityLevel: nivelPermissaoGravar,
                    attributionType: tipoPermissaoGrupo,
                    showContent: true,
                    downloadEnabled: true,
                    securityVersion: false,
                    attributionValue: getNomeObraAtual(),
                    inheritSecurity: false,
                    attributionDescription: null
                };
                await asyncIncluiPermissaoNaPasta(idPastaTarget, pastaCriada.version, permissionVO);
            }
        } else {
            console.log(`Pasta (${nome}) encontrada!`);
            idPastaTarget = found.id;
        }


        var dataPastaPai = await buscaDocumentosDaPasta(idPastaTarget);
        if (pastasFilho) {
            for (const pastaFilho of pastasFilho) {
                await asyncCriaEstruturaDePastas(idPastaTarget, pastaFilho.nome, pastaFilho.pastas, dataPastaPai);
            }
        }


    } catch (error) {
        throw error;
    }
}
function getNomeObraAtual() {
    return nomeObraAtual.trim();
}
function promiseCriaPasta(parentId, nome) {
    return new Promise((resolve, reject) => {
        $.ajax({
            method: "POST",
            url: "/content-management/api/v2/folders/" + parentId,
            data: JSON.stringify({ "alias": nome }),
            contentType: "application/json",
            success: retorno => {
                resolve(retorno);
            },
            error: e => reject(e)
        });
    });
}
async function asyncIncluiPermissaoNaPasta(documentId, version, permissionVO) {
    var permissaoAtual = await getDocumentPermissions(documentId, version);
    permissaoAtual.push(permissionVO);
    await setDocumentPermissions(documentId, permissaoAtual);
}
function getDocumentPermissions(documentId, version) {
    return new Promise((resolve, reject) => {
        $.ajax({
            method: "GET",
            url: `/api/public/2.0/documents/getDocumentPermissions/${documentId}/${version}`,
        })
            .done(function (data) {
                resolve(data.content);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                reject(textStatus, errorThrown);
            });
    });
}
function setDocumentPermissions(documentId, documentPermissionVO) {
    return new Promise((resolve, reject) => {
        $.ajax({
            method: "POST",
            url: `/api/public/2.0/documents/setDocumentPermissions`,
            data: JSON.stringify({ documentId: documentId, documentPermissionVO: documentPermissionVO }),
            datatype: "application/json",
            contentType: "application/json",
            success: data => {
                resolve(data.content);
            },
            error: e => {
                console.error(e);
                resolve();
            }
        });
    });
}
function buscaDocumentosDaPasta(documentId) {
    return new Promise((resolve, reject) => {
        $.ajax({
            method: "GET",
            url: `/api/public/ecm/document/listDocument/${documentId}?limit=400`,
        })
            .done(function (data) {
                resolve(data.content);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                reject(textStatus, errorThrown);
            });
    });
}

CriaPastaNasPastasDeObras();