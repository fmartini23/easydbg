// test/connector.test.js

// Importa a classe que queremos testar
const EasyDBG = require('../lib/index');

// Mock dos drivers de banco de dados
// Jest interceptará qualquer chamada a esses módulos e usará nossas simulações.
jest.mock('pg', () => ({
    Pool: jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(),
        query: jest.fn().mockResolvedValue({ rows: [{ id: 1, name: 'Postgres' }] }),
        end: jest.fn().mockResolvedValue(),
    })),
}));

jest.mock('mysql2/promise', () => ({
    createPool: jest.fn().mockImplementation(() => ({
        query: jest.fn().mockResolvedValue([[{ id: 2, name: 'MySQL' }]]]),
        end: jest.fn().mockResolvedValue(),
    })),
}));

jest.mock('mssql', () => {
    const mockRequest = {
        input: jest.fn(),
        query: jest.fn().mockResolvedValue({ recordset: [{ id: 3, name: 'MSSQL' }] }),
    };
    const mockPool = {
        connect: jest.fn().mockResolvedValue({
            request: () => mockRequest,
        }),
        request: () => mockRequest,
        close: jest.fn().mockResolvedValue(),
    };
    return {
        connect: jest.fn().mockResolvedValue(mockPool),
        request: () => mockRequest,
    };
});


jest.mock('oracledb', () => ({
    outFormat: 0, // Simula a propriedade
    createPool: jest.fn().mockImplementation(() => ({
        getConnection: jest.fn().mockResolvedValue({
            execute: jest.fn().mockResolvedValue({ rows: [{ id: 4, name: 'Oracle' }] }),
            close: jest.fn().mockResolvedValue(),
        }),
        close: jest.fn().mockResolvedValue(),
    })),
}));


// Importa os mocks para que possamos inspecioná-los nos testes
const { Pool: PgPool } = require('pg');
const mysql = require('mysql2/promise');
const mssql = require('mssql');
const oracledb = require('oracledb');


// Início da suíte de testes para o EasyDBG
describe('EasyDBG Connector', () => {

    // Limpa todos os mocks antes de cada teste para garantir o isolamento
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Testes de Construção e Configuração
    describe('Constructor', () => {
        it('should throw an error if config is missing', () => {
            expect(() => new EasyDBG()).toThrow('Configuração inválida. É necessário fornecer "client" e "connection".');
        });

        it('should throw an error if client is missing', () => {
            expect(() => new EasyDBG({ connection: {} })).toThrow('Configuração inválida. É necessário fornecer "client" e "connection".');
        });

        it('should create an instance successfully with valid config', () => {
            const db = new EasyDBG({ client: 'postgres', connection: {} });
            expect(db).toBeInstanceOf(EasyDBG);
        });
    });

    // Testes para PostgreSQL
    describe('PostgreSQL', () => {
        const pgConfig = { client: 'postgres', connection: { host: 'localhost' } };

        it('should connect and disconnect successfully', async () => {
            const db = new EasyDBG(pgConfig);
            await db.connect();
            expect(PgPool).toHaveBeenCalledWith(pgConfig.connection);
            await db.disconnect();
            expect(db.pool.end).toHaveBeenCalled();
        });

        it('should execute a query and return rows', async () => {
            const db = new EasyDBG(pgConfig);
            await db.connect();
            const result = await db.query('SELECT * FROM users WHERE id = ?', [1]);
            
            // Verifica se a formatação do SQL está correta ('?' para '$1')
            expect(db.pool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
            expect(result).toEqual([{ id: 1, name: 'Postgres' }]);
        });
    });

    // Testes para MySQL
    describe('MySQL', () => {
        const mysqlConfig = { client: 'mysql', connection: { host: 'localhost' } };

        it('should connect and disconnect successfully', async () => {
            const db = new EasyDBG(mysqlConfig);
            await db.connect();
            expect(mysql.createPool).toHaveBeenCalledWith(mysqlConfig.connection);
            await db.disconnect();
            expect(db.pool.end).toHaveBeenCalled();
        });

        it('should execute a query and return rows', async () => {
            const db = new EasyDBG(mysqlConfig);
            await db.connect();
            const result = await db.query('SELECT * FROM users WHERE id = ?', [2]);

            // MySQL usa '?' nativamente, então o SQL não deve ser alterado
            expect(db.pool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [2]);
            expect(result).toEqual([{ id: 2, name: 'MySQL' }]);
        });
    });

    // Testes para MSSQL
    describe('MSSQL', () => {
        const mssqlConfig = { client: 'mssql', connection: { server: 'localhost' } };

        it('should connect and disconnect successfully', async () => {
            const db = new EasyDBG(mssqlConfig);
            await db.connect();
            expect(mssql.connect).toHaveBeenCalledWith(mssqlConfig.connection);
            await db.disconnect();
            expect(db.pool.close).toHaveBeenCalled();
        });

        it('should execute a query and return recordset', async () => {
            const db = new EasyDBG(mssqlConfig);
            await db.connect();
            const result = await db.query('SELECT * FROM users WHERE id = ?', [3]);
            
            const mockRequest = db.pool.request();
            // Verifica se a formatação do SQL está correta ('?' para '@param0')
            expect(mockRequest.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = @param0');
            // Verifica se o parâmetro foi adicionado corretamente
            expect(mockRequest.input).toHaveBeenCalledWith('param0', 3);
            expect(result).toEqual([{ id: 3, name: 'MSSQL' }]);
        });
    });

    // Testes para Oracle
    describe('Oracle', () => {
        const oracleConfig = { client: 'oracle', connection: { connectString: 'localhost/XE' } };

        it('should connect and disconnect successfully', async () => {
            const db = new EasyDBG(oracleConfig);
            await db.connect();
            expect(oracledb.createPool).toHaveBeenCalledWith(oracleConfig.connection);
            await db.disconnect();
            expect(db.pool.close).toHaveBeenCalled();
        });

        it('should execute a query and return rows', async () => {
            const db = new EasyDBG(oracleConfig);
            await db.connect();
            const result = await db.query('SELECT * FROM users WHERE id = ?', [4]);
            
            const mockConnection = await db.pool.getConnection();
            // Verifica se a formatação do SQL está correta ('?' para ':1')
            expect(mockConnection.execute).toHaveBeenCalledWith('SELECT * FROM users WHERE id = :1', [4]);
            expect(result).toEqual([{ id: 4, name: 'Oracle' }]);
        });
    });

    // Testes de Erros
    describe('Error Handling', () => {
        it('should throw an error if query is called before connect', async () => {
            const db = new EasyDBG({ client: 'postgres', connection: {} });
            // Usamos .rejects.toThrow para testar a rejeição de uma Promise
            await expect(db.query('SELECT 1')).rejects.toThrow('A conexão com o banco de dados não foi iniciada. Chame connect() primeiro.');
        });

        it('should throw an error for an unsupported client', () => {
            const db = new EasyDBG({ client: 'mongodb', connection: {} });
            expect(db.connect()).rejects.toThrow('Cliente de banco de dados não suportado: mongodb');
        });
    });
});
