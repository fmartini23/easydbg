// examples/basic-connection.js

'use strict';

/**
 * Exemplo Básico: Conexão e Consulta Simples
 *
 * Este script demonstra o fluxo mais fundamental de uso do easydbg:
 * 1. Carregar a configuração.
 * 2. Instanciar o cliente.
 * 3. Executar uma consulta SQL crua para verificar a conexão.
 * 4. Imprimir o resultado.
 * 5. Desconectar de forma segura.
 */

// 1. Importar o easydbg e o arquivo de configuração do projeto.
const easydbg = require('../lib'); // Em um projeto real, seria: require('easydbg');
const dbConfig = require('../easydbgfile'); // Carrega a configuração do seu projeto

// 2. Instanciar o cliente com a configuração.
const db = easydbg(dbConfig);

// Função principal assíncrona para usar async/await.
async function checkConnection() {
  console.log(`Tentando conectar ao banco de dados: ${db.clientType}...`);

  try {
    // 3. Executar uma consulta SQL crua.
    // A primeira consulta irá implicitamente estabelecer a conexão.
    // A consulta 'SELECT 1+1' é um "ping" universal que funciona na maioria dos bancos SQL.
    const result = await db.query('SELECT 1 + 1 as result');

    // 4. Verificar e imprimir o resultado.
    if (result && result.length > 0 && result[0].result === 2) {
      console.log('✅ Conexão bem-sucedida!');
      console.log('Resultado da consulta de verificação:', result[0]);
    } else {
      console.error('❌ A conexão funcionou, mas o resultado da consulta foi inesperado:', result);
    }
  } catch (error) {
    // Captura e exibe erros de conexão ou de consulta.
    console.error('❌ Falha ao conectar ou executar a consulta:', error.message);
    if (error.originalError) {
      console.error('Detalhes do erro do driver:', error.originalError.message);
    }
  } finally {
    // 5. Desconectar do banco de dados.
    // É crucial fazer isso no bloco 'finally' para garantir que a conexão
    // seja sempre fechada, mesmo que ocorra um erro.
    console.log('Fechando a conexão...');
    await db.disconnect();
    console.log('Conexão fechada.');
  }
}

// Executa a função principal.
checkConnection();
