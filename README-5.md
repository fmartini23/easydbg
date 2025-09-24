# easydbg

[![NPM Version](https://img.shields.io/npm/v/easydbg.svg )](https://www.npmjs.com/package/easydbg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg )](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/your-username/easydbg/actions/workflows/ci.yml/badge.svg )](https://github.com/your-username/easydbg/actions)

**easydbg** is a modern database toolkit and Query Builder for Node.js. It provides a fluent, consistent API for interacting with multiple SQL databases, allowing you to write cleaner, safer, and more portable code.

---

## ✨ Key Features

- **Unified API:** Write the same code to interact with **PostgreSQL**, **MySQL**, **Microsoft SQL Server**, and **Oracle**.  
- **Advanced Query Builder:** Build complex queries programmatically with `JOINs`, aggregations (`count`, `sum`), `GROUP BY`, and subqueries.  
- **Schema Builder & Migrations:** Manage your database schema's evolution with a robust migration system and a powerful CLI.  
- **Seeding System:** Populate your database with test or initial data using simple CLI commands.  
- **Transactions with Savepoints:** Full support for atomic transactions, including safe nesting of operations.  
- **Debug Mode:** See the exact SQL queries being executed to make debugging easier.  

---

## 🏁 Getting Started

### 1. Installation

Install `easydbg` and the database driver you will be using. `easydbg` uses `peerDependencies`, so you only install what you need:

```bash
# Install the main package
npm install easydbg

# And install the driver for your database:
npm install pg         # For PostgreSQL
npm install mysql2     # For MySQL
npm install mssql      # For Microsoft SQL Server
npm install oracledb   # For Oracle
```

### 2. Configuration

Create an `easydbgfile.js` file in the root of your project:

```javascript
// easydbgfile.js
'use strict';
require('dotenv').config();

module.exports = {
  client: process.env.DB_CLIENT || 'postgres',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
  migrations: {
    tableName: 'easydbg_migrations',
    directory: './database/migrations',
  },
  seeds: {
    directory: './database/seeds',
  },
  // Enable to log SQL queries to the console
  debug: process.env.NODE_ENV !== 'production',
};
```

Also, create a `.env` file for your credentials:

```env
# .env
DB_CLIENT=postgres
DB_HOST=localhost
DB_USER=postgres_user
DB_PASSWORD=secret
DB_DATABASE=my_app
```

---

## 📖 API Guide

### Advanced Query Builder

#### JOINs

```javascript
const usersWithProfiles = await db.table('users')
  .select('users.name', 'profiles.bio')
  .join('profiles', 'users.id', '=', 'profiles.user_id')
  .where('users.active', true)
  .get();
```

#### Aggregations & Grouping

```javascript
const orderStats = await db.table('orders')
  .select('user_id')
  .count('id as order_count')
  .sum('amount as total_spent')
  .groupBy('user_id')
  .having('total_spent', '>', 1000)
  .get();
```

#### Insert, Update, Delete

```javascript
// Insert
const [insertedId] = await db.table('users').insert({ name: 'Jane Doe' }).returning('id');

// Update
await db.table('users').where('id', 1).update({ name: 'Jane Smith' });

// Delete
await db.table('users').where('active', false).delete();
```

---

### Transactions with Savepoints

Execute atomic operations safely. `easydbg` handles nesting automatically.

```javascript
async function updateUserAndLog(userData, trx) {
  // Nested transaction (will become a SAVEPOINT)
  await trx.transaction(async (nestedTrx) => {
    await nestedTrx.table('users').where('id', userData.id).update(userData);
    await nestedTrx.table('audit_logs').insert({
      message: `User ${userData.id} updated.`,
    });
  });
}

try {
  // Main transaction
  await db.transaction(async (trx) => {
    // Pass the transaction object 'trx' to the nested function
    await updateUserAndLog({ id: 1, name: 'New Name' }, trx);
    
    // Other operations in the main transaction...
    await trx.table('invoices').insert({ user_id: 1, amount: 10 });
  });
  console.log('Everything was committed successfully!');
} catch (error) {
  console.error('An error occurred, everything was rolled back.', error);
}
```

---

## ⚙️ CLI: Migrations & Seeds

Manage your database directly from the command line.

### Migrations

```bash
# 1. Create a new migration file
npx easydbg make:migration create_products_table

# 2. Edit the generated file in `database/migrations`

# 3. Run all pending migrations
npx easydbg migrate:latest

# 4. Roll back the last batch of migrations
npx easydbg migrate:rollback
```

#### Migration Example (Schema Builder)

```javascript
// database/migrations/xxxx_create_products_table.js
'use strict';

exports.up = async (db) => {
  await db.schema.createTable('products', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.integer('category_id').notNullable();
    table.timestamps(true, true);

    // Creating a foreign key
    table.foreign('category_id').references('id').on('categories').onDelete('CASCADE');
  });
};

exports.down = async (db) => {
  await db.schema.dropTableIfExists('products');
};
```

---

### Seeding

```bash
# 1. Create a new seed file
npx easydbg make:seed initial_categories

# 2. Edit the generated file in `database/seeds`

# 3. Run all seed files
npx easydbg seed:run
```

#### Seed Example

```javascript
// database/seeds/initial_categories.js
'use strict';

exports.seed = async (db) => {
  // Clear the table to avoid duplicates
  await db.table('categories').delete();

  // Insert data
  await db.table('categories').insert([
    { name: 'Electronics' },
    { name: 'Books' },
  ]);
};
```

---

## 🤝 Contributing

Contributions are welcome!  

1. Fork the project.  
2. Create your feature branch:  
   ```bash
   git checkout -b feature/my-feature
   ```
3. Commit your changes:  
   ```bash
   git commit -m 'Add my feature'
   ```
4. Push to the branch:  
   ```bash
   git push origin feature/my-feature
   ```
5. Open a Pull Request.  

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
