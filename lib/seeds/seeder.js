// lib/seeds/seeder.js

'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * @class Seeder
 *
 * Gerencia a criação e execução de arquivos de "seed".
 * Seeds são usados para popular o banco de dados com dados iniciais ou de teste.
 */
class Seeder {
  /**
   * @param {EasyDBGClient} db - A instância do cliente de banco de dados.
   */
  constructor(db) {
    this.db = db;
    this.config = db.config.seeds || {};
    this.config.directory = this.config.directory || './database/seeds';
  }

  /**
   * Cria um novo arquivo de seed a partir de um template.
   * @param {string} name - O nome para o arquivo de seed (ex: 'usuarios_iniciais').
   * @returns {Promise<string>} O caminho do arquivo criado.
   */
  async make(name) {
    if (!name) {
      throw new Error('Um nome é necessário para o arquivo de seed.');
    }

    const seedDir = path.resolve(process.cwd(), this.config.directory);
    await fs.mkdir(seedDir, { recursive: true });

    const filename = `${name}.js`;
    const filepath = path.join(seedDir, filename);

    // Carrega o conteúdo do template (stub)
    const stubPath = path.join(__dirname, 'stub.js');
    const stubContent = await fs.readFile(stubPath, 'utf-8');

    await fs.writeFile(filepath, stubContent);

    return filepath;
  }

  /**
   * Executa todos os arquivos de seed encontrados no diretório de seeds.
   * @returns {Promise<string[]>} Uma lista dos nomes dos arquivos de seed executados.
   */
  async run() {
    const seedDir = path.resolve(process.cwd(), this.config.directory);

    try {
      const files = await fs.readdir(seedDir);
      const seedFiles = files
        .filter(file => file.endsWith('.js'))
        .sort(); // Executa em ordem alfabética

      if (seedFiles.length === 0) {
        return [];
      }

      const executedSeeds = [];

      for (const file of seedFiles) {
        const filepath = path.join(seedDir, file);
        const seedModule = require(filepath);

        if (typeof seedModule.seed !== 'function') {
          console.warn(`Aviso: O arquivo de seed "${file}" não exporta uma função "seed" e será ignorado.`);
          continue;
        }

        // A função seed recebe a instância do cliente 'db' como argumento.
        await seedModule.seed(this.db);
        executedSeeds.push(file);
      }

      return executedSeeds;

    } catch (error) {
      if (error.code === 'ENOENT') {
        // O diretório de seeds não existe, o que não é um erro.
        return [];
      }
      // Outros erros (ex: erro de permissão) devem ser lançados.
      throw error;
    }
  }
}

module.exports = Seeder;
