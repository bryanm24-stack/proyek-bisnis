import mysql from 'mysql2/promise';

async function setupDatabase() {
  let connection;
  try {
    // Connect to MySQL without specifying database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      port: process.env.DB_PORT || 3306,
    });

    console.log('✓ Connected to MySQL');

    // Create databases
    const databases = ['proyek', 'rent_guard'];
    
    for (const db of databases) {
      try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${db}`);
        console.log(`✓ Database '${db}' ready`);
      } catch (err) {
        console.log(`ℹ Database '${db}' already exists`);
      }
    }

    // Load schema for proyek database
    const fs = await import('fs');
    const path = await import('path');
    
    const schemaPath = path.join(process.cwd(), 'sql', 'proyek_bisnis.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      
      // Split SQL file by semicolon and execute each statement
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      // Switch to rent_guard database
      await connection.query('USE rent_guard');
      console.log('✓ Using database: rent_guard');
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await connection.query(statement);
          } catch (err) {
            // Ignore errors for CREATE TABLE IF NOT EXISTS
            if (!err.message.includes('already exists')) {
              console.log(`Note: ${err.message.substring(0, 50)}...`);
            }
          }
        }
      }
      
      console.log('✓ Database schema loaded');
    } else {
      console.log('⚠ Schema file not found at sql/proyek_bisnis.sql');
    }

    await connection.end();
    console.log('\n✅ Database setup complete!');
    console.log('Ready for migration...\n');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

setupDatabase();
