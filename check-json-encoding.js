const fs = require('fs');

const buffer = fs.readFileSync('chats.json');

// Check for BOM
if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
  console.log('⚠️ UTF-8 BOM detected! Removing...');
  const cleaned = buffer.slice(3).toString('utf-8');
  const data = JSON.parse(cleaned);
  console.log('✅ File parsed successfully after removing BOM');
  console.log('Total chats:', data.length);
} else {
  console.log('No BOM detected');
  try {
    const data = JSON.parse(buffer.toString('utf-8'));
    console.log('✅ File parsed successfully');
    console.log('Total chats:', data.length);
  } catch (e) {
    console.log('❌ Parse error:', e.message);
    console.log('First 100 chars:', buffer.toString('utf-8').substring(0, 100));
    console.log('Buffer hex:', buffer.slice(0, 20).toString('hex'));
  }
}
