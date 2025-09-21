// lib/utils/parameter-handler.js

'use strict';

/**
 * Adapta uma consulta SQL e seus parâmetros para o dialeto específico do banco de dados.
 *
 * @param {string} clientType - O tipo de cliente ('postgres', 'mysql', 'mssql', 'oracle').
 * @param {string} sql - A string SQL original, usando '?' como placeholder.
 * @param {Array} params - O array de parâmetros.
 * @returns {{ formattedSql: string, formattedParams: Array }} - Um objeto contendo o SQL formatado e os parâmetros.
 */
function formatQuery(clientType, sql, params) {
    switch (clientType) {
        case 'postgres': {
            // Troca cada '?' por '$1', '$2', etc.
            let index = 0;
            const formattedSql = sql.replace(/\?/g, () => `$${++index}`);
            return { formattedSql, formattedParams: params };
        }

        case 'mysql': {
            // O driver mysql2/promise já usa '?' nativamente, então não há necessidade de formatação.
            return { formattedSql: sql, formattedParams: params };
        }

        case 'mssql': {
            // O driver mssql não usa placeholders na string SQL, mas sim um objeto de request.
            // Esta função não pode construir o `request`, então o `index.js` ainda terá essa lógica.
            // No entanto, podemos preparar a string SQL para usar os nomes dos parâmetros.
            let index = 0;
            const formattedSql = sql.replace(/\?/g, () => `@param${index++}`);
            return { formattedSql, formattedParams: params };
        }

        case 'oracle': {
            // Troca cada '?' por ':1', ':2', etc.
            let index = 0;
            const formattedSql = sql.replace(/\?/g, () => `:${++index}`);
            return { formattedSql, formattedParams: params };
        }

        default:
            // Retorna o SQL original se o cliente não for reconhecido aqui.
            return { formattedSql: sql, formattedParams: params };
    }
}

module.exports = {
    formatQuery,
};
