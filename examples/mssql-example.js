// examples/mssql-example.js

/**
 * Exemplo de uso do 'easydbg' para conectar ao Microsoft SQL Server (MSSQL).
 *
 * Pré-requisitos:
 * 1. Ter um servidor MSSQL em execução e acessível.
 * 2. Ter instalado os pacotes: `npm install easydbg mssql dotenv`
 * 3. Ter um arquivo `.env` na raiz do projeto com as seguintes variáveis:
 *
 *    DB_CLIENT=mssql
 *    DB_HOST=localhost
 *    DB_PORT=1433
 *    DB_USER=sa
 *    DB_PASSWORD=sua_senha_forte
 *    DB_DATABASE=master
 *
 *    # Opcional, mas pode ser necessário para ambientes de desenvolvimento:
 *    # MSSQL_ENCRYPT=false
 *    # MSSQL_TRUST_SERVER_CERTIFICATE=true
 *
 * 4. Ter uma tabela de exemplo no banco. Você pode criar uma com:
 *    CREATE TABLE Produtos (
 *        id INT PRIMARY KEY IDENTITY(1,1),
 *        nome NVARCHAR(100) NOT NULL,
 *        preco DECIMAL(10, 2)
 *    );
 *    INSERT INTO Produtos (nome, preco) VALUES ('Laptop', 4500.00);
 *    INSERT INTO Produtos (nome, preco) VALUES ('Mouse', 89.90);
 */

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const EasyDBG = require('../lib/index'); // Ajuste o caminho se necessário

// 1. Monta o objeto de configuração a partir das variáveis de ambiente
const mssqlConfig = {
    client: process.env.DB_CLIENT,
    connection: {
        // O driver do mssql usa 'server' em vez de 'host'.
        // O nosso conector 'easydbg' pode ser inteligente e fazer essa conversão,
        // mas é uma boa prática usar a nomenclatura correta do driver.
        server: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        options: {
            // Em ambientes de desenvolvimento, pode ser necessário desabilitar a criptografia.
            // Em produção, o ideal é que 'encrypt' seja 'true'.
            encrypt: process.env.MSSQL_ENCRYPT === 'true', // Converte string para booleano
            trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE === 'true'
        }
    }
};

async function runMssqlExample() {
    // Validação para garantir que a configuração foi carregada
    if (mssqlConfig.client !== 'mssql') {
        console.log("Este exemplo é para MSSQL. Por favor, defina DB_CLIENT=mssql no seu arquivo .env");
        return;
    }

    const db = new EasyDBG(mssqlConfig);

    try {
        // 2. Conecta ao banco de dados
        await db.connect();
        console.log('Conectado ao Microsoft SQL Server com sucesso!');

        // 3. Executa uma consulta parametrizada para buscar produtos com preço abaixo de um valor
        const maxPrice = 100.00;
        // Usamos '?' como placeholder genérico. O conector adaptará para '@param0' se necessário.
        const products = await db.query('SELECT id, nome, preco FROM Produtos WHERE preco < ?', [maxPrice]);

        if (products.length > 0) {
            console.log(`Produtos encontrados com preço abaixo de R$ ${maxPrice}:`);
            console.table(products);
        } else {
            console.log(`Nenhum produto encontrado com preço abaixo de R$ ${maxPrice}.`);
        }

    } catch (error) {
        console.error('Ocorreu um erro durante a execução do exemplo MSSQL:', error.message);
    } finally {
        // 4. Garante que a conexão seja fechada ao final
        if (db) {
            await db.disconnect();
            console.log('Conexão com o MSSQL fechada.');
        }
    }
}

runMssqlExample();
