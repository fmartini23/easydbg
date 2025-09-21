// lib/errors/ConnectionError.js

'use strict';

/**
 * @class ConnectionError
 * @extends Error
 *
 * Representa um erro que ocorre durante a tentativa de estabelecer
 * ou fechar uma conexão com o banco de dados.
 *
 * Esta classe permite que os usuários da biblioteca capturem erros de conexão
 * de forma específica e os diferenciem de outros tipos de erros, como erros de consulta.
 *
 * @example
 * const db = new EasyDBG(config);
 * try {
 *   await db.connect();
 * } catch (error) {
 *   if (error instanceof ConnectionError) {
 *     console.error('Falha ao conectar ao banco de dados. Verifique as credenciais e a rede.', error.message);
 *   } else {
 *     console.error('Ocorreu um erro inesperado:', error);
 *   }
 * }
 */
class ConnectionError extends Error {
  /**
   * Cria uma instância de ConnectionError.
   * @param {Error} originalError - O erro original lançado pelo driver do banco de dados.
   * @param {string} [message] - Uma mensagem customizada. Se não for fornecida, a mensagem do erro original será usada.
   */
  constructor(originalError, message) {
    // Se uma mensagem customizada não for passada, usa a mensagem do erro original.
    // Adiciona um prefixo para clareza.
    super(message || `Falha na conexão: ${originalError.message}`);

    // Define o nome da classe do erro, útil para debugging e logging.
    this.name = 'ConnectionError';

    // Mantém uma referência ao erro original lançado pelo driver (pg, mysql2, etc.).
    // Isso é valioso para depuração, pois contém detalhes específicos do driver.
    this.originalError = originalError;

    // Mantém o stack trace original do erro, se disponível, para facilitar a depuração.
    if (originalError.stack) {
      this.stack = originalError.stack;
    }
  }
}

module.exports = ConnectionError;
