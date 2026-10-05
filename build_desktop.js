const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  if (!exists) return;
  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      if (childItemName.endsWith('-shm') || childItemName.endsWith('-wal')) return;
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    try {
      fs.copyFileSync(src, dest);
    } catch (e) {
      // Ignore files locked by running processes (e.g. SQLite WAL)
    }
  }
}

async function buildStandaloneDesktop() {
  console.log('--- PACKAGING STANDALONE INDEPENDENT WINDOWS DESKTOP SOFTWARE ---');
  
  const rootDir = __dirname;
  const electronDist = path.join(rootDir, 'node_modules', 'electron', 'dist');
  const targetDir = path.join(rootDir, 'TamilNaduGroceryBilling');

  if (!fs.existsSync(electronDist)) {
    console.error('Electron dist not found at:', electronDist);
    process.exit(1);
  }

  // 1. Create target directory
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 2. Copy Electron distribution files
  console.log('1. Copying Electron runtime binaries...');
  const distFiles = fs.readdirSync(electronDist);
  for (const file of distFiles) {
    if (file === 'resources') continue; // Handle resources specially
    const srcPath = path.join(electronDist, file);
    const destPath = path.join(targetDir, file === 'electron.exe' ? 'TamilNaduGroceryBilling.exe' : file);
    if (!fs.existsSync(destPath)) {
      copyRecursiveSync(srcPath, destPath);
    }
  }

  // 3. Setup resources/app directory
  console.log('2. Setting up resources/app...');
  const resourcesDir = path.join(targetDir, 'resources');
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }

  // Remove default_app.asar if present
  const defaultAppAsar = path.join(resourcesDir, 'default_app.asar');
  if (fs.existsSync(defaultAppAsar)) {
    try { fs.unlinkSync(defaultAppAsar); } catch(e) {}
  }

  const appDir = path.join(resourcesDir, 'app');
  if (!fs.existsSync(appDir)) {
    fs.mkdirSync(appDir, { recursive: true });
  }

  // 4. Copy app files
  console.log('3. Copying server, client build, and assets...');
  
  // Package.json with electron entry point
  const appPkg = {
    name: 'tamilnadu-grocery-gst-billing',
    version: '1.0.0',
    main: 'electron-main.js',
    dependencies: {
      cors: '^2.8.6',
      express: '^5.2.1'
    }
  };
  fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(appPkg, null, 2));

  // Copy electron-main.js
  fs.copyFileSync(path.join(rootDir, 'electron-main.js'), path.join(appDir, 'electron-main.js'));
  
  // Copy app.ico
  if (fs.existsSync(path.join(rootDir, 'app.ico'))) {
    fs.copyFileSync(path.join(rootDir, 'app.ico'), path.join(appDir, 'app.ico'));
  }

  // Copy server/
  copyRecursiveSync(path.join(rootDir, 'server'), path.join(appDir, 'server'));

  // Copy client/dist/
  copyRecursiveSync(path.join(rootDir, 'client', 'dist'), path.join(appDir, 'client', 'dist'));

  // Copy data/ (database)
  if (fs.existsSync(path.join(rootDir, 'data'))) {
    copyRecursiveSync(path.join(rootDir, 'data'), path.join(appDir, 'data'));
  }

  // Copy required node_modules for Express & CORS
  console.log('4. Copying production dependencies...');
  const appNodeModules = path.join(appDir, 'node_modules');
  if (!fs.existsSync(appNodeModules)) {
    fs.mkdirSync(appNodeModules, { recursive: true });
  }
  
  copyRecursiveSync(path.join(rootDir, 'node_modules', 'express'), path.join(appNodeModules, 'express'));
  copyRecursiveSync(path.join(rootDir, 'node_modules', 'cors'), path.join(appNodeModules, 'cors'));

  // Copy all other sub-dependencies in node_modules except electron
  const rootModules = fs.readdirSync(path.join(rootDir, 'node_modules'));
  for (const mod of rootModules) {
    if (mod === 'electron' || mod === '.bin' || mod === '.package-lock.json') continue;
    const srcMod = path.join(rootDir, 'node_modules', mod);
    const destMod = path.join(appNodeModules, mod);
    if (!fs.existsSync(destMod)) {
      copyRecursiveSync(srcMod, destMod);
    }
  }

  console.log('--- STANDALONE DESKTOP APPLICATION CREATED SUCCESSFULLY! ---');
  console.log('Location: ' + path.join(targetDir, 'TamilNaduGroceryBilling.exe'));
}

buildStandaloneDesktop().catch(err => {
  console.error('Build error:', err);
  process.exit(1);
});
