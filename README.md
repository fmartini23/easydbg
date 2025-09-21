# 🚀 EasyDBG

<div align="center">
  <h3>A modern and unified Database Connector and Query Builder for Node.js</h3>
  <p>Support for PostgreSQL, MySQL, MSSQL, and Oracle with a fluent API</p>
  
  [![npm version](https://badge.fury.io/js/easydbg.svg)](https://badge.fury.io/js/easydbg)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Node.js CI](https://github.com/fmartini23easydbg/workflows/Node.js%20CI/badge.svg)](https://github.com/fmartini23easydbg/actions)
</div>

---

## ✨ Features

- 🚀 **Modern async/await API** - Clean and intuitive Promise-based interface
- 🔧 **Fluent Query Builder** - Chainable methods for building complex queries
- 🗄️ **Schema Builder** - DDL operations with a fluent API
- 🔄 **Database Migrations** - Version control for your database schema
- 🏢 **Multi-database support** - PostgreSQL, MySQL, MSSQL, and Oracle
- 📦 **Connection pooling** - Efficient connection management
- 🔒 **Transaction support** - ACID-compliant transactions
- 🎯 **Type-safe operations** - Better development experience
- 🛠️ **CLI for migrations** - Command-line tools for schema management
- 🌍 **Environment-friendly** - Supports .env configuration

## 📦 Installation

```bash
npm install easydbg

```

## 🚀 Quick Start

```javascript
const easydbg = require('easydbg');

const db = easydbg({
  client: 'postgres',
  connection: {
    host: 'localhost',
    user: 'postgres',
    password: 'password',
    database: 'mydb'
  }
});

async function example() {
  // Simple query
  const users = await db.table('users').where('active', true).get();
  console.log(users);
  
  // Insert new user
  await db.table('users').insert({
    name: 'John Doe',
    email: 'john@example.com',
    active: true
  });
  
  await db.disconnect();
}

example().catch(console.error);
```

## ⚙️ Configuration

Create `easydbgfile.js` in your project root:

```javascript
require('dotenv').config();

module.exports = {
  client: process.env.DB_CLIENT || 'postgres',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'mydb'
  },
  migrations: {
    tableName: 'easydbg_migrations',
    directory: './database/migrations'
  },
  pool: { min: 2, max: 10 },
  debug: process.env.NODE_ENV !== 'production'
};
```

## 📚 Query Builder

### Basic Operations

```javascript
// Select queries
const users = await db.table('users').get();
const activeUsers = await db.table('users').where('active', true).get();
const user = await db.table('users').where('id', 1).first();

// Insert operations
await db.table('users').insert({ name: 'John', email: 'john@example.com' });
await db.table('users').insert([
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' }
]);

// Update operations
await db.table('users').where('id', 1).update({ name: 'Updated Name' });

// Delete operations
await db.table('users').where('active', false).delete();

// Raw queries
const results = await db.query('SELECT * FROM users WHERE age > ?', [18]);
```

### Complex Queries

```javascript
const filteredUsers = await db.table('users')
  .select('id', 'name', 'email')
  .where('active', true)
  .where('age', '>', 18)
  .orderBy('name', 'asc')
  .limit(10)
  .offset(20)
  .get();

// Object-style WHERE
const adminUsers = await db.table('users')
  .where({ active: true, role: 'admin' })
  .get();
```

## 🏗️ Schema Builder

```javascript
// Create table
await db.schema.createTable('users', (table) => {
  table.increments('id').primary();
  table.string('name', 255).notNullable();
  table.string('email', 255).notNullable().unique();
  table.boolean('active').defaultTo(true);
  table.timestamp('created_at').defaultTo(db.fn.now());
  table.timestamp('updated_at').defaultTo(db.fn.now());
});

// Table with foreign keys
await db.schema.createTable('posts', (table) => {
  table.increments('id').primary();
  table.string('title').notNullable();
  table.text('content');
  table.integer('user_id').unsigned().notNullable();
  table.foreign('user_id').references('id').inTable('users');
  table.timestamps(true, true);
});

// Other operations
await db.schema.dropTable('posts');
await db.schema.dropTableIfExists('old_table');
const exists = await db.schema.hasTable('users');
await db.schema.renameTable('old_users', 'users');
```

## 💰 Transactions

### Automatic Management

```javascript
const result = await db.transaction(async (trx) => {
  const user = await trx.table('users').insert({
    name: 'John Doe',
    email: 'john@example.com'
  });
  
  await trx.table('profiles').insert({
    user_id: user.id,
    bio: 'Software Developer'
  });
  
  return user;
});
// Auto-commit on success, auto-rollback on error
```

### Manual Control

```javascript
await db.beginTransaction();
try {
  await db.table('users').insert({ name: 'Test User' });
  await db.table('logs').insert({ action: 'user_created' });
  await db.commit();
} catch (error) {
  await db.rollback();
  throw error;
}
```

## 🔄 Migrations

### CLI Commands

```bash
# Create migration
easydbg make:migration create_users_table

# Run migrations
easydbg migrate:latest

# Rollback migrations
easydbg migrate:rollback
```

### Migration Example

```javascript
// 20231201120000_create_users_table.js
exports.up = async (db) => {
  await db.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password').notNullable();
    table.boolean('active').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = async (db) => {
  await db.schema.dropTableIfExists('users');
};
```

## 🗄️ Database Support

### PostgreSQL
```javascript
const db = easydbg({
  client: 'postgres',
  connection: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'mydb'
  }
});
```

### MySQL
```javascript
const db = easydbg({
  client: 'mysql',
  connection: {
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'mydb'
  }
});
```

### SQL Server
```javascript
const db = easydbg({
  client: 'mssql',
  connection: {
    server: 'localhost',
    user: 'sa',
    password: 'Password123',
    database: 'mydb',
    options: { trustServerCertificate: true }
  }
});
```

### Oracle
```javascript
const db = easydbg({
  client: 'oracle',
  connection: {
    user: 'hr',
    password: 'password',
    connectString: 'localhost:1521/XE'
  }
});
```

## 🚨 Error Handling

```javascript
const { errors } = require('easydbg');

try {
  await db.table('users').get();
} catch (error) {
  if (error instanceof errors.ConnectionError) {
    console.error('Database connection failed:', error.message);
  } else if (error instanceof errors.QueryError) {
    console.error('Query failed:', { sql: error.sql, bindings: error.bindings });
  } else if (error instanceof errors.TransactionError) {
    console.error('Transaction failed:', error.message);
  } else if (error instanceof errors.MigrationError) {
    console.error('Migration failed:', error.message);
  }
}
```

## 🧪 Testing

```bash
npm test          # Run tests
npm run test:watch # Watch mode
npm run lint      # Linting
npm run lint:fix  # Fix linting issues
```

## 📖 Examples

Check the `examples/` directory:
- [`postgres-example.js`](examples/postgres-example.js)
- [`mysql-example.js`](examples/mysql-example.js)
- [`mssql-example.js`](examples/mssql-example.js)
- [`oracle-example.js`](examples/oracle-example.js)

## 📋 API Reference

### EasyDBGClient Methods
| Method | Description |
|--------|-------------|
| `connect()` | Establish connection |
| `disconnect()` | Close connection |
| `table(name)` | Create query builder |
| `query(sql, bindings)` | Execute raw SQL |
| `transaction(callback)` | Execute in transaction |
| `beginTransaction()` | Start transaction |
| `commit()` | Commit transaction |
| `rollback()` | Rollback transaction |

### QueryBuilder Methods
| Method | Description |
|--------|-------------|
| `select(...columns)` | Select columns |
| `where(column, operator, value)` | Add WHERE clause |
| `orderBy(column, direction)` | Add ORDER BY |
| `limit(count)` | Limit results |
| `get()` | Execute and return all |
| `first()` | Execute and return first |
| `insert(data)` | Insert records |
| `update(data)` | Update records |
| `delete()` | Delete records |

### SchemaBuilder Methods
| Method | Description |
|--------|-------------|
| `createTable(name, callback)` | Create table |
| `dropTable(name)` | Drop table |
| `hasTable(name)` | Check if exists |
| `renameTable(from, to)` | Rename table |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.