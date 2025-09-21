// examples/query-builder.js

'use strict';

/**
 * Exemplo Avançado: Usando o Query Builder
 *
 * Este script demonstra como usar a API fluente do Query Builder
 * para realizar operações CRUD (Create, Read, Update, Delete).
 *
 * O fluxo é o seguinte:
 * 1. Conectar ao banco de dados.
 * 2. Criar uma tabela de teste ('qb_users') usando o Schema Builder.
 * 3. INSERIR múltiplos usuários.
 * 4. SELECIONAR usuários com diferentes filtros e ordenações.
 * 5. ATUALIZAR os dados de um usuário.
 * 6. DELETAR um usuário.
 * 7. Limpar a tabela e desconectar.
 */

const easydbg = require('../lib'); // Em um projeto real: require('easydbg');
const dbConfig = require('../easydbgfile');

const db = easydbg(dbConfig);
const testTableName = 'qb_users';

async function main() {
  try {
    console.log('--- Iniciando demonstração do Query Builder ---');

    // 1. Preparar o ambiente: criar a tabela de teste.
    console.log(`\n[SETUP] Criando a tabela de teste "${testTableName}"...`);
    await db.schema.dropTableIfExists(testTableName);
    await db.schema.createTable(testTableName, (table) => {
      table.increments('id');
      table.string('name').notNullable();
      table.string('email').notNullable().unique();
      table.integer('age');
      table.boolean('is_active').defaultTo(true);
    });
    console.log('Tabela criada com sucesso.');

    // 2. INSERT: Inserir múltiplos registros de uma vez.
    console.log('\n[INSERT] Inserindo usuários...');
    const usersToInsert = [
      { name: 'Alice', email: 'alice@example.com', age: 28, is_active: true },
      { name: 'Bob', email: 'bob@example.com', age: 35, is_active: true },
      { name: 'Charlie', email: 'charlie@example.com', age: 22, is_active: false },
    ];
    await db.table(testTableName).insert(usersToInsert);
    console.log(`${usersToInsert.length} usuários inseridos.`);

    // 3. SELECT: Realizar várias consultas de leitura.
    console.log('\n[SELECT] Buscando todos os usuários:');
    const allUsers = await db.table(testTableName).get();
    console.table(allUsers);

    console.log('\n[SELECT] Buscando usuários ativos com mais de 30 anos:');
    const filteredUsers = await db.table(testTableName)
      .where({ is_active: true })
      .where('age', '>', 30)
      .get();
    console.table(filteredUsers);

    console.log('\n[SELECT] Buscando o usuário mais jovem (usando orderBy e first):');
    const youngestUser = await db.table(testTableName)
      .orderBy('age', 'asc')
      .first();
    console.log(youngestUser);

    // 4. UPDATE: Atualizar a idade do Bob.
    console.log('\n[UPDATE] Atualizando a idade do Bob para 36...');
    await db.table(testTableName)
      .where('name', '=', 'Bob')
      .update({ age: 36 });
    
    const updatedBob = await db.table(testTableName).where({ name: 'Bob' }).first();
    console.log('Dados do Bob após a atualização:', updatedBob);

    // 5. DELETE: Remover o usuário inativo (Charlie).
    console.log('\n[DELETE] Removendo usuários inativos...');
    await db.table(testTableName)
      .where('is_active', false)
      .delete();

    console.log('\n[VERIFY] Verificando usuários restantes na tabela:');
    const remainingUsers = await db.table(testTableName).get();
    console.table(remainingUsers);
    
  } catch (error) {
    console.error('❌ Ocorreu um erro durante a demonstração:', error);
  } finally {
    // 6. Limpeza: Remover a tabela de teste e fechar a conexão.
    console.log(`\n[CLEANUP] Removendo a tabela de teste "${testTableName}"...`);
    await db.schema.dropTableIfExists(testTableName);
    console.log('Tabela removida.');

    await db.disconnect();
    console.log('\nConexão fechada. Demonstração concluída.');
  }
}

main();
