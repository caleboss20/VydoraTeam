/**
 * Reliable Expo starter for phone + Expo Go.
 *
 * Hotspot (172.20.10.x): LAN mode (tunnel/ngrok usually times out on school/hotspot data).
 * Normal Wi-Fi: LAN mode.
 * Optional: npm run start:tunnel
 *
 * Usage:
 *   npm start
 *   npm run start:hotspot   (same as start + prints hotspot checklist)
 *   npm run start:tunnel
 */
const { spawn, execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
process.chdir(root);

const forceTunnel =
  process.argv.includes("--tunnel") ||
  process.env.EXPO_USE_TUNNEL === "1" ||
  process.env.npm_lifecycle_event === "start:tunnel";

const hotspotMode =
  process.argv.includes("--hotspot") ||
  process.env.npm_lifecycle_event === "start:hotspot";

function pickLanIp() {
  const nets = os.networkInterfaces();
  const ranked = [];

  for (const [name, addrs] of Object.entries(nets)) {
    if (!addrs) continue;
    const lower = name.toLowerCase();
    if (
      lower.includes("wsl") ||
      lower.includes("hyper-v") ||
      lower.includes("vethernet") ||
      lower.includes("vpn") ||
      lower.includes("virtualbox") ||
      lower.includes("vmware")
    ) {
      continue;
    }
    for (const a of addrs) {
      if (a.family !== "IPv4" && a.family !== 4) continue;
      if (a.internal) continue;
      const ip = a.address;
      if (
        ip.startsWith("127.") ||
        ip.startsWith("169.254.") ||
        ip.startsWith("192.168.56.")
      ) {
        continue;
      }
      let rank = 50;
      if (lower.includes("wi-fi") || lower.includes("wifi") || lower === "wlan") {
        rank = 0;
      } else if (ip.startsWith("172.20.10.")) {
        rank = 10; // iPhone hotspot
      } else if (ip.startsWith("192.168.") || ip.startsWith("10.")) {
        rank = 20;
      }
      ranked.push({ ip, rank, name });
    }
  }

  ranked.sort((a, b) => a.rank - b.rank || a.ip.localeCompare(b.ip));
  return ranked[0]?.ip || null;
}

function writeEnvLocal(lan) {
  const api = `http://${lan}:8080/api/v1`;
  const ws = `http://${lan}:8080/ws`;
  const body = `# Phone / Expo Go - auto-updated by scripts/expo-start.js
EXPO_PUBLIC_API_PREFER=local
EXPO_PUBLIC_API_BASE_LOCAL=${api}
EXPO_PUBLIC_WS_BASE_LOCAL=${ws}
EXPO_PUBLIC_API_BASE=${api}
EXPO_PUBLIC_WS_BASE=${ws}
`;
  fs.writeFileSync(path.join(root, ".env.local"), body, "utf8");
  console.log(`Updated .env.local -> ${api}`);
}

function freePort(port) {
  try {
    if (process.platform === "win32") {
      const out = execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`,
        { encoding: "utf8" }
      );
      const pids = out
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter((s) => /^\d+$/.test(s));
      for (const pid of pids) {
        try {
          process.kill(Number(pid), "SIGTERM");
          console.log(`Freed port ${port} (PID ${pid})`);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* nothing listening */
  }
}

/** Best-effort: open Windows firewall for Metro + API (may need Admin once). */
function ensureFirewallPorts() {
  if (process.platform !== "win32") return;
  try {
    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${path.join(
        __dirname,
        "open-expo-ports.ps1"
      )}"`,
      { stdio: "inherit" }
    );
  } catch {
    console.log(
      "Could not update firewall automatically. Run scripts/open-expo-ports.ps1 as Admin once."
    );
  }
}

const lan = pickLanIp();
const isHotspot = !!(lan && lan.startsWith("172.20.10."));
// Hotspot: use LAN (phone can reach PC at 172.20.10.x). Tunnel usually times out on school data.
const useTunnel = forceTunnel || !lan;

freePort(8081);
ensureFirewallPorts();

if (lan) {
  writeEnvLocal(lan);
}

const env = {
  ...process.env,
  EXPO_NO_TELEMETRY: "1",
  NODE_OPTIONS: [process.env.NODE_OPTIONS, "--dns-result-order=ipv4first"]
    .filter(Boolean)
    .join(" "),
  EXPO_DEVTOOLS_LISTEN_ADDRESS: "0.0.0.0",
};

if (!useTunnel) {
  env.EXPO_OFFLINE = "1";
  if (lan) env.REACT_NATIVE_PACKAGER_HOSTNAME = lan;
}

const expoArgs = ["start", "--port", "8081"];

if (useTunnel) {
  expoArgs.push("--tunnel");
  console.log("");
  console.log("=== TUNNEL MODE ===");
  console.log("Wait for an exp://....exp.direct URL / QR, then scan that.");
  console.log("");
} else {
  expoArgs.push("--lan");
  console.log("");
  if (isHotspot || hotspotMode) {
    console.log("=== IPHONE HOTSPOT MODE (LAN) ===");
    console.log("1. iPhone Settings > Personal Hotspot > Maximize Compatibility = ON");
    console.log("2. PC connected to that hotspot (you are on " + lan + ")");
    console.log("3. Backend running: .\\run-backend.ps1 in vydora-backend");
    console.log("4. In Expo Go / Camera, open EXACTLY:");
    console.log(`      exp://${lan}:8081`);
    console.log("5. Test API in Safari on phone:");
    console.log(`      http://${lan}:8080/health`);
    console.log("   Must show {\"status\":\"ok\"} or the app will time out later.");
    console.log("");
  } else {
    console.log(`LAN IP: ${lan}`);
    console.log(`Metro URL: exp://${lan}:8081`);
    console.log("");
  }
}

console.log("Starting Expo...");
console.log("");

let expoCli;
try {
  expoCli = require.resolve("expo/bin/cli", { paths: [root] });
} catch {
  expoCli = path.join(root, "node_modules", "expo", "bin", "cli");
}

const child = spawn(process.execPath, [expoCli, ...expoArgs], {
  cwd: root,
  env,
  stdio: "inherit",
  windowsHide: true,
});

child.on("error", (err) => {
  console.error("Failed to start Expo:", err.message);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 0));
