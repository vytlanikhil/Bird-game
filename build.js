const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TARGET_DIRS = ['dist', 'public', 'build'];

const FILES_TO_COPY = [
  'index.html',
  'style.css',
  'game.js',
  'server.js',
  'README.md'
];

const FOLDERS_TO_COPY = [
  'assets',
  'assests'
];

function copyFolderRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📦 Building static distribution for Vercel...');

for (const target of TARGET_DIRS) {
  const targetPath = path.join(ROOT, target);
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }

  // Copy files
  for (const file of FILES_TO_COPY) {
    const src = path.join(ROOT, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(targetPath, file));
    }
  }

  // Copy asset folders
  for (const folder of FOLDERS_TO_COPY) {
    const src = path.join(ROOT, folder);
    if (fs.existsSync(src)) {
      copyFolderRecursive(src, path.join(targetPath, folder));
    }
  }
  console.log(`✅ Prepared output directory: /${target}`);
}

console.log('🚀 Build ready for any Vercel preset (root, dist, public, or build)!');
