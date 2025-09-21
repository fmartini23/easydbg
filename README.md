🚀 Guia de Início Rápido
O uso do conector envolve três passos simples: configurar, conectar e consultar.
1. Configuração
Recomendamos o uso de variáveis de ambiente para armazenar as credenciais do seu banco de dados. Use um pacote como o dotenv para carregá-las.
Crie um arquivo .env na raiz do seu projeto (use o .env.example como modelo):
ini
# .env - Exemplo para PostgreSQL
DB_CLIENT=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_DATABASE=seu_banco
No seu código, carregue essas variáveis e crie o objeto de configuração:
JavaScript
require('dotenv').config();
const EasyDBG = require('easydbg');

const config = {
    client: process.env.DB_CLIENT,
    connection: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    }
};
2. Conectar e Executar Consultas
Instancie o conector, conecte-se e execute suas consultas. O método query retorna uma Promise que resolve para um array de resultados.
JavaScript
async function main() {
    const db = new EasyDBG(config);

    try {
        // Inicia a conexão
        await db.connect();
        console.log('Conexão estabelecida com sucesso!');

        // Executa uma consulta segura com parâmetros
        const userId = 1;
        const users = await db.query('SELECT id, nome, email FROM usuarios WHERE id = ?', [userId]);

        console.log('Usuário encontrado:', users);

    } catch (error) {
        console.error('Ocorreu um erro:', error);
    } finally {
        // Garante que a conexão seja sempre fechada
        if (db) {
            await db.disconnect();
            console.log('Conexão fechada.');
        }
    }
}

main();
Importante sobre Parâmetros: Use ? como placeholder genérico nas suas consultas. O easydbg se encarregará de traduzi-lo para a sintaxe correta de cada banco de dados ($1 para PostgreSQL, :1 para Oracle, etc.).
⚙️ API de Referência
new EasyDBG(config)
Cria uma nova instância do conector.
config (objeto): O objeto de configuração.
client (string): O tipo de banco. Valores válidos: 'postgres', 'mysql', 'mssql', 'oracle'.
connection (objeto): As credenciais e detalhes da conexão, passados diretamente para o driver subjacente.
async connect()
Estabelece o pool de conexões com o banco de dados. Deve ser chamado antes de qualquer outra operação.
async query(sql, params)
Executa uma consulta SQL.
sql (string): A string da consulta SQL com ? como placeholders.
params (array): Um array de valores para substituir os placeholders.
async disconnect()
Fecha o pool de conexões e libera os recursos. É fundamental chamar este método ao final do ciclo de vida da sua aplicação.
🤝 Contribuindo
Contribuições são muito bem-vindas! Se você encontrar um bug ou tiver uma sugestão de melhoria, por favor, abra uma issue. Para mais detalhes, veja o CHANGELOG.md.
Para contribuir com código:
Faça um Fork do repositório.
Crie uma nova branch (git checkout -b feature/minha-feature).
Faça suas alterações e commit (git commit -m 'Adiciona minha feature').
Envie para a sua branch (git push origin feature/minha-feature).
Abra um Pull Request.
