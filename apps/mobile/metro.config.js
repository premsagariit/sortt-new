// metro.config.js
// Expo + pnpm monorepo configuration
//
// ── OneDrive workaround ───────────────────────────────────────────────────────
// The project lives inside an OneDrive-synced directory.  OneDrive's background
// sync process locks/delays filesystem events, causing Metro's native Watchman
// watcher to time-out before it can start ("Failed to start watch mode").
// Setting WATCHMAN_DISABLE here (before any Metro code runs) forces Metro to
// fall back to the Node.js fs.watch-based watcher, which is more tolerant of
// cloud-sync interference.
process.env.WATCHMAN_DISABLE = '1';
process.env.EXPO_USE_POLLING = '1';
process.env.CHOKIDAR_USEPOLLING = '1';

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const sharedPackagesRoot = path.resolve(workspaceRoot, 'packages');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// ── Monorepo: watch only shared workspace packages to avoid watcher overload ──
// Watching the whole workspace root in OneDrive paths can exceed watcher limits.
config.watchFolders = [...(config.watchFolders || []), sharedPackagesRoot];

// ── Resolver: look up modules from the workspace root first ──
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// ── Watcher: increase startup timeout & disable Watchman health-check ────────
// Watchman (or the Node-based fallback) can be slow to start on OneDrive paths.
config.watcher = {
  ...config.watcher,
  healthCheck: {
    enabled: false,
  },
};

module.exports = config;
