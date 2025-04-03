async function IncluiPermissoesEmTodasAsObras() {
    try {
        const grupo = "Laboratorio";
        const pastasDentroDaObra = ["Laboratório"];

        const idRaizObras = "49";
        var pastasRegionais = await buscaDocumentosDaPasta(idRaizObras);

        for (const pasta of pastasRegionais) {
            var nomeDaPasta = pasta.description;
            if (nomeDaPasta.substring(0, 14) != "Obras Regional") {
                // Se o nome da pasta for diferente de "Obras Regional" ignora a pasta pulando o looping para a próxima execução
                continue;
            }

            var idDaPasta = pasta.id;
            var pastasDasObras = await buscaDocumentosDaPasta(idDaPasta);
            for (const obra of pastasDasObras) {
                var permissoesDaObra = await getDocumentPermissions(obra.id, obra.version);
                var found = permissoesDaObra.find((e) => e.attributionValue == grupo);
                if (!found) {
                    var novaPermissao = 
                        {
                            securityLevel: 1,
                            attributionType: 2,
                            showContent: true,
                            downloadEnabled: true,
                            securityVersion: false,
                            attributionValue: grupo,
                            inheritSecurity: false,
                            attributionDescription: null,
                        };
                        permissoesDaObra.push(novaPermissao);
   

                    var result = await setDocumentPermissions(obra.id, permissoesDaObra);
                    console.log(result);
                }

                var pastasDaObra = await buscaDocumentosDaPasta(obra.id);

                for (const pastaDaObra of pastasDaObra) {
                    var nomeDaPastaDaObra = pastaDaObra.description;
                    if (pastasDentroDaObra.includes(nomeDaPastaDaObra)) {
                        var permissoes = await buscaPermissoesDaPasta(pastaDaObra.id, pastaDaObra.version);

                        var found = permissoes.find((e) => e.attributionValue == grupo);
                        if (!found) {
                            var novaPermissao = 
                                {
                                    securityLevel: 2,
                                    attributionType: 2,
                                    showContent: true,
                                    downloadEnabled: true,
                                    securityVersion: false,
                                    attributionValue: grupo,
                                    inheritSecurity: false,
                                    attributionDescription: null,
                                };
                                permissoes.push(novaPermissao);

                            var result = await setDocumentPermissions(pastaDaObra.id, permissoes);
                            console.log(result);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error(error);
    }
}

function getDocumentPermissions(documentId) {
    return new Promise((resolve, reject) => {
        $.ajax({
            method: "GET",
            url: `/api/public/2.0/documents/getDocumentPermissions/${documentId}/1000`,
        })
            .done(function (data) {
                resolve(data.content);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                reject(textStatus, errorThrown);
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
function buscaPermissoesDaPasta(documentId, version) {
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
        })
            .done(function (data) {
                resolve(data.content);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                reject(textStatus, errorThrown);
            });
    });
}