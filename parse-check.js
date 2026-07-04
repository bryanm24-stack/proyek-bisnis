const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('src/app/admin/customer-verification/page.js', 'utf8');
const lines = code.split(/\r?\n/);
console.log('len', code.length);
console.log('line 355:', lines[354]);
console.log('last 200 chars:', JSON.stringify(code.slice(-200)));
try {
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('PARSED OK');
} catch (e) {
  console.error('ERROR', e.message);
  if (e.loc) {
    console.error('LOC', JSON.stringify(e.loc));
    console.error('LINE', lines[e.loc.line - 1]);
    const start = Math.max(0, e.loc.index - 80);
    const end = Math.min(code.length, e.loc.index + 80);
    console.error('CTX', JSON.stringify(code.slice(start, end)));
  }
  process.exit(1);
}
