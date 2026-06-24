import fs from "node:fs";

export function verifyReleaseVersions({
  tagName,
  rootPackageVersion,
  desktopPackageVersion,
  cargoVersion,
  tauriVersion
}) {
  if (!tagName.startsWith("v")) {
    throw new Error("Release tag must start with v");
  }

  assertVersion(`Release tag ${tagName}`, stripTagPrefix(tagName), rootPackageVersion, "root package");
  assertVersion(
    "Desktop package version",
    desktopPackageVersion,
    rootPackageVersion,
    "root package"
  );
  assertVersion("Cargo version", cargoVersion, rootPackageVersion, "root package");
  assertVersion("Tauri config version", tauriVersion, rootPackageVersion, "root package");
}

export function buildUpdaterEndpoint(repository) {
  if (!repository) {
    throw new Error("GitHub repository is required to build updater endpoint");
  }

  return `https://github.com/${repository}/releases/latest/download/latest.json`;
}

export function assertReleaseSigningEnvironment(env) {
  assertEnv(env, "TAURI_SIGNING_PRIVATE_KEY");
  assertEnv(env, "TAURI_SIGNING_PRIVATE_KEY_PASSWORD");
  assertEnv(env, "TAURI_UPDATER_PUBLIC_KEY");
}

export function prepareTauriReleaseConfig({ config, env }) {
  assertEnv(env, "GITHUB_REPOSITORY");
  assertReleaseSigningEnvironment(env);

  return patchTauriUpdaterConfig(config, {
    endpoint: buildUpdaterEndpoint(env.GITHUB_REPOSITORY),
    publicKey: env.TAURI_UPDATER_PUBLIC_KEY
  });
}

export function patchTauriUpdaterConfig(config, { endpoint, publicKey }) {
  if (!endpoint) {
    throw new Error("Updater endpoint is required");
  }

  if (!publicKey) {
    throw new Error("Updater public key is required");
  }

  return {
    ...config,
    bundle: {
      ...(config.bundle ?? {}),
      createUpdaterArtifacts: true
    },
    plugins: {
      ...(config.plugins ?? {}),
      updater: {
        endpoints: [endpoint],
        pubkey: publicKey
      }
    }
  };
}

export function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

export function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function stripTagPrefix(tagName) {
  return tagName.startsWith("v") ? tagName.slice(1) : tagName;
}

function assertVersion(label, actual, rootVersion, rootLabel) {
  if (actual !== rootVersion) {
    throw new Error(`${label} must match ${rootLabel} version v${rootVersion}`);
  }
}

function assertEnv(env, name) {
  if (!env[name]) {
    throw new Error(`${name} is required`);
  }
}
