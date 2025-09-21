// examples/schema-builder.js

'use strict';

/**
 * Exemplo Avançado: Usando o Schema Builder
 *
 * Este script demonstra como usar a API do Schema Builder para
 * manipular a estrutura do banco de dados (operações DDL).
 *
 * O fluxo é o seguinte:
 * 1. Conectar ao banco de dados.
 * 2. Verificar se uma tabela 'products' existe e removê-la se necessário.
 * 3. Criar a tabela 'products' com uma variedade de tipos de colunas e constraints.
 * 4. Verificar novamente se a tabela foi criada.
 * 5. Renomear a tabela para 'store_products'.
 * 6. Verificar se o novo nome da tabela existe.
 * 7. Limpar, removendo a tabela final.
 */

const easydbg = require('../lib'); // Em um projeto real: require('easydbg');
const dbConfig = require('../easydbgfile');

const db = easydbg(dbConfig);
const originalTableName = 'products';
const renamedTableName = 'store_products';

async function main() {
  console.log('--- Iniciando demonstração do Schema Builder ---');

  try {
    // 1. Verificar e limpar o ambiente inicial.
    console.log(`\n[CHECK] Verificando se a tabela "${originalTableName}" já existe...`);
    if (await db.schema.hasTable(originalTableName)) {
      console.log(`[CLEANUP] Tabela "${originalTableName}" encontrada. Removendo...`);
      await db.schema.dropTable(originalTableName);
      console.log('Tabela removida.');
    } else {
      console.log('Tabela não encontrada. Ótimo!');
    }

    // 2. Criar uma nova tabela com uma estrutura complexa.
    console.log(`\n[CREATE] Criando a tabela "${originalTableName}"...`);
    await db.schema.createTable(originalTableName, (table) => {
      // Coluna de auto-incremento como chave primária
      table.increments('id').primary();

      // Colunas de string com constraints
      table.string('name', 150).notNullable();
      table.string('sku', 50).notNullable().unique();

      // Coluna de texto para descrições longas
      table.text('description');

      // Colunas numéricas
      table.decimal('price', 10, 2).notNullable().defaultTo(0.00);
      table.integer('stock_quantity').defaultTo(0);

      // Coluna booleana
      table.boolean('is_published').defaultTo(false);

      // Colunas de data e hora
      // O primeiro parâmetro (true) usa TIMESTAMP, o segundo (true) define o padrão como NOW()
      table.timestamps(true, true);
    });
    console.log('Tabela criada com sucesso!');

    // 3. Verificar se a criação foi bem-sucedida.
    console.log(`\n[VERIFY] Verificando novamente se a tabela "${originalTableName}" existe...`);
    const tableExists = await db.schema.hasTable(originalTableName);
    console.log(tableExists ? '✅ Sim, a tabela existe.' : '❌ Não, a tabela não foi criada.');

    // 4. Renomear a tabela.
    console.log(`\n[RENAME] Renomeando a tabela de "${originalTableName}" para "${renamedTableName}"...`);
    await db.schema.renameTable(originalTableName, renamedTableName);
    console.log('Tabela renomeada com sucesso.');

    // 5. Verificar se a tabela renomeada existe.
    console.log(`\n[VERIFY] Verificando se a tabela com o novo nome "${renamedTableName}" existe...`);
    const renamedTableExists = await db.schema.hasTable(renamedTableName);
    console.log(renamedTableExists ? '✅ Sim, a tabela renomeada existe.' : '❌ Não, a tabela não foi renomeada.');

  } catch (error) {
    console.error('❌ Ocorreu um erro durante a demonstração do Schema Builder:', error);
  } finally {
    // 6. Limpeza final.
    console.log(`\n[FINAL CLEANUP] Removendo a tabela "${renamedTableName}"...`);
    await db.schema.dropTableIfExists(renamedTableName);
    console.log('Limpeza concluída.');

    await db.disconnect();
    console.log('\nConexão fechada. Demonstração concluída.');
  }
}

main();
