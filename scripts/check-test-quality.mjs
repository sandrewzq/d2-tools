import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  classifyTestFiles,
  collectTestQualityErrors,
  discoverTestFiles,
  repositoryTestPolicy
} from "./test-classification.mjs";

export function checkTestQuality(root = process.cwd()) {
  const testFiles = discoverTestFiles(root);
  const classified = classifyTestFiles(testFiles, repositoryTestPolicy);
  const errors = collectTestQualityErrors(root, testFiles, repositoryTestPolicy);
  return { classified, errors, total: testFiles.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = checkTestQuality();
  console.log(`测试分层：行为 ${result.classified.behavior.length}，架构 ${result.classified.architecture.length}，总计 ${result.total}。`);

  if (result.errors.length) {
    console.error("测试质量门禁失败：");
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("测试质量门禁通过：没有架构白名单之外的源码字符串测试。");
}
