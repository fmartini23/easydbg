// lib/errors/TransactionError.js

'use strict';

/**
 * @class TransactionError
 * @extends Error
 *
 * Representa um erro que ocorre durante o ciclo de vida de uma transação no banco de dados.
 *
 * Este erro é lançado quando há uma falha nos comandos de controle da transação,
 * como BEGIN, COMMIT ou ROLLBACK. Ele é distinto de um QueryError, que ocorre
 * em consultas DML (SELECT, INSERT, etc.) dentro da transação.
 *
 * @example
 * try {
 *   await db.transaction(async (trx) => {
 *     // ... operações com trx
 *   });
 * } catch (error) {
 *   if (error instanceof TransactionError) {
 *     console.error(`Falha na gestão da transação: ${error.message}`);
 *     // A aplicação pode tentar a operação novamente ou alertar um administrador.
 *   } else if (error instanceof QueryError) {
 *     // Erro dentro do callback da transação
 *     console.error(`Erro de consulta dentro da transação: ${error.message}`);
 *   }
 * }
 */
class TransactionError extends Error {
  /**
   * Cria uma instância de TransactionError.
   * @param {Error} originalError - O erro original lançado pelo driver do banco de dados.
   * @param {string} [message] - Uma mensagem customizada que descreve a falha na transação.
   */
  constructor(originalError, message) {
    // Fornece uma mensagem clara sobre a falha, usando a mensagem do erro original como base.
    super(message || `Falha na operação da transação: ${originalError.message}`);

    // Define o nome da classe do erro para identificação.
    this.name = 'TransactionError';

    // Armazena o erro original do driver para depuração detalhada.
    // Isso é útil para ver por que um COMMIT ou ROLLBACK pode ter falhado.
    this.originalError = originalError;

    // Preserva o stack trace original para facilitar a localização da origem do erro.
    if (originalError.stack) {
      this.stack = originalError.stack;
    }
  }
}

module.exports = TransactionError;
