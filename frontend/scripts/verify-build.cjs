const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');
// Vite 5+ puts manifest in .vite/manifest.json by default, but it can be configured.
// We check standard locations.
const manifestPaths = [
    path.join(distDir, '.vite/manifest.json'),
    path.join(distDir, 'manifest.json')
];

console.log('Verifying build output and hashing...');

if (!fs.existsSync(distDir)) {
  console.error('❌ Error: Build directory "dist" not found! Run "npm run build" first.');
  process.exit(1);
}

const manifestPath = manifestPaths.find(p => fs.existsSync(p));

if (!manifestPath) {
  console.error('❌ Error: Manifest file not found in build output! Hashing verification failed.');
  console.error('Checked paths:', manifestPaths);
  process.exit(1);
}

try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const entryChunk = Object.values(manifest).find(chunk => chunk.isEntry);
    
    if (!entryChunk) {
        console.error('❌ Error: No entry chunk found in manifest!');
        process.exit(1);
    }
    
    const entryFile = path.join(distDir, entryChunk.file);
    if (!fs.existsSync(entryFile)) {
        console.error(`❌ Error: Entry file ${entryChunk.file} listed in manifest does not exist!`);
        process.exit(1);
    }
    
    console.log(`✅ Build Verified! Entry point: ${entryChunk.file}`);
    console.log(`✅ Manifest location: ${manifestPath}`);
    
} catch (e) {
    console.error('❌ Error parsing manifest:', e.message);
    process.exit(1);
}
