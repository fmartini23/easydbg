// easydbgfile.js

// Carrega as variáveis de ambiente do arquivo .env
// É uma boa prática manter dados sensíveis fora do código.
require('dotenv').config();

/**
 * Arquivo de configuração para o easydbg.
 *
 * A CLI do easydbg usará este arquivo para obter as configurações de conexão
 * e os caminhos para executar comandos como migrations.
 */
module.exports = {
  /**
   * Define o cliente de banco de dados a ser usado.
   * Valores possíveis: 'postgres', 'mysql', 'mssql', 'oracle'.
   */
  client: process.env.DB_CLIENT || 'postgres',

  /**
   * Configurações de conexão para o cliente selecionado.
   * Cada cliente pode ter parâmetros de conexão ligeiramente diferentes.
   */
  connection: {
    // --- Configuração para PostgreSQL ---
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'easydbg_dev',

    // --- Configuração para MySQL (exemplo, comente se não usar) ---
    // host: process.env.DB_HOST || '127.0.0.1',
    // user: process.env.DB_USER || 'root',
    // password: process.env.DB_PASSWORD || 'password',
    // database: process.env.DB_DATABASE || 'easydbg_dev',

    // --- Configuração para MSSQL (exemplo, comente se não usar) ---
    // server: process.env.DB_HOST || 'localhost', // Note que o parâmetro é 'server'
    // user: process.env.DB_USER || 'sa',
    // password: process.env.DB_PASSWORD || 'Password123',
    // database: process.env.DB_DATABASE || 'easydbg_dev',
    // options: {
    //   trustServerCertificate: true, // Importante para desenvolvimento local
    // },
  },

  /**
   * Configurações para o sistema de migrations.
   */
  migrations: {
    /**
     * O nome da tabela que armazena o histórico das migrations.
     */
    tableName: 'easydbg_migrations',

    /**
     * O diretório onde os arquivos de migração são criados e lidos.
     * O caminho é relativo à raiz do projeto.
     */
    directory: './database/migrations',
  },

  /**
   * Configurações para o pool de conexões.
   * Permite ajustar o desempenho da aplicação.
   */
  pool: {
    min: 2,
    max: 10,
  },

  /**
   * (Opcional) Ativa o modo de depuração para logar as consultas SQL executadas.
   */
  debug: process.env.NODE_ENV !== 'production',
};
