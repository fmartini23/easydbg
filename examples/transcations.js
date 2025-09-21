// examples/transactions.js

'use strict';

/**
 * Exemplo Avançado: Usando Transações
 *
 * Este script demonstra como executar operações atômicas usando o
 * método `db.transaction()`. Uma transação garante que um grupo de
 * consultas seja executado como uma única unidade: ou todas são bem-sucedidas
 * (commit), ou todas são desfeitas (rollback) se ocorrer um erro.
 *
 * Cenário: Uma simples transferência de saldo para compra de um produto.
 */

const easydbg = require('../lib'); // Em um projeto real: require('easydbg');
const dbConfig = require('../easydbgfile');

const db = easydbg(dbConfig);

const usersTable = 'trx_users';
const productsTable = 'trx_products';

async function setup() {
  console.log('[SETUP] Configurando o ambiente de teste...');
  await db.schema.dropTableIfExists(usersTable);
  await db.schema.dropTableIfExists(productsTable);

  console.log('[SETUP] Criando tabelas...');
  await db.schema.createTable(usersTable, (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.decimal('balance', 10, 2).notNullable();
  });
  await db.schema.createTable(productsTable, (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.decimal('price', 10, 2).notNullable();
    table.integer('stock').notNullable();
  });

  console.log('[SETUP] Inserindo dados iniciais...');
  await db.table(usersTable).insert([
    { id: 1, name: 'Alice', balance: 100.00 },
    { id: 2, name: 'Bob', balance: 20.00 }, // Bob não tem saldo suficiente
  ]);
  await db.table(productsTable).insert({
    id: 101,
    name: 'Laptop',
    price: 50.00,
    stock: 5,
  });
  console.log('[SETUP] Ambiente pronto.\n');
}

async function printState(title) {
  console.log(`\n--- ${title} ---`);
  const users = await db.table(usersTable).get();
  const products = await db.table(productsTable).get();
  console.log('Usuários:');
  console.table(users);
  console.log('Produtos:');
  console.table(products);
  console.log('---------------------\n');
}

async function purchaseProduct(userId, productId) {
  console.log(`>>> Tentando compra: Usuário #${userId} comprando Produto #${productId}`);
  
  try {
    await db.transaction(async (trx) => {
      // Dentro deste callback, use 'trx' em vez de 'db'.
      // Todas as operações com 'trx' usam a mesma conexão de banco de dados.

      // 1. Obter os dados do produto e do usuário (com bloqueio para atualização, se o banco suportar)
      const product = await trx.table(productsTable).where('id', productId).first();
      const user = await trx.table(usersTable).where('id', userId).first();

      console.log(`[TRX] Verificando: Saldo do usuário: ${user.balance}, Preço do produto: ${product.price}`);

      // 2. Validar as regras de negócio
      if (user.balance < product.price) {
        // Lançar um erro irá automaticamente acionar o rollback.
        throw new Error('Saldo insuficiente.');
      }
      if (product.stock <= 0) {
        throw new Error('Produto fora de estoque.');
      }

      // 3. Executar as atualizações
      console.log('[TRX] Saldo e estoque OK. Atualizando registros...');
      await trx.table(usersTable).where('id', userId).update({
        balance: user.balance - product.price,
      });
      await trx.table(productsTable).where('id', productId).update({
        stock: product.stock - 1,
      });

      console.log('[TRX] Atualizações concluídas. A transação será confirmada (commit).');
    });
    console.log('✅ Compra realizada com sucesso!\n');
  } catch (error) {
    // Se qualquer erro for lançado dentro do callback da transação, o easydbg
    // executa o rollback automaticamente e o erro é capturado aqui.
    console.error(`❌ Falha na transação: ${error.message}`);
    console.error('Todas as operações dentro da transação foram revertidas.\n');
  }
}

async function main() {
  await setup();
  await printState('Estado Inicial');

  // --- Cenário 1: Compra bem-sucedida ---
  await purchaseProduct(1, 101); // Alice (ID 1) tem saldo para comprar o Laptop (ID 101)
  await printState('Estado Após Compra Bem-Sucedida');

  // --- Cenário 2: Compra falha por saldo insuficiente ---
  await purchaseProduct(2, 101); // Bob (ID 2) não tem saldo suficiente
  await printState('Estado Após Tentativa de Compra Falha');
  
  // Limpeza final
  await db.schema.dropTableIfExists(usersTable);
  await db.schema.dropTableIfExists(productsTable);
  await db.disconnect();
}

main();
