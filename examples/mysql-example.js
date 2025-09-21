// examples/mysql-example.js

/**
 * Exemplo de uso do 'easydbg' para conectar ao MySQL.
 *
 * Pré-requisitos:
 * 1. Ter um servidor MySQL ou MariaDB em execução e acessível.
 * 2. Ter instalado os pacotes: `npm install easydbg mysql2 dotenv`
 * 3. Ter um arquivo `.env` na raiz do projeto com as seguintes variáveis:
 *
 *    DB_CLIENT=mysql
 *    DB_HOST=localhost
 *    DB_PORT=3306
 *    DB_USER=seu_usuario_mysql
 *    DB_PASSWORD=sua_senha
 *    DB_DATABASE=seu_banco_de_dados
 *
 * 4. Ter uma tabela de exemplo no banco. Você pode criar uma com:
 *    CREATE TABLE clientes (
 *        id INT AUTO_INCREMENT PRIMARY KEY,
 *        nome VARCHAR(255) NOT NULL,
 *        email VARCHAR(255) UNIQUE NOT NULL,
 *        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 *    );
 *    INSERT INTO clientes (nome, email) VALUES ('Ana Silva', 'ana.silva@example.com');
 *    INSERT INTO clientes (nome, email) VALUES ('Carlos Souza', 'carlos.souza@example.com');
 */

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const EasyDBG = require('../lib/index'); // Ajuste o caminho se o seu estiver diferente

// 1. Monta o objeto de configuração a partir das variáveis de ambiente
const mysqlConfig = {
    client: process.env.DB_CLIENT,
    connection: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    }
};

async function runMySqlExample() {
    // Validação para garantir que a configuração foi carregada corretamente
    if (mysqlConfig.client !== 'mysql') {
        console.log("Este exemplo é para MySQL. Por favor, defina DB_CLIENT=mysql no seu arquivo .env");
        return;
    }

    const db = new EasyDBG(mysqlConfig);

    try {
        // 2. Conecta ao banco de dados
        await db.connect();
        console.log('Conectado ao MySQL com sucesso!');

        // 3. Executa uma consulta para buscar todos os clientes
        console.log('\nBuscando todos os clientes...');
        const allClients = await db.query('SELECT id, nome, email FROM clientes');

        if (allClients.length > 0) {
            console.table(allClients);
        } else {
            console.log('Nenhum cliente encontrado.');
        }

        // 4. Executa uma consulta parametrizada para encontrar um cliente específico
        const clientEmail = 'ana.silva@example.com';
        console.log(`\nBuscando cliente com o email: ${clientEmail}`);
        
        // O driver 'mysql2' usa '?' como placeholder para parâmetros
        const specificClient = await db.query('SELECT id, nome, email FROM clientes WHERE email = ?', [clientEmail]);

        if (specificClient.length > 0) {
            console.log('Cliente encontrado:');
            console.table(specificClient);
        } else {
            console.log(`Nenhum cliente encontrado com o email ${clientEmail}.`);
        }

    } catch (error) {
        console.error('Ocorreu um erro durante a execução do exemplo MySQL:', error.message);
    } finally {
        // 5. Garante que a conexão seja fechada ao final
        if (db) {
            await db.disconnect();
            console.log('\nConexão com o MySQL fechada.');
        }
    }
}

runMySqlExample();
