import fs from 'fs/promises';
import path from 'path';

const workspaceRoot = path.resolve(process.cwd());
const routesDir = path.join(workspaceRoot, 'src', 'app', 'api');

const readFileAsyncRegex = /^(\s*)(?:const|let)\s+(\w+)\s*=\s*await\s+fs\.readFile(?:Sync)?\(\s*(\w+)\s*,\s*['"]utf-8['"]\s*\);/;
const readFileSyncRegex = /^(\s*)(?:const|let)\s+(\w+)\s*=\s*fs\.readFileSync\(\s*(\w+)\s*,\s*['"]utf-8['"]\s*\);/;
const readDataFileRegex = /^(\s*)(?:const|let)\s+(\w+)\s*=\s*await\s+readData\('file'\)\s*;$/;
const readDataAssignRegex = /^(\s*)(?:const|let)\s+(\w+)\s*=\s*await\s+readData\('([\w_]+)'\)\s*;$/;
const rawJsonParseReadDataRegex = /^(\s*)const\s+(\w+)\s*=\s*JSON\.parse\(\s*await\s+readData\('([\w_]+)'\)\s*\)\s*;$/;
const writeFileAsyncRegex = /^(\s*)await\s+fs\.writeFile\(\s*(\w+)\s*,\s*JSON\.stringify\(([^,]+),\s*null,\s*2\)\s*(?:,\s*['"]utf-8['"]\s*)?\);/;
const writeFileSyncRegex = /^(\s*)fs\.writeFileSync\(\s*(\w+)\s*,\s*JSON\.stringify\(([^,]+),\s*null,\s*2\)\s*(?:,\s*['"]utf-8['"]\s*)?\);/;
const replaceLineRegex = /^(\s*)(\w+)\s*=\s*\2\.replace\(\/\^\\uFEFF\/, ''\)\.trim\(\)\s*;$/;
const jsonParseRegex = /^(\s*)const\s+(\w+)\s*=\s*JSON\.parse\(\s*(\w+)(?:\.[^)]+)?\s*\)\s*;$/;
const pathJoinJsonRegex = /const\s+(\w+)\s*=\s*path\.join\([^)]*['"]([^'".]+\.json)['"]\)/;
const brokenPathRegex = /^(\s*)(?:const|let)\s+(\w+)\s*=\s*;\s*$/;
const parseJsonFsSyncRegex = /JSON\.parse\(fs\.readFileSync\((\w+),\s*['"]utf-8['"]\)\)/;
const readJsonFileCallRegex = /await\s+readJsonFile\(\s*(\w+)\s*\)/;
const writeJsonFileCallRegex = /await\s+writeJsonFile\(\s*(\w+)\s*,\s*(\w+)\s*\)/;
const parseJsonFileCallRegex = /parseJsonFile\(\s*(\w+)\s*,\s*\[\]\s*\)/;
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(res));
    } else if (entry.isFile() && res.endsWith('route.js')) {
      files.push(res);
    }
  }

  return files;
}

function datasetFromFilename(fileName) {
  return path.basename(fileName, '.json');
}

function inferDatasetFromVarName(varName) {
  const sanitized = varName.replace(/(Path|File|path|file)$/i, '');
  if (!sanitized) return null;
  return sanitized.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

async function migrateFile(filePath) {
  let text = await fs.readFile(filePath, 'utf-8');
  if (!text.includes('fs.readFile') && !text.includes('fs.writeFile') && !text.includes('fs.readFileSync') && !text.includes('fs.writeFileSync') && !text.includes("readData('") && !text.includes('JSON.parse(')) {
    return false;
  }

  const lines = text.split(/\r?\n/);
  const pathVars = {};
  const varDeclared = new Set();
  let changed = false;

  for (let i = 0; i < lines.length; i += 1) {
    const joinMatch = lines[i].match(pathJoinJsonRegex);
    if (joinMatch) {
      const [, varName, fileName] = joinMatch;
      pathVars[varName] = datasetFromFilename(fileName);
    }
  }

  const outputLines = [];
  const fileVarDataset = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    let newLine = line;

    const brokenMatch = line.match(brokenPathRegex);
    if (brokenMatch) {
      const [, indent] = brokenMatch;
      changed = true;
      continue;
    }

    const readDataFileMatch = line.match(readDataFileRegex);
    if (readDataFileMatch) {
      const [, indent, varName] = readDataFileMatch;
      const dataset = inferDatasetFromVarName(varName);
      if (dataset) {
        newLine = `${indent}const ${varName} = await readData('${dataset}');`;
        fileVarDataset.set(varName, dataset);
        changed = true;
      }
    }

    const readDataAssignMatch = line.match(readDataAssignRegex);
    if (readDataAssignMatch) {
      const [, indent, varName, dataset] = readDataAssignMatch;
      fileVarDataset.set(varName, dataset);
    }

    const rawJsonParseReadDataMatch = line.match(rawJsonParseReadDataRegex);
    if (rawJsonParseReadDataMatch) {
      const [, indent, varName, dataset] = rawJsonParseReadDataMatch;
      newLine = `${indent}const ${varName} = await readData('${dataset}');`;
      changed = true;
    }

    const parseMatch = line.match(jsonParseRegex);
    if (parseMatch && fileVarDataset.has(parseMatch[3])) {
      newLine = `${parseMatch[1]}const ${parseMatch[2]} = ${parseMatch[3]};`;
      changed = true;
    }

    const rfMatch = line.match(readFileAsyncRegex) || line.match(readFileSyncRegex);
    if (rfMatch) {
      const [, indent, rawVar, pathVar] = rfMatch;
      const dataset = pathVars[pathVar] || inferDatasetFromVarName(pathVar);
      let dataSetName = dataset;

      const nextLine = lines[i + 1] ?? '';
      const nextNextLine = lines[i + 2] ?? '';
      let skipNext = false;
      let skipNextNext = false;

      const replaceMatch = nextLine.match(replaceLineRegex);
      let parseMatchNext = nextLine.match(jsonParseRegex);
      if (!parseMatchNext) {
        parseMatchNext = nextNextLine.match(jsonParseRegex);
      }

      if (parseMatchNext && parseMatchNext[3] === rawVar) {
        const inferredFromParse = inferDatasetFromVarName(parseMatchNext[2]) || parseMatchNext[2];
        if (inferredFromParse) {
          dataSetName = inferredFromParse;
        }
        newLine = `${indent}const ${parseMatchNext[2]} = await readData('${dataSetName}');`;
        if (newLine !== line) {
          changed = true;
        }
        outputLines.push(newLine);
        if (replaceMatch) i += 1;
        if (parseMatchNext === nextNextLine) i += 1;
        continue;
      }

      if (dataSetName) {
        newLine = `${indent}const ${rawVar} = await readData('${dataSetName}');`;
      }

      if (newLine !== line) {
        changed = true;
      }

      outputLines.push(newLine);
      continue;
    }

    const readJsonFileMatch = line.match(readJsonFileCallRegex);
    if (readJsonFileMatch) {
      const [, pathVar] = readJsonFileMatch;
      const dataset = pathVars[pathVar] || inferDatasetFromVarName(pathVar);
      if (dataset) {
        newLine = line.replace(readJsonFileCallRegex, `await readData('${dataset}')`);
        changed = true;
      }
    }

    const parseJsonFileMatch = line.match(parseJsonFileCallRegex);
    if (parseJsonFileMatch) {
      const [, pathVar] = parseJsonFileMatch;
      const dataset = pathVars[pathVar] || inferDatasetFromVarName(pathVar);
      if (dataset) {
        newLine = line.replace(parseJsonFileCallRegex, `await readData('${dataset}')`);
        changed = true;
      }
    }

    const writeJsonFileMatch = line.match(writeJsonFileCallRegex);
    if (writeJsonFileMatch) {
      const [, pathVar, dataVar] = writeJsonFileMatch;
      const dataset = pathVars[pathVar] || inferDatasetFromVarName(pathVar) || inferDatasetFromVarName(dataVar);
      if (dataset) {
        newLine = line.replace(writeJsonFileCallRegex, `await writeData('${dataset}', ${dataVar})`);
        changed = true;
      }
    }

    const parseFsSyncMatch = line.match(parseJsonFsSyncRegex);
    if (parseFsSyncMatch) {
      const [, pathVar] = parseFsSyncMatch;
      const dataset = pathVars[pathVar] || inferDatasetFromVarName(pathVar);
      if (dataset) {
        newLine = line.replace(parseJsonFsSyncRegex, `await readData('${dataset}')`);
        changed = true;
      }
    }

    const wfMatch = line.match(writeFileAsyncRegex) || line.match(writeFileSyncRegex);
    if (wfMatch) {
      const [, indent, pathVar, dataVar] = wfMatch;
      const dataset = pathVars[pathVar] || inferDatasetFromVarName(pathVar) || inferDatasetFromVarName(dataVar);
      if (dataset) {
        newLine = `${indent}await writeData('${dataset}', ${dataVar});`;
        changed = true;
      }
    }

    outputLines.push(newLine);
  }

  let finalText = outputLines.join('\n');
  if (changed && !finalText.includes("import { readData, writeData } from '@/lib/storage'")) {
    finalText = finalText.replace(/(import .*?\n)/, `$1import { readData, writeData } from '@/lib/storage';\n`);
  }

  if (changed) {
    await fs.writeFile(filePath, finalText, 'utf-8');
  }

  return changed;
}

async function run() {
  const files = await walk(routesDir);
  let updatedFiles = 0;

  for (const file of files) {
    const migrated = await migrateFile(file);
    if (migrated) {
      console.log(`Migrated: ${path.relative(workspaceRoot, file)}`);
      updatedFiles += 1;
    }
  }

  console.log(`Done. Updated ${updatedFiles} route files.`);
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
