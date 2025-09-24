#!/usr/bin/env node

'use strict';

const yargs = require('yargs');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

/**
 * Ponto de entrada da Interface de Linha de Comando (CLI) do easydbg.
 *
 * Responsabilidades:
 * 1. Carregar a configuração do projeto (`easydbgfile.js`).
 * 2. Definir os comandos disponíveis (migrations, seeds).
 * 3. Analisar os argumentos da linha de comando.
 * 4. Delegar a execução para os módulos de serviço apropriados.
 * 5. Fornecer feedback claro e colorido para o usuário.
 */

// --- Carregamento e Validação da Configuração ---

function loadConfig() {
  const configPath = path.resolve(process.cwd(), 'easydbgfile.js');
  if (!fs.existsSync(configPath)) {
    console.error(chalk.red.bold('Erro: Arquivo de configuração "easydbgfile.js" não encontrado.'));
    console.error(chalk.yellow('Por favor, crie o arquivo de configuração na raiz do seu projeto.'));
    process.exit(1);
  }
  try {
    return require(configPath);
  } catch (e) {
    console.error(chalk.red.bold('Erro ao carregar o arquivo "easydbgfile.js":'));
    console.error(e);
    process.exit(1);
  }
}

const config = loadConfig();

// --- Inicialização dos Módulos de Serviço ---

const easydbg = require('../lib');
const Migrator = require('../lib/migrations/migrator');
const Seeder = require('../lib/seeds/seeder');

const db = easydbg(config);
const migrator = new Migrator(db);
const seeder = new Seeder(db);

// --- Definição dos Comandos da CLI ---

console.log(chalk.bold.cyan('easydbg CLI'));

yargs(process.argv.slice(2))
  // --- Comandos de Migration ---
  .command(
    'make:migration <name>',
    'Cria um novo arquivo de migração.',
    (y) => y.positional('name', {
      describe: 'Nome da migração (ex: criar_tabela_usuarios)',
      type: 'string',
    }),
    async (argv) => {
      try {
        const filename = await migrator.make(argv.name);
        console.log(chalk.green('✅ Migração criada:'), chalk.yellow(filename));
      } catch (e) {
        console.error(chalk.red('❌ Erro ao criar migração:'), e.message);
      } finally {
        await db.disconnect();
      }
    }
  )
  .command(
    'migrate:latest',
    'Executa todas as migrações pendentes.',
    async () => {
      try {
        const { batch, migrations } = await migrator.latest();
        if (migrations.length === 0) {
          console.log(chalk.blue('Banco de dados já está atualizado. Nenhuma migração pendente.'));
        } else {
          console.log(chalk.green(`Lote de migração #${batch} executado com sucesso:`));
          migrations.forEach(m => console.log(chalk.cyan('   -> Migrado:'), chalk.yellow(m)));
        }
      } catch (e) {
        console.error(chalk.red('❌ Erro ao executar migrações:'), e.message);
      } finally {
        await db.disconnect();
      }
    }
  )
  .command(
    'migrate:rollback',
    'Reverte o último lote de migrações executadas.',
    async () => {
      try {
        const migrations = await migrator.rollback();
        if (migrations.length === 0) {
          console.log(chalk.blue('Nenhuma migração para reverter.'));
        } else {
          console.log(chalk.green('Lote de migração revertido com sucesso:'));
          migrations.forEach(m => console.log(chalk.cyan('   -> Revertido:'), chalk.yellow(m)));
        }
      } catch (e) {
        console.error(chalk.red('❌ Erro ao reverter migrações:'), e.message);
      } finally {
        await db.disconnect();
      }
    }
  )
  // --- Comandos de Seeding ---
  .command(
    'make:seed <name>',
    'Cria um novo arquivo de seed para popular o banco de dados.',
    (y) => y.positional('name', {
      describe: 'Nome do seed (ex: usuarios_iniciais)',
      type: 'string',
    }),
    async (argv) => {
      try {
        const filename = await seeder.make(argv.name);
        console.log(chalk.green('✅ Seed criado:'), chalk.yellow(filename));
      } catch (e) {
        console.error(chalk.red('❌ Erro ao criar seed:'), e.message);
      } finally {
        await db.disconnect();
      }
    }
  )
  .command(
    'seed:run',
    'Executa todos os arquivos de seed do diretório de seeds.',
    async () => {
      try {
        const seeds = await seeder.run();
        if (seeds.length === 0) {
          console.log(chalk.blue('Nenhum arquivo de seed encontrado para executar.'));
        } else {
          console.log(chalk.green('Seeds executados com sucesso:'));
          seeds.forEach(s => console.log(chalk.cyan('   -> Executado:'), chalk.yellow(s)));
        }
      } catch (e) {
        console.error(chalk.red('❌ Erro ao executar seeds:'), e.message);
      } finally {
        await db.disconnect();
      }
    }
  )
  .demandCommand(1, chalk.yellow('Você precisa fornecer um comando. Use --help para ver as opções.'))
  .strict() // Mostra erro se um comando não reconhecido for usado
  .help()
  .alias('h', 'help')
  .wrap(yargs.terminalWidth()) // Ajusta a largura da ajuda ao terminal
  .argv;
