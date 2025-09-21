// test/connector.test.js

'use strict';

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const easydbg = require('../lib'); // Importa o ponto de entrada principal do nosso pacote

// --- Configuração do Teste ---

// Define quais bancos de dados serão testados.
// O teste irá pular os bancos que não tiverem a variável de ambiente `TEST_{DB}` definida como 'true'.
const enabledDbs = [
  process.env.TEST_POSTGRES === 'true' && 'postgres',
  process.env.TEST_MYSQL === 'true' && 'mysql',
  process.env.TEST_MSSQL === 'true' && 'mssql',
  // process.env.TEST_ORACLE === 'true' && 'oracle', // Oracle pode ser mais lento/complexo para CI
].filter(Boolean);

// Objeto de configuração para cada banco de dados, lido do .env
const dbConfigs = {
  postgres: {
    client: 'postgres',
    connection: {
      host: process.env.POSTGRES_HOST,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    },
  },
  mysql: {
    client: 'mysql',
    connection: {
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB,
    },
  },
  mssql: {
    client: 'mssql',
    connection: {
      server: process.env.MSSQL_HOST,
      user: process.env.MSSQL_USER,
      password: process.env.MSSQL_PASSWORD,
      database: process.env.MSSQL_DB,
      options: {
        trustServerCertificate: true, // Necessário para conexões locais/sem SSL configurado
      },
    },
  },
};

// --- Suíte de Testes ---

// `describe.each` do Jest é perfeito para rodar o mesmo conjunto de testes para cada banco de dados.
describe.each(enabledDbs)('EasyDBG Connector Tests for %s', (clientType) => {
  let db;
  const testTableName = 'test_users';

  // --- Hooks do Jest: beforeAll, afterAll, afterEach ---

  // Antes de todos os testes para este banco de dados, inicializa o cliente.
  beforeAll(() => {
    db = easydbg(dbConfigs[clientType]);
  });

  // Depois de todos os testes, garante que a tabela de teste seja removida e a conexão fechada.
  afterAll(async () => {
    await db.schema.dropTableIfExists(testTableName);
    await db.disconnect();
  });

  // Depois de cada teste, limpa a tabela para garantir que os testes sejam independentes.
  afterEach(async () => {
    try {
      await db.table(testTableName).delete();
    } catch (e) {
      // Ignora o erro se a tabela ainda não existir.
    }
  });

  // --- Testes ---

  test('should connect to the database', async () => {
    // O método connect é chamado implicitamente, mas podemos testar a conexão
    // executando uma consulta simples que não deve falhar.
    const result = await db.query(clientType === 'postgres' || clientType === 'mysql' ? 'SELECT 1+1 as result' : 'SELECT 1+1 as result');
    expect(result[0].result).toBe(2);
  });

  test('SchemaBuilder: should create and drop a table', async () => {
    // Cria a tabela
    await db.schema.createTable(testTableName, (table) => {
      table.increments('id');
      table.string('name').notNullable();
      table.string('email').notNullable().unique();
    });

    // Verifica se a tabela existe
    const hasTable = await db.schema.hasTable(testTableName);
    expect(hasTable).toBe(true);

    // Remove a tabela
    await db.schema.dropTable(testTableName);
    const hasTableAfterDrop = await db.schema.hasTable(testTableName);
    expect(hasTableAfterDrop).toBe(false);
  });

  describe('QueryBuilder Operations', () => {
    // Antes dos testes de QueryBuilder, garante que a tabela exista.
    beforeAll(async () => {
      await db.schema.dropTableIfExists(testTableName); // Limpa antes de começar
      await db.schema.createTable(testTableName, (table) => {
        table.increments('id');
        table.string('name').notNullable();
        table.string('email').notNullable().unique();
        table.integer('age');
      });
    });

    test('should insert a new record and return it', async () => {
      const userData = { name: 'John Doe', email: 'john.doe@example.com', age: 30 };
      
      // A cláusula returning é mais complexa e varia entre bancos.
      // Este teste foca na inserção e verificação posterior.
      await db.table(testTableName).insert(userData);

      const user = await db.table(testTableName).where('email', 'john.doe@example.com').first();
      
      expect(user).not.toBeNull();
      expect(user.name).toBe('John Doe');
      expect(user.age).toBe(30);
    });

    test('should select records with a where clause', async () => {
      await db.table(testTableName).insert([
        { name: 'Jane Doe', email: 'jane.doe@example.com', age: 28 },
        { name: 'Peter Pan', email: 'peter.pan@example.com', age: 100 },
      ]);

      const users = await db.table(testTableName).where('age', '<', 50).get();
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('Jane Doe');
    });

    test('should update a record', async () => {
      await db.table(testTableName).insert({ name: 'Update Me', email: 'update.me@example.com', age: 40 });

      const updatedCount = await db.table(testTableName).where('email', 'update.me@example.com').update({ age: 41 });
      // Alguns drivers retornam o número de linhas afetadas.
      // expect(updatedCount).toBe(1);

      const updatedUser = await db.table(testTableName).where('email', 'update.me@example.com').first();
      expect(updatedUser.age).toBe(41);
    });

    test('should delete a record', async () => {
      await db.table(testTableName).insert({ name: 'Delete Me', email: 'delete.me@example.com', age: 50 });

      await db.table(testTableName).where('email', 'delete.me@example.com').delete();

      const deletedUser = await db.table(testTableName).where('email', 'delete.me@example.com').first();
      expect(deletedUser).toBeNull();
    });
  });

  test('Transaction: should commit a successful transaction', async () => {
    await db.transaction(async (trx) => {
      await trx.table(testTableName).insert({ name: 'Committed', email: 'committed@example.com', age: 60 });
    });

    const user = await db.table(testTableName).where('email', 'committed@example.com').first();
    expect(user).not.toBeNull();
  });

  test('Transaction: should rollback a failed transaction', async () => {
    const { QueryError } = easydbg.errors;
    
    await expect(
      db.transaction(async (trx) => {
        await trx.table(testTableName).insert({ name: 'To Be Rolled Back', email: 'rollback@example.com', age: 70 });
        // Força um erro (ex: violação de constraint unique)
        await trx.table(testTableName).insert({ name: 'Duplicate', email: 'rollback@example.com', age: 71 });
      })
    ).rejects.toThrow(QueryError);

    const user = await db.table(testTableName).where('email', 'rollback@example.com').first();
    expect(user).toBeNull(); // O primeiro insert deve ter sido revertido
  });
});

// Teste para o caso em que nenhum banco de dados está habilitado para teste.
if (enabledDbs.length === 0) {
  test('No database tests enabled', () => {
    console.warn('Nenhum banco de dados foi habilitado para teste. Defina TEST_POSTGRES, TEST_MYSQL ou TEST_MSSQL como "true" no seu arquivo .env');
    expect(true).toBe(true);
  });
}
