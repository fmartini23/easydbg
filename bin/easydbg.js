#!/usr/bin/env node

// bin/easydbg.js

'use strict';

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

// --- Lógica da Aplicação (Simulada por enquanto) ---
// Em um projeto real, importaríamos as classes de /lib
// const EasyDBGClient = require('../lib/client');
// const Migrator = require('../lib/migrations/migrator');

// Simulação para este exemplo:
const EasyDBGClient = class { constructor() { console.log(chalk.dim('Cliente DB inicializado.')) } };
const Migrator = class {
  constructor(db, config) {
    this.db = db;
    this.config = config;
  }
  async make(name) {
    const dir = this.config.directory;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const fileName = `${timestamp}_${name}.js`;
    const filePath = path.join(dir, fileName);
    const template = `
// Migration: ${name}
exports.up = async (db) => {
  // Use o Schema Builder do db para criar tabelas, etc.
  // Ex: await db.schema.createTable('users', (table) => {
  //   table.increments('id');
  //   table.string('name').notNullable();
  //   table.timestamps();
  // });
};

exports.down = async (db) => {
  // Lógica para reverter a migration
  // Ex: await db.schema.dropTable('users');
};
`;
    fs.writeFileSync(filePath, template.trim());
    return filePath;
  }
  async latest() { return ['migration_01.js', 'migration_02.js']; }
  async rollback() { return ['migration_02.js']; }
};
// --- Fim da Simulação ---


// Função principal da CLI
async function main() {
  console.log(chalk.bold.yellow('easydbg CLI'));

  // 1. Carregar a configuração do projeto do usuário
  const configPath = path.resolve(process.cwd(), 'easydbgfile.js');
  if (!fs.existsSync(configPath)) {
    console.error(chalk.red('Erro: Arquivo de configuração "easydbgfile.js" não encontrado.'));
    console.log(chalk.dim('Por favor, crie o arquivo na raiz do seu projeto.'));
    process.exit(1);
  }
  const config = require(configPath);

  // 2. Inicializar o cliente e o migrator
  const db = new EasyDBGClient(config);
  const migrator = new Migrator(db, config.migrations);

  // 3. Configurar os comandos com Yargs
  yargs(hideBin(process.argv))
    .command(
      'make:migration <name>',
      'Cria um novo arquivo de migration',
      (yargs) => {
        yargs.positional('name', {
          describe: 'Nome da migration (ex: criar_tabela_usuarios)',
          type: 'string',
        });
      },
      async (argv) => {
        try {
          console.log(chalk.cyan(`Criando migration: ${argv.name}...`));
          const filePath = await migrator.make(argv.name);
          console.log(chalk.green('✔ Migration criada com sucesso:'));
          console.log(chalk.dim(filePath));
        } catch (e) {
          console.error(chalk.red('Erro ao criar migration:'), e.message);
          process.exit(1);
        }
      }
    )
    .command(
      'migrate:latest',
      'Executa todas as migrations pendentes',
      () => {},
      async () => {
        try {
          console.log(chalk.cyan('Executando migrations...'));
          const executed = await migrator.latest();
          if (executed.length > 0) {
            console.log(chalk.green('✔ Migrations executadas com sucesso:'));
            executed.forEach(file => console.log(chalk.dim(`  - ${file}`)));
          } else {
            console.log(chalk.yellow('Nenhuma migration pendente para executar.'));
          }
        } catch (e) {
          console.error(chalk.red('Erro ao executar migrations:'), e.message);
          process.exit(1);
        }
      }
    )
    .command(
      'migrate:rollback',
      'Reverte a última leva de migrations',
      () => {},
      async () => {
        try {
          console.log(chalk.cyan('Revertendo a última migration...'));
          const reverted = await migrator.rollback();
           if (reverted.length > 0) {
            console.log(chalk.green('✔ Migration revertida com sucesso:'));
            reverted.forEach(file => console.log(chalk.dim(`  - ${file}`)));
          } else {
            console.log(chalk.yellow('Nenhuma migration para reverter.'));
          }
        } catch (e) {
          console.error(chalk.red('Erro ao reverter migration:'), e.message);
          process.exit(1);
        }
      }
    )
    .demandCommand(1, 'Você precisa especificar um comando.')
    .strict()
    .help()
    .alias('h', 'help')
    .argv;
}

main().catch(err => {
  console.error(chalk.red('Ocorreu um erro inesperado na CLI:'), err);
  process.exit(1);
});
