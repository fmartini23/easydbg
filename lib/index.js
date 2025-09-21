// lib/index.js

'use strict';

// Importa os drivers de banco de dados que serão usados como dependências
const { Pool: PgPool } = require('pg');
const mssql = require('mssql');
const mysql = require('mysql2/promise');
const oracledb = require('oracledb');

// Configuração global para o driver do Oracle para garantir que os resultados
// venham como objetos JavaScript, e não arrays.
// Isso ajuda a padronizar a saída entre os diferentes bancos.
try {
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
} catch (e) {
    // Ignora o erro se o driver 'oracledb' não estiver instalado.
    // Isso permite que usuários de outros bancos não precisem instalar o driver do Oracle.
}

/**
 * Classe principal do conector unificado de banco de dados.
 */
class EasyDBG {
    /**
     * Cria uma instância do EasyDBG.
     * @param {object} config - O objeto de configuração do banco de dados.
     * @param {string} config.client - O tipo de banco ('postgres', 'mysql', 'mssql', 'oracle').
     * @param {object} config.connection - As credenciais e detalhes da conexão.
     */
    constructor(config) {
        if (!config || !config.client || !config.connection) {
            throw new Error('Configuração inválida. É necessário fornecer "client" e "connection".');
        }

        this.config = config;
        this.clientType = config.client.toLowerCase(); // Garante que o nome do cliente seja minúsculo
        this.pool = null;
    }

    /**
     * Estabelece o pool de conexões com o banco de dados.
     * @returns {Promise<void>}
     */
    async connect() {
        if (this.pool) {
            console.warn('A conexão já foi estabelecida.');
            return;
        }

        try {
            switch (this.clientType) {
                case 'postgres':
                    this.pool = new PgPool(this.config.connection);
                    break;

                case 'mssql':
                    // O driver 'mssql' espera 'server' em vez de 'host'.
                    // Fazemos essa adaptação para manter a consistência na configuração.
                    const mssqlConfig = { ...this.config.connection };
                    if (mssqlConfig.host && !mssqlConfig.server) {
                        mssqlConfig.server = mssqlConfig.host;
                    }
                    this.pool = await mssql.connect(mssqlConfig);
                    break;

                case 'mysql':
                    this.pool = mysql.createPool(this.config.connection);
                    break;

                case 'oracle':
                    this.pool = await oracledb.createPool(this.config.connection);
                    break;

                default:
                    throw new Error(`Cliente de banco de dados não suportado: ${this.clientType}`);
            }
            console.log(`Conectado ao ${this.clientType} com sucesso!`);
        } catch (error) {
            console.error(`Falha ao conectar ao ${this.clientType}:`, error.message);
            // Lança o erro original para que a aplicação possa tratá-lo
            throw error;
        }
    }

    /**
     * Executa uma consulta SQL de forma segura com parâmetros.
     * @param {string} sql - A string da consulta SQL. Use '?' como placeholder genérico.
     * @param {Array} [params=[]] - Um array de parâmetros para a consulta.
     * @returns {Promise<Array<object>>} Uma promessa que resolve para um array de resultados.
     */
    async query(sql, params = []) {
        if (!this.pool) {
            throw new Error('A conexão com o banco de dados não foi iniciada. Chame connect() primeiro.');
        }

        try {
            switch (this.clientType) {
                case 'postgres': {
                    // Postgres usa $1, $2, etc.
                    const pgSql = sql.replace(/\?/g, (match, index) => `$${params.indexOf(match) + 1}`);
                    const result = await this.pool.query(pgSql, params);
                    return result.rows;
                }

                case 'mssql': {
                    // MSSQL usa @param0, @param1, etc. e um sistema de input separado.
                    const request = this.pool.request();
                    let mssqlSql = sql;
                    params.forEach((value, index) => {
                        const paramName = `param${index}`;
                        request.input(paramName, value);
                        // Substitui apenas a primeira ocorrência de '?'
                        mssqlSql = mssqlSql.replace('?', `@${paramName}`);
                    });
                    const result = await request.query(mssqlSql);
                    return result.recordset;
                }

                case 'mysql': {
                    // MySQL usa '?' nativamente.
                    const [rows] = await this.pool.query(sql, params);
                    return rows;
                }

                case 'oracle': {
                    // Oracle usa :1, :2, etc.
                    const oracleSql = sql.replace(/\?/g, (match, index) => `:${params.indexOf(match) + 1}`);
                    const connection = await this.pool.getConnection();
                    try {
                        const result = await connection.execute(oracleSql, params);
                        return result.rows;
                    } finally {
                        if (connection) {
                            await connection.close(); // Libera a conexão de volta para o pool
                        }
                    }
                }

                default:
                    throw new Error('Cliente de banco de dados não configurado corretamente.');
            }
        } catch (error) {
            console.error(`Erro ao executar a consulta no ${this.clientType}:`, error.message);
            throw error;
        }
    }

    /**
     * Fecha o pool de conexões e libera todos os recursos.
     * @returns {Promise<void>}
     */
    async disconnect() {
        if (!this.pool) {
            return; // Se não há pool, não há o que fazer.
        }

        try {
            switch (this.clientType) {
                case 'postgres':
                case 'mysql':
                case 'oracle':
                    // Esses drivers usam o método end() ou close() no pool
                    await this.pool.close(); // close() é um alias para end() em muitos
                    break;
                case 'mssql':
                    // O driver mssql usa o método close()
                    await this.pool.close();
                    break;
            }
            this.pool = null;
            console.log(`Conexão com ${this.clientType} fechada com sucesso.`);
        } catch (error) {
            console.error(`Erro ao fechar a conexão com ${this.clientType}:`, error.message);
            throw error;
        }
    }
}

// Exporta a classe para ser utilizada em outros arquivos
module.exports = EasyDBG;
