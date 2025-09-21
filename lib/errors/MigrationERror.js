// lib/errors/MigrationError.js

'use strict';

/**
 * @class MigrationError
 * @extends Error
 *
 * Representa um erro que ocorre durante a execução do sistema de migrations.
 *
 * Isso pode incluir:
 * - Falha ao ler o diretório de migrations.
 * - Um arquivo de migration com sintaxe inválida ou faltando as funções 'up' ou 'down'.
 * - Erro de SQL durante a execução de uma migration (ex: falha ao criar uma tabela).
 * - Problemas ao acessar a tabela de controle de migrations.
 *
 * @example
 * // Na CLI ou em um script de migração
 * try {
 *   await migrator.latest();
 * } catch (error) {
 *   if (error instanceof MigrationError) {
 *     console.error(`Erro durante o processo de migração: ${error.message}`);
 *     if (error.migrationFile) {
 *       console.error(`Arquivo problemático: ${error.migrationFile}`);
 *     }
 *     // A aplicação pode decidir parar o processo aqui.
 *     process.exit(1);
 *   }
 * }
 */
class MigrationError extends Error {
  /**
   * Cria uma instância de MigrationError.
   * @param {string} message - A mensagem descritiva do erro de migração.
   * @param {object} [options={}] - Opções adicionais para enriquecer o erro.
   * @param {Error} [options.originalError] - O erro original (ex: um erro de SQL do driver).
   * @param {string} [options.migrationFile] - O nome do arquivo de migração que causou o erro.
   */
  constructor(message, options = {}) {
    // Chama o construtor da classe Error com a mensagem principal.
    super(message);

    // Define o nome da classe do erro para identificação.
    this.name = 'MigrationError';

    // Anexa o erro original, se fornecido. Isso é vital para depurar falhas de SQL.
    if (options.originalError) {
      this.originalError = options.originalError;
    }

    // Anexa o nome do arquivo de migração, se fornecido. Isso ajuda a localizar o problema rapidamente.
    if (options.migrationFile) {
      this.migrationFile = options.migrationFile;
    }

    // Captura o stack trace, omitindo o construtor da nossa própria classe de erro.
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MigrationError);
    }
  }
}

module.exports = MigrationError;
