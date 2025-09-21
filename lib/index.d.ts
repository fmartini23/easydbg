// lib/index.d.ts

// Declara o módulo 'easydbg' para que o TypeScript o reconheça.
declare module 'easydbg' {

  // --- Tipos de Configuração ---

  /**
   * Configuração de conexão genérica.
   * Os tipos específicos estendem esta interface.
   */
  interface BaseConnectionConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  }

  // Tipos específicos para cada driver, refletindo suas opções.
  interface PostgresConnectionConfig extends BaseConnectionConfig {}
  interface MySqlConnectionConfig extends BaseConnection_Config {}
  interface MssqlConnectionConfig {
    server: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
    options?: {
      trustServerCertificate?: boolean;
      [key: string]: any;
    };
  }
  interface OracleConnectionConfig {
    user?: string;
    password?: string;
    connectString?: string;
  }

  type ConnectionConfig = PostgresConnectionConfig | MySqlConnectionConfig | MssqlConnectionConfig | OracleConnectionConfig;

  /**
   * Configuração principal do cliente easydbg.
   */
  export interface EasyDBGConfig {
    client: 'postgres' | 'mysql' | 'mssql' | 'oracle';
    connection: ConnectionConfig;
    migrations?: {
      tableName?: string;
      directory?: string;
    };
    pool?: {
      min?: number;
      max?: number;
    };
    debug?: boolean;
  }

  // --- Tipos dos Builders ---

  /**
   * Representa a API fluente para construir consultas SQL.
   */
  export class QueryBuilder<TRecord extends {} = any> {
    select<TResult = TRecord[]>(...columns: string[]): QueryBuilder<TResult>;
    where(column: string, operator: string, value: any): this;
    where(conditions: Partial<TRecord>): this;
    orderBy(column: string, direction?: 'asc' | 'desc'): this;
    limit(value: number): this;
    offset(value: number): this;
    returning<TResult = TRecord[]>(...columns: string[]): QueryBuilder<TResult>;

    get(): Promise<TRecord[]>;
    first(): Promise<TRecord | null>;
    insert(data: Partial<TRecord> | Partial<TRecord>[]): Promise<any>;
    update(data: Partial<TRecord>): Promise<number>;
    delete(): Promise<number>;
  }

  /**
   * Representa a API fluente para definir colunas de uma tabela.
   */
  export class ColumnDefinition {
    notNullable(): this;
    unique(): this;
    primary(): this;
    defaultTo(value: any): this;
  }

  /**
   * Representa a API para definir a estrutura de uma tabela.
   */
  export class TableBuilder {
    increments(name?: string): ColumnDefinition;
    string(name: string, length?: number): ColumnDefinition;
    text(name: string): ColumnDefinition;
    integer(name: string): ColumnDefinition;
    bigInteger(name: string): ColumnDefinition;
    boolean(name: string): ColumnDefinition;
    decimal(name: string, precision?: number, scale?: number): ColumnDefinition;
    timestamp(name: string, options?: { useTz?: boolean }): ColumnDefinition;
    timestamps(useTimestamps?: boolean, defaultToNow?: boolean): void;
    index(columns: string | string[], indexName?: string): void;
    primary(columns: string | string[], constraintName?: string): void;
  }

  /**
   * Representa a API para manipular o esquema do banco de dados.
   */
  export class SchemaBuilder {
    createTable(tableName: string, callback: (table: TableBuilder) => void): Promise<void>;
    dropTable(tableName: string): Promise<void>;
    dropTableIfExists(tableName: string): Promise<void>;
    hasTable(tableName: string): Promise<boolean>;
    renameTable(from: string, to: string): Promise<void>;
  }

  // --- Classe Principal e Transação ---

  /**
   * Interface compartilhada entre o Cliente principal e a Transação.
   */
  interface QueryInterface {
    table<TRecord extends {} = any>(tableName: string): QueryBuilder<TRecord>;
    query<TResult = any>(sql: string, bindings?: any[]): Promise<TResult[]>;
    schema: SchemaBuilder;
    fn: { now: () => any };
  }

  /**
   * Representa uma transação ativa.
   */
  export class Transaction implements QueryInterface {
    table<TRecord extends {} = any>(tableName: string): QueryBuilder<TRecord>;
    query<TResult = any>(sql: string, bindings?: any[]): Promise<TResult[]>;
    schema: SchemaBuilder;
    fn: { now: () => any };
    commit(): Promise<void>;
    rollback(): Promise<void>;
  }

  /**
   * A classe principal do cliente easydbg.
   */
  export class EasyDBGClient implements QueryInterface {
    constructor(config: EasyDBGConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    table<TRecord extends {} = any>(tableName: string): QueryBuilder<TRecord>;
    query<TResult = any>(sql: string, bindings?: any[]): Promise<TResult[]>;
    schema: SchemaBuilder;
    fn: { now: () => any };
    transaction<T>(callback: (trx: Transaction) => Promise<T>): Promise<T>;
  }

  // --- Classes de Erro ---

  export class ConnectionError extends Error {}
  export class QueryError extends Error {
    sql?: string;
    bindings?: any[];
  }
  export class TransactionError extends Error {}
  export class MigrationError extends Error {}

  // --- Exportação Principal ---

  /**
   * Cria e retorna uma nova instância do EasyDBGClient.
   */
  function createClient(config: EasyDBGConfig): EasyDBGClient;

  // Namespace para exportações adicionais
  namespace createClient {
    export const EasyDBGClient: { new(config: EasyDBGConfig): EasyDBGClient };
    export const errors: {
      ConnectionError: typeof ConnectionError;
      QueryError: typeof QueryError;
      TransactionError: typeof TransactionError;
      MigrationError: typeof MigrationError;
    };
  }

  export default createClient;
}
