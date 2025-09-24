// lib/seeds/stub.js

'use strict';

/**
 * Este é um arquivo de "seed". Ele é usado para popular o banco de dados
 * com dados iniciais ou de teste.
 *
 * A função `seed` será executada quando você rodar o comando `npx easydbg seed:run`.
 *
 * @param {import('../../lib').EasyDBGClient} db - A instância do cliente easydbg,
 * que dá acesso ao Query Builder.
 */
exports.seed = async (db) => {
  // --- Exemplo de Uso ---
  // Use o Query Builder para inserir dados nas suas tabelas.

  // Dica: Para garantir que os seeds possam ser executados várias vezes sem erros
  // de duplicação, é uma boa prática limpar a tabela antes de inserir novos dados.
  // Descomente a linha abaixo se desejar este comportamento.
  //
  // await db.table('users').delete();

  // Insere novos registros na tabela 'users'.
  // Você pode inserir um único objeto ou um array de objetos.
  /*
  await db.table('users').insert([
    {
      name: 'Admin User',
      email: 'admin@example.com',
      // ... outros campos
    },
    {
      name: 'Test User',
      email: 'test@example.com',
      // ... outros campos
    },
  ]);
  */

  // Você pode inserir dados em outras tabelas também.
  // await db.table('products').insert([
  //   { name: 'Laptop', price: 1200.00 },
  //   { name: 'Mouse', price: 25.00 },
  // ]);
};
