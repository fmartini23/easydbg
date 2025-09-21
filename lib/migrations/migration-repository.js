// lib/migrations/migration-repository.js

'use strict';

const MigrationError = require('../errors/MigrationError');

/**
 * @class MigrationRepository
 *
 * Gerencia a tabela de metadados das migrations no banco de dados.
 *
 * Esta classe abstrai toda a interação com a tabela que rastreia o estado
 * das migrations (quais foram executadas, em qual lote, etc.), permitindo
 * que o Migrator se concentre apenas na lógica de executar os arquivos.
 */
class MigrationRepository {
  /**
   * Cria uma instância do MigrationRepository.
   * @param {EasyDBGClient} db - A instância do cliente de banco de dados.
   * @param {object} config - A configuração das migrations.
   * @param {string} [config.tableName='easydbg_migrations'] - O nome da tabela de controle.
   */
  constructor(db, config) {
    if (!db) {
      throw new MigrationError('A instância do banco de dados (db) é obrigatória para o MigrationRepository.');
    }
    this.db = db;
    this.tableName = config.tableName || 'easydbg_migrations';
  }

  /**
   * Garante que a tabela de migrations exista no banco de dados.
   * Se não existir, ela será criada.
   * @returns {Promise<void>}
   */
  async ensureTableExists() {
    try {
      // Usa o Schema Builder do easydbg para verificar e criar a tabela.
      const exists = await this.db.schema.hasTable(this.tableName);
      if (!exists) {
        console.log(`Criando tabela de migrations: "${this.tableName}"...`);
        await this.db.schema.createTable(this.tableName, (table) => {
          table.increments('id').primary();
          table.string('name').notNullable().unique(); // Nome do arquivo da migration
          table.integer('batch').notNullable();       // Número do lote de execução
          table.timestamp('migration_time').defaultTo(this.db.fn.now()); // Quando a migration rodou
        });
      }
    } catch (err) {
      throw new MigrationError(`Falha ao garantir a existência da tabela de migrations: "${this.tableName}"`, { originalError: err });
    }
  }

  /**
   * Busca e retorna o número do próximo lote de migration.
   * @returns {Promise<number>} O número do próximo lote.
   */
  async getNextBatchNumber() {
    const lastBatch = await this.getLastBatchNumber();
    return lastBatch + 1;
  }

  /**
   * Busca e retorna o número do último lote de migration executado.
   * @returns {Promise<number>} O número do último lote, ou 0 se nenhum foi executado.
   */
  async getLastBatchNumber() {
    try {
      const result = await this.db.table(this.tableName).max('batch as last_batch');
      return result[0]?.last_batch || 0;
    } catch (err) {
      throw new MigrationError('Falha ao buscar o último número de lote da migration.', { originalError: err });
    }
  }

  /**
   * Retorna uma lista com os nomes de todas as migrations já executadas.
   * @returns {Promise<string[]>} Um array com os nomes dos arquivos de migration.
   */
  async getRan() {
    try {
      // Garante que a tabela exista antes de tentar consultá-la.
      await this.ensureTableExists();
      const results = await this.db.table(this.tableName).select('name').orderBy('name', 'asc');
      return results.map(row => row.name);
    } catch (err) {
      throw new MigrationError('Falha ao buscar a lista de migrations executadas.', { originalError: err });
    }
  }

  /**
   * Registra uma ou mais migrations como executadas no banco de dados.
   * @param {string|string[]} migrations - O nome do arquivo (ou uma lista de nomes) a ser registrado.
   * @param {number} batchNumber - O número do lote atual.
   * @returns {Promise<void>}
   */
  async log(migrations, batchNumber) {
    const records = (Array.isArray(migrations) ? migrations : [migrations]).map(name => ({
      name,
      batch: batchNumber,
    }));

    try {
      await this.db.table(this.tableName).insert(records);
    } catch (err) {
      throw new MigrationError(`Falha ao registrar a migration "${migrations}" no banco de dados.`, { originalError: err });
    }
  }

  /**
   * Remove o registro de uma migration do banco de dados (usado em rollbacks).
   * @param {string} migrationName - O nome do arquivo da migration a ser removido.
   * @returns {Promise<void>}
   */
  async delete(migrationName) {
    try {
      await this.db.table(this.tableName).where('name', migrationName).del();
    } catch (err) {
      throw new MigrationError(`Falha ao remover o registro da migration "${migrationName}".`, { originalError: err });
    }
  }
}

module.exports = MigrationRepository;
