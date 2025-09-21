// examples/postgres-example.js

/**
 * Exemplo de uso do 'easydbg' para conectar ao PostgreSQL.
 *
 * Pré-requisitos:
 * 1. Ter um servidor PostgreSQL em execução e acessível.
 * 2. Ter instalado os pacotes: `npm install easydbg pg dotenv`
 * 3. Ter um arquivo `.env` na raiz do projeto com as seguintes variáveis:
 *
 *    DB_CLIENT=postgres
 *    DB_HOST=localhost
 *    DB_PORT=5432
 *    DB_USER=seu_usuario_postgres
 *    DB_PASSWORD=sua_senha
 *    DB_DATABASE=seu_banco_de_dados
 *
 * 4. Ter uma tabela de exemplo no banco. Você pode criar uma com:
 *    CREATE TABLE usuarios (
 *        id SERIAL PRIMARY KEY,
 *        nome VARCHAR(100) NOT NULL,
 *        email VARCHAR(100) UNIQUE NOT NULL,
 *        ativo BOOLEAN DEFAULT true,
 *        data_criacao TIMESTAMPTZ DEFAULT NOW()
 *    );
 *    INSERT INTO usuarios (nome, email) VALUES ('João da Silva', 'joao.silva@example.com');
 *    INSERT INTO usuarios (nome, email, ativo) VALUES ('Maria Oliveira', 'maria.o@example.com', false);
 */

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const EasyDBG = require('../lib/index'); // Ajuste o caminho se necessário

// 1. Monta o objeto de configuração a partir das variáveis de ambiente
const pgConfig = {
    client: process.env.DB_CLIENT,
    connection: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        // O driver 'pg' permite configurações adicionais, como SSL:
        // ssl: { rejectUnauthorized: false } // Exemplo para conexões com SSL autoassinado
    }
};

async function runPostgresExample() {
    // Validação para garantir que a configuração foi carregada corretamente
    if (pgConfig.client !== 'postgres') {
        console.log("Este exemplo é para PostgreSQL. Por favor, defina DB_CLIENT=postgres no seu arquivo .env");
        return;
    }

    const db = new EasyDBG(pgConfig);

    try {
        // 2. Conecta ao banco de dados
        await db.connect();
        console.log('Conectado ao PostgreSQL com sucesso!');

        // 3. Executa uma consulta para buscar todos os usuários ativos
        console.log('\nBuscando todos os usuários ativos...');
        
        // O driver 'pg' usa placeholders no formato $1, $2, etc.
        const activeUsers = await db.query('SELECT id, nome, email FROM usuarios WHERE ativo = $1', [true]);

        if (activeUsers.length > 0) {
            console.table(activeUsers);
        } else {
            console.log('Nenhum usuário ativo encontrado.');
        }

        // 4. Executa uma consulta para buscar um usuário pelo ID
        const userIdToFind = 1;
        console.log(`\nBuscando usuário com ID: ${userIdToFind}`);
        const userById = await db.query('SELECT * FROM usuarios WHERE id = $1', [userIdToFind]);

        if (userById.length > 0) {
            console.log('Usuário encontrado:');
            console.log(userById[0]);
        } else {
            console.log(`Usuário com ID ${userIdToFind} não encontrado.`);
        }

    } catch (error) {
        console.error('Ocorreu um erro durante a execução do exemplo PostgreSQL:', error.message);
    } finally {
        // 5. Garante que a conexão seja fechada ao final
        if (db) {
            await db.disconnect();
            console.log('\nConexão com o PostgreSQL fechada.');
        }
    }
}

runPostgresExample();
