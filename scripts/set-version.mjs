import fs from 'node:fs';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  throw new Error(`Expected a SemVer version, received: ${version ?? '<missing>'}`);
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

const packageJson = readJson('package.json');
packageJson.version = version;
writeJson('package.json', packageJson);

const tauriConfig = readJson('src-tauri/tauri.conf.json');
tauriConfig.version = version;
writeJson('src-tauri/tauri.conf.json', tauriConfig);

const cargoManifestPath = 'src-tauri/Cargo.toml';
const cargoManifest = fs.readFileSync(cargoManifestPath, 'utf8');
const updatedCargoManifest = cargoManifest.replace(
  /(^version\s*=\s*")[^"]+(")/m,
  `$1${version}$2`,
);
if (updatedCargoManifest === cargoManifest) {
  throw new Error(`Could not find the package version in ${cargoManifestPath}`);
}
fs.writeFileSync(cargoManifestPath, updatedCargoManifest);

const cargoLockPath = 'src-tauri/Cargo.lock';
const cargoLock = fs.readFileSync(cargoLockPath, 'utf8');
const updatedCargoLock = cargoLock.replace(
  /(name = "discord-quest-completer"\r?\nversion = ")[^"]+(")/,
  `$1${version}$2`,
);
if (updatedCargoLock === cargoLock) {
  throw new Error(`Could not find the package version in ${cargoLockPath}`);
}
fs.writeFileSync(cargoLockPath, updatedCargoLock);

console.log(`Using automatic application version ${version}`);
