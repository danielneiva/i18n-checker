import * as dotenv from 'dotenv'

const fs = require('fs');
const path = require('path');

dotenv.config();

// Caminho base das traduções
const i18nPath = path.resolve(process.env.LANGUAGE_DIR);

// Recursivamente encontra todos os arquivos .ts dentro de um idioma
function getAllTranslationFiles(dir: string): string[] {
  let files: string[] = [];

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      files = files.concat(getAllTranslationFiles(fullPath));
    } else if (entry.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Plana objeto aninhado em chaves tipo "dashboard.title"
function flattenKeys(obj: any, prefix = ''): Record<string, true> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(acc, flattenKeys(value, fullKey));
    } else {
      acc[fullKey] = true;
    }
    return acc;
  }, {} as Record<string, true>);
}

// Carrega todas as chaves de um idioma
async function loadLanguageKeys(lang: string): Promise<Record<string, true>> {
  const langDir = path.join(i18nPath, lang);
  const files = getAllTranslationFiles(langDir);

  const keys: Record<string, true> = {};

  for (const file of files) {
    try {
      const mod = require(file);
      const obj = mod.default;
      Object.assign(keys, flattenKeys(obj));
    } catch (err) {
      console.error(`❌ Erro ao importar ${file}:`, err);
    }
  }

  return keys;
}

async function main() {
  const languages = fs.readdirSync(i18nPath).filter(dir =>
    fs.statSync(path.join(i18nPath, dir)).isDirectory()
  );

  if (languages.length < 2) {
    console.error('❗ É necessário pelo menos dois idiomas para comparar.');
    return;
  }

  const baseLang = 'pt';
  const baseKeys = await loadLanguageKeys(baseLang);

  console.log(`📘 Idioma base: ${baseLang}`);

  for (const lang of languages) {
    if (lang !== baseLang ) {
      const currentKeys = await loadLanguageKeys(lang);
      //console.log(baseKeys);
      const missing = Object.keys(baseKeys).filter(k => !currentKeys[k]);
      const extra = Object.keys(currentKeys).filter(k => !baseKeys[k]);
  
      if (missing.length || extra.length) {
        console.log(`\n🌐 Diferenças em "${lang}":`);
  
        if (missing.length) {
          console.log(`  ❌ Faltando (${missing.length}):`);
          missing.forEach(k => console.log(`   ❌ - ${k}`));
        }
  
        if (extra.length) {
          console.log(`  ⚠️ Sobrando (${extra.length}):`);
          extra.forEach(k => console.log(`   ⚠️ - ${k}`));
        }
      } else {
        console.log(`✅ "${lang}" OK — todas as chaves presentes.`);
      }
    }
  }
}

main().catch(console.error);

