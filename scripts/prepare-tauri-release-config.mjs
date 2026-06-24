#!/usr/bin/env node

import {
  prepareTauriReleaseConfig,
  readJson,
  writeJson
} from "./release-config.mjs";

const configPath = "apps/desktop/src-tauri/tauri.conf.json";
const config = readJson(configPath);

writeJson(configPath, prepareTauriReleaseConfig({ config, env: process.env }));
