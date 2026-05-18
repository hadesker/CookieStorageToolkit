#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const targets = new Set(['chrome', 'firefox']);
const target = args.find((arg) => targets.has(arg)) || 'chrome';
const shouldZip = args.includes('zip') || args.includes('--zip');
const invalidArgs = args.filter((arg) => !targets.has(arg) && arg !== 'zip' && arg !== '--zip');

if (invalidArgs.length) {
  console.error('Usage: node scripts/build-extension.js <chrome|firefox> [zip|--zip]');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'dist', target);
const manifestSource = path.join(root, `manifest.${target}.json`);
const manifest = JSON.parse(fs.readFileSync(manifestSource, 'utf8'));

const packageEntries = [
  'src/assets',
  'src/background',
  'src/sidepanel'
];

function shouldIgnorePackageEntry(filePath) {
  const parts = filePath.split(path.sep);
  const basename = path.basename(filePath);
  return parts.includes('__MACOSX') ||
    basename === '.DS_Store' ||
    basename.startsWith('._') ||
    basename.startsWith('.');
}

function copyRecursive(source, destination) {
  if (shouldIgnorePackageEntry(source)) {
    return;
  }

  const stats = fs.statSync(source);
  if (stats.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function sanitizeVersion(version) {
  return String(version || '0.0.0')
    .trim()
    .replace(/[^0-9A-Za-z._-]+/g, '-');
}

function removePreviousZipFiles() {
  const distDir = path.join(root, 'dist');
  if (!fs.existsSync(distDir)) {
    return;
  }

  for (const entry of fs.readdirSync(distDir)) {
    const isLegacyZip = entry === `${target}.zip`;
    const isVersionedZip = entry.startsWith(`${target}-v`) && entry.endsWith('.zip');
    if (isLegacyZip || isVersionedZip) {
      fs.rmSync(path.join(distDir, entry), { force: true });
    }
  }
}

function zipBuild() {
  const version = sanitizeVersion(manifest.version);
  const zipPath = path.join(root, 'dist', `${target}-v${version}.zip`);
  removePreviousZipFiles();
  execFileSync('zip', [
    '-r',
    '-X',
    zipPath,
    '.',
    '-x',
    '*.DS_Store',
    '*/.DS_Store',
    '__MACOSX/*',
    '*/__MACOSX/*',
    '._*',
    '*/._*',
    '.*',
    '*/.*'
  ], {
    cwd: outputDir,
    stdio: 'inherit'
  });
  console.log(`Packaged ${target} extension in ${path.relative(root, zipPath)}`);
}

function assertExists(relativePath) {
  if (!fs.existsSync(path.join(outputDir, relativePath))) {
    throw new Error(`Missing built file: ${relativePath}`);
  }
}

function addIconPaths(paths, icons) {
  if (!icons) {
    return;
  }

  for (const iconPath of Object.values(icons)) {
    paths.add(iconPath);
  }
}

function addManifestReferences(paths, manifest) {
  addIconPaths(paths, manifest.icons);
  addIconPaths(paths, manifest.action && manifest.action.default_icon);
  addIconPaths(paths, manifest.sidebar_action && manifest.sidebar_action.default_icon);

  if (manifest.background && manifest.background.service_worker) {
    paths.add(manifest.background.service_worker);
  }

  if (manifest.background && Array.isArray(manifest.background.scripts)) {
    for (const script of manifest.background.scripts) {
      paths.add(script);
    }
  }

  if (manifest.side_panel && manifest.side_panel.default_path) {
    paths.add(manifest.side_panel.default_path);
  }

  if (manifest.sidebar_action && manifest.sidebar_action.default_panel) {
    paths.add(manifest.sidebar_action.default_panel);
  }
}

function shouldIgnoreReference(reference) {
  return !reference ||
    reference.startsWith('#') ||
    /^[a-z][a-z0-9+.-]*:/i.test(reference) ||
    reference.startsWith('data:');
}

function normalizeReference(fromFile, reference) {
  const cleanReference = reference.split('#')[0].split('?')[0];
  if (shouldIgnoreReference(cleanReference)) {
    return null;
  }

  return path.normalize(path.join(path.dirname(fromFile), cleanReference));
}

function addHtmlReferences(paths, htmlPath) {
  const html = fs.readFileSync(path.join(outputDir, htmlPath), 'utf8');
  const attrPattern = /\b(?:src|href)=["']([^"']+)["']/g;
  let match;

  while ((match = attrPattern.exec(html))) {
    const reference = normalizeReference(htmlPath, match[1]);
    if (reference) {
      paths.add(reference);
    }
  }

  const srcsetPattern = /\bsrcset=["']([^"']+)["']/g;
  while ((match = srcsetPattern.exec(html))) {
    for (const candidate of match[1].split(',')) {
      const reference = normalizeReference(htmlPath, candidate.trim().split(/\s+/)[0]);
      if (reference) {
        paths.add(reference);
      }
    }
  }
}

function addCssReferences(paths, cssPath) {
  const css = fs.readFileSync(path.join(outputDir, cssPath), 'utf8');
  const urlPattern = /url\((['"]?)([^'")]+)\1\)/g;
  let match;

  while ((match = urlPattern.exec(css))) {
    const reference = normalizeReference(cssPath, match[2]);
    if (reference) {
      paths.add(reference);
    }
  }
}

function validateBuild(manifest) {
  const referencedPaths = new Set();
  addManifestReferences(referencedPaths, manifest);

  for (const referencedPath of Array.from(referencedPaths)) {
    if (referencedPath.endsWith('.html')) {
      addHtmlReferences(referencedPaths, referencedPath);
    }
  }

  for (const referencedPath of Array.from(referencedPaths)) {
    if (referencedPath.endsWith('.css')) {
      addCssReferences(referencedPaths, referencedPath);
    }
  }

  for (const referencedPath of referencedPaths) {
    assertExists(referencedPath);
  }
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const entry of packageEntries) {
  copyRecursive(path.join(root, entry), path.join(outputDir, entry));
}

fs.copyFileSync(manifestSource, path.join(outputDir, 'manifest.json'));
validateBuild(manifest);
console.log(`Built ${target} extension in ${path.relative(root, outputDir)}`);

if (shouldZip) {
  zipBuild();
}
