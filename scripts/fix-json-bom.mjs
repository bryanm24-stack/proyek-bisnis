import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const jsonFiles = [
  'users.json',
  'deals.json',
  'chats.json',
  'invoices.json',
  'transactions.json',
  'ratings.json',
  'promos.json'
];

console.log('🔧 Fixing BOM in JSON files...\n');

for (const file of jsonFiles) {
  const filePath = path.join(rootDir, file);
  
  try {
    // Read file as binary
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if BOM exists
    if (content.charCodeAt(0) === 0xFEFF) {
      // Remove BOM
      content = content.slice(1);
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ Fixed BOM in ${file}`);
    } else {
      // Still validate JSON
      JSON.parse(content);
      console.log(`✓ ${file} OK (no BOM)`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log('\n✅ All JSON files processed!');
