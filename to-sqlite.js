require('dotenv').config();
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

// MySQL connection details from environment variables
const mysqlConfig = {
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  host: process.env.MYSQL_HOST,
  database: process.env.MYSQL_DATABASE,
  port: parseInt(process.env.MYSQL_PORT || '3306', 10)
};

// SQLite output file from environment variables
const sqliteOutputFile = process.env.SQLITE_OUTPUT_FILE || 'output_database.sqlite';

// Helper function to promisify SQLite operations
function createSQLiteConnection(dbPath) {
  const db = new sqlite3.Database(dbPath);
  return {
    run: promisify(db.run.bind(db)),
    all: promisify(db.all.bind(db)),
    exec: promisify(db.exec.bind(db)),
    close: promisify(db.close.bind(db))
  };
}

// Convert MySQL data types to SQLite
function convertDataType(mysqlType) {
  const type = mysqlType.toLowerCase();
  
  if (type.includes('int')) {
    return 'INTEGER';
  } else if (type.includes('char') || type.includes('text')) {
    return 'TEXT';
  } else if (type.includes('blob')) {
    return 'BLOB';
  } else if (type.includes('float') || type.includes('double') || type.includes('decimal')) {
    return 'REAL';
  } else if (type.includes('date') || type.includes('time') || type.includes('year')) {
    return 'TEXT';
  } else {
    return 'TEXT';
  }
}

async function migrateData() {
  let mysqlConnection;
  let sqliteDb;

  try {
    // Connect to MySQL
    console.log('Connecting to MySQL...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    
    // Connect to SQLite
    console.log(`Connecting to SQLite (${sqliteOutputFile})...`);
    sqliteDb = createSQLiteConnection(sqliteOutputFile);

    // Get all tables from MySQL
    console.log('Fetching tables from MySQL...');
    const [tables] = await mysqlConnection.query('SHOW TABLES');
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      console.log(`\nProcessing table: ${tableName}`);

      // Get table schema from MySQL
      const [schema] = await mysqlConnection.query(`DESCRIBE ${tableName}`);

      // Create table in SQLite
      const columns = schema.map(column => {
        const colName = column.Field;
        const colType = column.Type;
        const sqliteType = convertDataType(colType);
        return `${colName} ${sqliteType}`;
      });

      const columnsStr = columns.join(', ');
      const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnsStr})`;
      
      console.log(`Creating table: ${tableName}`);
      await sqliteDb.run(createTableQuery);

      // Fetch data from MySQL table
      console.log(`Fetching data from ${tableName}...`);
      const [rows] = await mysqlConnection.query(`SELECT * FROM ${tableName}`);
      
      if (rows.length === 0) {
        console.log(`No data found in ${tableName}`);
        continue;
      }

      // Insert data into SQLite table using transactions for speed
      console.log(`Inserting ${rows.length} rows into ${tableName}...`);
      const placeholders = schema.map(() => '?').join(', ');
      const insertQuery = `INSERT INTO ${tableName} VALUES (${placeholders})`;

      // Use transaction for much faster inserts
      await sqliteDb.run('BEGIN TRANSACTION');
      
      try {
        let insertedCount = 0;
        const batchSize = 1000;
        
        for (let i = 0; i < rows.length; i++) {
          const values = Object.values(rows[i]);
          await sqliteDb.run(insertQuery, values);
          insertedCount++;
          
          // Show progress every 1000 rows
          if (insertedCount % batchSize === 0) {
            console.log(`  Progress: ${insertedCount}/${rows.length} rows (${Math.round(insertedCount/rows.length*100)}%)`);
          }
        }
        
        await sqliteDb.run('COMMIT');
        console.log(`✓ Completed ${tableName} - ${insertedCount} rows inserted`);
      } catch (error) {
        await sqliteDb.run('ROLLBACK');
        throw error;
      }
    }

    console.log('\n✓ Data has been successfully exported to SQLite.');

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    // Close connections
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('MySQL connection closed');
    }
    if (sqliteDb) {
      await sqliteDb.close();
      console.log('SQLite connection closed');
    }
  }
}

// Run the migration
migrateData().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
