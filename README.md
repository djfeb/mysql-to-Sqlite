# MySQL to SQLite Migrator

A simple Node.js tool to migrate data from MySQL database to SQLite.

## Features

- Migrates all tables from MySQL to SQLite
- Automatically converts MySQL data types to SQLite equivalents
- Progress logging for each table
- Environment variable configuration
- Error handling and connection cleanup

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure your database credentials:
```bash
cp .env.example .env
```

3. Edit `.env` file with your MySQL credentials:
```env
MYSQL_USER=your_mysql_username
MYSQL_PASSWORD=your_mysql_password
MYSQL_HOST=your_mysql_host
MYSQL_DATABASE=your_mysql_database
MYSQL_PORT=3306

SQLITE_OUTPUT_FILE=output_database.sqlite
```

## Usage

Run the migration:
```bash
npm start
```


The script will:
1. Connect to your MySQL database
2. Fetch all tables and their schemas
3. Create equivalent tables in SQLite
4. Copy all data from MySQL to SQLite
5. Save the output to the specified SQLite file

## Data Type Conversion

The script automatically converts MySQL data types to SQLite:

| MySQL Type | SQLite Type |
|------------|-------------|
| INT, BIGINT, SMALLINT, etc. | INTEGER |
| VARCHAR, CHAR, TEXT, etc. | TEXT |
| BLOB | BLOB |
| FLOAT, DOUBLE, DECIMAL | REAL |
| DATE, TIME, DATETIME, TIMESTAMP | TEXT |

## Output

The migrated database will be saved as `output_database.sqlite` (or the filename specified in your `.env` file).

## Requirements

- Node.js 14.x or higher
- Access to a MySQL database
- Write permissions in the current directory

## License

MIT
