#!/usr/bin/env node

const { spawn } = require("node:child_process");
const os = require("node:os");

function pickLanIpv4() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, infos] of Object.entries(interfaces)) {
    if (!Array.isArray(infos)) {
      continue;
    }

    for (const info of infos) {
      if (!info || info.family !== "IPv4" || info.internal) {
        continue;
      }

      const addr = info.address;
      if (!addr) {
        continue;
      }

      const isPrivate =
        addr.startsWith("10.") ||
        addr.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(addr);

      candidates.push({
        name: name.toLowerCase(),
        addr,
        isPrivate
      });
    }
  }

  const preferred = candidates.find((c) => c.isPrivate && c.name.includes("wi-fi"));
  if (preferred) {
    return preferred.addr;
  }

  const anyPrivate = candidates.find((c) => c.isPrivate);
  if (anyPrivate) {
    return anyPrivate.addr;
  }

  return candidates[0]?.addr;
}

const rawArgs = process.argv.slice(2);
const passthroughArgs = rawArgs.filter((arg) => arg !== "--devmode");
const commandArgs = ["--filter", "mobile", "dev"];
const lanIp = pickLanIpv4();
const childEnv = {
  ...process.env
};

if (lanIp && !childEnv.REACT_NATIVE_PACKAGER_HOSTNAME) {
  childEnv.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp;
}

if (passthroughArgs.length > 0) {
  commandArgs.push("--", ...passthroughArgs);
}

const child = spawn("pnpm", commandArgs, {
  env: childEnv,
  stdio: "inherit",
  shell: process.platform === "win32"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
