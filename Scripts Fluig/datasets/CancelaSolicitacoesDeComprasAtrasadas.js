function defineStructure() {
    addColumn("DATA_EXEUCAO");
    addColumn("STATUS");
    addColumn("MENSAGEM");
    addColumn("LISTA_SOLICITACOES_CANCELADAS");
}

function createDataset(fields, constraints, sortFields) {
    try {
        return cancelaSolicitacoesDeComprasAtrasadas();
    } catch (error) {
        if (typeof error == "object") {
            var mensagem = "";
            var keys = Object.keys(error);
            for (var i = 0; i < keys.length; i++) {
                mensagem += (keys[i] + ": " + error[keys[i]]) + " - ";
            }
            log.info("Erro ao executar Dataset:");
            log.dir(error);
            log.info(mensagem);

            return returnDataset("ERRO", mensagem, null);
        } else {
            return returnDataset("ERRO", error, null);
        }
    }
}


function onSync(lastSyncDate){
    try {
        var solicitacoesCanceladas = cancelaSolicitacoesDeComprasAtrasadas();
        if (solicitacoesCanceladas.STATUS == "SUCCESS") {
            return returnDataset("SUCCESS", "Solicitações canceladas com sucesso!", solicitacoesCanceladas.SOLICITACOES);
        }else{
            return returnDataset("ERROR", solicitacoesCanceladas.MENSAGEM, solicitacoesCanceladas.SOLICITACOES);
        }
    } catch (error) {
        if (typeof error == "object") {
            var mensagem = "";
            var keys = Object.keys(error);
            for (var i = 0; i < keys.length; i++) {
                mensagem += (keys[i] + ": " + error[keys[i]]) + " - ";
            }
            log.info("Erro ao executar Dataset:");
            log.dir(error);
            log.info(mensagem);

            return returnDataset("ERRO", mensagem, null);
        } else {
            return returnDataset("ERRO", error, null);
        }
    }
}


function cancelaSolicitacoesDeComprasAtrasadas(){
    try {
        var solicitacoes = consultaSolicitacoesAtrasadas("2025-03-01");
        var solicitacoesCanceladas = [];//Salva os IDs das Solicitações Canceladas

        for (var i = 0; i < solicitacoes.length; i++) {
            // Para cada solicitação encontrada, chama a API para cancelar
            var solicitacao = solicitacoes[i];

            var retorno = cancelaSolicitacao(solicitacao.NUM_PROCES);
            log.info("cancelaSolicitacao");
            log.dir(retorno);
            
            var result = JSON.parse(retorno.result);

            if ((result.content != null && result.content != "OK") || (result.message != null && result.message.type == "ERROR")) {
                // Se o retorno da API não for SUCCESS lança o erro e para o Script
                throw result.message.message;
            }else{
                solicitacoesCanceladas.push(solicitacao.NUM_PROCES);
            }
        }
    
        return {STATUS:"SUCCESS", SOLICITACOES: solicitacoesCanceladas.join(", ")};
    } catch (error) {
        return {STATUS:"ERROR", SOLICITACOES: solicitacoesCanceladas.join(", "), MENSAGEM:error};
    }
}
function consultaSolicitacoesAtrasadas(dataLimite){
    var query = 
    "SELECT TOP 5 NUM_PROCES, START_DATE\
    FROM PROCES_WORKFLOW \
    WHERE\
    STATUS = 0\
    AND START_DATE <= '" + dataLimite + "'\
    AND COD_DEF_PROCES = 'Solicitacao De Compras e Servicos V2' ORDER BY START_DATE DESC";
    return executaQuery(query);
}

function cancelaSolicitacao(NUM_PROCES){
        var url = "/ecm/api/rest/ecm/workflowView/cancelInstance";
            var clientService = fluigAPI.getAuthorizeClientService();

            var data = {
                companyId: getValue("WKCompany") + '',
                serviceCode: 'ServicoFluig', 
                endpoint: url,
                params:{"processInstanceId":NUM_PROCES, "replacedId":"apm", "taskUserId":"sisma","cancelText":"Solicitação cancelada automaticamente por falta de Movimentação."},
                method: 'POST',
                headers: {
                    contentType: 'application/json',
                    mediaType: 'application/json'
                },
                    options: {
                    encoding: 'UTF-8',
                    mediaType: 'application/json'
                }
            };

        return clientService.invoke(JSON.stringify(data));
}


// Utils
function returnDataset(STATUS, MENSAGEM, SOLICITACOES) {
    var date = new Date();
    var dia = date.getDate();
    dia = dia < 10 ? "0"+dia : dia;
    var mes = date.getMonth()+1;
    mes = mes < 10 ? "0"+ mes: mes;

    var diaAtual = [date.getFullYear(), mes, dia].join("-");

    var dataset = DatasetBuilder.newDataset();
    dataset.addColumn("DATA_EXEUCAO");
    dataset.addColumn("STATUS");
    dataset.addColumn("MENSAGEM");
    dataset.addColumn("LISTA_SOLICITACOES_CANCELADAS");
    dataset.addRow([diaAtual, STATUS, MENSAGEM, SOLICITACOES]);
    return dataset;
}
function executaQuery(myQuery){
     try {
        var dataSource = "/jdbc/AppDS";
        var ic = new javax.naming.InitialContext();
        var ds = ic.lookup(dataSource);
        var conn = ds.getConnection();
        var stmt = conn.createStatement();
        var rs = stmt.executeQuery(myQuery);
        var columnCount = rs.getMetaData().getColumnCount();
        var retorno = [];
        while (rs.next()) {
            var linha = {};
            for (var i = 1; i <= columnCount; i++) {
                var obj = rs.getObject(rs.getMetaData().getColumnName(i));
                if (null != obj) {
                    linha[rs.getMetaData().getColumnName(i)] = rs.getObject(rs.getMetaData().getColumnName(i)).toString()+"";
                } else {
                    linha[rs.getMetaData().getColumnName(i)] = "";
                }
            }
            retorno.push(linha);
        }
        return retorno;
    } catch (e) {
        log.error("ERRO==============> " + e.message);
        throw e
    } finally {
        if (stmt != null) {
            stmt.close();
        }
        if (conn != null) {
            conn.close();
        }
    }
}



// var ds = DatasetFactory.getDataset("CancelaSolicitacoesDeComprasAtrasadas", null, [
    
// ],null);