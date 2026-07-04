const fs = require('fs').promises;
const path = require('path');

async function walk(dir, filelist = []) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const res = path.resolve(dir, file.name);
    if (file.isDirectory()) {
      await walk(res, filelist);
    } else if (file.isFile() && (res.endsWith('.js') || res.endsWith('.mjs'))) {
      filelist.push(res);
    }
  }
  return filelist;
}

function replaceAll(str, map) {
  let out = str;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  return out;
}

function jsonBasename(filename) {
  return path.basename(filename).replace(/\.json$/i, '');
}

async function migrateFile(filePath) {
  let src = await fs.readFile(filePath, 'utf8');
  if (!src.includes('.json')) return false;

  const hasStorageImport = src.includes("@/lib/storage") || src.includes("./src/lib/storage");
  if (!hasStorageImport) {
    // inject after first import block
    const importMatch = src.match(/(^import[\s\S]*?from .*?;\s*)+/m);
    if (importMatch) {
      const idx = importMatch.index + importMatch[0].length;
      src = src.slice(0, idx) + "\nimport { readData, writeData } from '@/lib/storage';\n" + src.slice(idx);
    } else {
      // no imports, add at top
      src = "import { readData, writeData } from '@/lib/storage';\n" + src;
    }
  }

  // Patterns to replace
  // fs.readFile(path.join(process.cwd(), 'X.json'), 'utf-8') -> await readData('X')
  src = src.replace(/fs\.readFile\([^,]+['"]([^'"\\/]+\.json)['"][^)]*\)/g, (m, p1) => {
    const name = jsonBasename(p1);
    return `await readData('${name}')`;
  });

  // fs.readFileSync(... 'X.json') -> readData('X') (sync to async; caller may not be async)
  src = src.replace(/fs\.readFileSync\([^,]+['"]([^'"\\/]+\.json)['"][^)]*\)/g, (m, p1) => {
    const name = jsonBasename(p1);
    return `await readData('${name}')`;
  });

  // fs.writeFile(path.join(process.cwd(), 'X.json'), JSON.stringify(var, null, 2)) -> await writeData('X', var)
  src = src.replace(/fs\.writeFile\([^,]+['"]([^'"\\/]+\.json)['"],\s*JSON\.stringify\(([^)]+)\)[^)]*\)/g, (m, p1, p2) => {
    const name = jsonBasename(p1);
    const varname = p2.trim();
    return `await writeData('${name}', ${varname})`;
  });

  // fs.writeFileSync(... JSON.stringify(var...)) -> await writeData
  src = src.replace(/fs\.writeFileSync\([^,]+['"]([^'"\\/]+\.json)['"],\s*JSON\.stringify\(([^)]+)\)[^)]*\)/g, (m, p1, p2) => {
    const name = jsonBasename(p1);
    const varname = p2.trim();
    return `await writeData('${name}', ${varname})`;
  });

  // require('./x.json') -> await readData('x')  (note: caller may be sync)
  src = src.replace(/require\(['"](.+?\.json)['"]\)/g, (m, p1) => {
    const name = jsonBasename(p1);
    return `await readData('${name}')`;
  });

  // path.join(process.cwd(), 'x.json') definitions removal: leave harmless
  src = src.replace(/path\.join\(process\.cwd\(\),\s*['"][^'"\\/]+\.json['"]\)/g, (m) => '');

  // write back
  await fs.writeFile(filePath, src, 'utf8');
  return true;
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const target = path.join(root, 'src', 'app');
  const files = await walk(target);
  let changed = 0;
  for (const f of files) {
    try {
      const ok = await migrateFile(f);
      if (ok) changed++;
    } catch (err) {
      console.error('Failed to migrate', f, err.message);
    }
  }

  console.log(`Migration complete. Modified ${changed} files under src/app.`);
}

main().catch(err => { console.error(err); process.exit(1); });
