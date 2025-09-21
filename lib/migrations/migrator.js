// lib/migrations/migrator.js

'use strict';

const fs = require('fs').promises; // Usando a versão baseada em Promises do fs
const path = require('path');
const MigrationRepository = require('./migration-repository');
const MigrationError = require('../errors/MigrationError');

/**
 * @class Migrator
 *
 * Orquestra todo o processo de migração do banco de dados.
 *
 * Responsabilidades:
 * - Ler os arquivos de migração do sistema de arquivos.
 * - Comparar com o estado registrado no banco de dados (via MigrationRepository).
 * - Executar ou reverter migrações conforme solicitado.
 * - Criar novos arquivos de migração a partir de um template.
 */
class Migrator {
  /**
   * Cria uma instância do Migrator.
   * @param {EasyDBGClient} db - A instância do cliente de banco de dados.
   * @param {object} config - A configuração das migrations.
   */
  constructor(db, config = {}) {
    if (!db) {
      throw new MigrationError('A instância do banco de dados (db) é obrigatória para o Migrator.');
    }
    this.db = db;
    this.config = {
      directory: './database/migrations',
      tableName: 'easydbg_migrations',
      ...config,
    };
    this.repository = new MigrationRepository(this.db, this.config);
  }

  /**
   * Cria um novo arquivo de migração no diretório especificado.
   * @param {string} name - O nome descritivo para a migração (ex: criar_tabela_usuarios).
   * @returns {Promise<string>} O caminho completo para o arquivo criado.
   */
  async make(name) {
    if (!name) {
      throw new MigrationError('O nome da migration é obrigatório.');
    }

    const dir = path.resolve(process.cwd(), this.config.directory);
    await fs.mkdir(dir, { recursive: true }); // Garante que o diretório exista

    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const fileName = `${timestamp}_${name}.js`;
    const filePath = path.join(dir, fileName);

    const template = `
'use strict';

/**
 * Migration: ${name}
 * @param {EasyDBGClient} db - A instância do cliente de banco de dados.
 */
exports.up = async (db) => {
  // Exemplo:
  // await db.schema.createTable('users', (table) => {
  //   table.increments('id').primary();
  //   table.string('name', 255).notNullable();
  //   table.string('email', 255).notNullable().unique();
  //   table.timestamps(true, true); // created_at e updated_at
  // });
};

/**
 * Reverte a migration.
 * @param {EasyDBGClient} db - A instância do cliente de banco de dados.
 */
exports.down = async (db) => {
  // Exemplo:
  // await db.schema.dropTableIfExists('users');
};
`;
    await fs.writeFile(filePath, template.trim());
    return filePath;
  }

  /**
   * Executa todas as migrações pendentes.
   * @returns {Promise<string[]>} Uma lista dos nomes dos arquivos de migração executados.
   */
  async latest() {
    await this.repository.ensureTableExists();

    const [ran, all] = await Promise.all([
      this.repository.getRan(),
      this._getAllMigrationFiles(),
    ]);

    const pending = all.filter(file => !ran.includes(file));

    if (pending.length === 0) {
      return []; // Nenhuma migração para executar
    }

    const batchNumber = await this.repository.getNextBatchNumber();

    for (const migrationFile of pending) {
      await this._runUp(migrationFile, batchNumber);
    }

    return pending;
  }

  /**
   * Reverte a última leva (batch) de migrações.
   * @returns {Promise<string[]>} Uma lista dos nomes dos arquivos de migração revertidos.
   */
  async rollback() {
    await this.repository.ensureTableExists();

    const lastBatchNumber = await this.repository.getLastBatchNumber();
    if (lastBatchNumber === 0) {
      return []; // Nenhuma migração para reverter
    }

    const migrationsToRollback = await this.db
      .table(this.config.tableName)
      .where('batch', lastBatchNumber)
      .orderBy('name', 'desc') // Reverte na ordem inversa da execução
      .select('name');

    const filesToRollback = migrationsToRollback.map(m => m.name);

    for (const migrationFile of filesToRollback) {
      await this._runDown(migrationFile);
    }

    return filesToRollback;
  }

  /**
   * @private
   * Executa a função 'up' de um arquivo de migração e a registra no repositório.
   */
  async _runUp(fileName, batchNumber) {
    const filePath = path.resolve(this.config.directory, fileName);
    try {
      const migration = require(filePath);
      if (typeof migration.up !== 'function') {
        throw new MigrationError(`A função 'up' não é uma função válida no arquivo.`, { migrationFile: fileName });
      }

      console.log(`Executando: ${fileName}`);
      await migration.up(this.db);
      await this.repository.log(fileName, batchNumber);
    } catch (err) {
      // Garante que o erro seja um MigrationError com contexto rico
      if (err instanceof MigrationError) throw err;
      throw new MigrationError(`Falha ao executar a migração.`, { originalError: err, migrationFile: fileName });
    }
  }

  /**
   * @private
   * Executa a função 'down' de um arquivo de migração e remove seu registro do repositório.
   */
  async _runDown(fileName) {
    const filePath = path.resolve(this.config.directory, fileName);
    try {
      const migration = require(filePath);
      if (typeof migration.down !== 'function') {
        throw new MigrationError(`A função 'down' não é uma função válida no arquivo.`, { migrationFile: fileName });
      }

      console.log(`Revertendo: ${fileName}`);
      await migration.down(this.db);
      await this.repository.delete(fileName);
    } catch (err) {
      if (err instanceof MigrationError) throw err;
      throw new MigrationError(`Falha ao reverter a migração.`, { originalError: err, migrationFile: fileName });
    }
  }

  /**
   * @private
   * Lê o diretório de migrações e retorna uma lista ordenada de todos os arquivos .js.
   */
  async _getAllMigrationFiles() {
    const dir = path.resolve(process.cwd(), this.config.directory);
    try {
      const files = await fs.readdir(dir);
      return files.filter(file => file.endsWith('.js')).sort();
    } catch (err) {
      // Se o diretório não existir, retorna um array vazio.
      if (err.code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }
}

module.exports = Migrator;
