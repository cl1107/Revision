import fs from 'node:fs';
import path from 'node:path';

if (!process.env.NAPI_RS_NATIVE_LIBRARY_PATH) {
  const exeDir = path.dirname(process.execPath);
  const candidates = [
    path.join(exeDir, `gpuix-native.${process.platform}-${process.arch}.node`),
    path.join(exeDir, 'gpuix-native.darwin-arm64.node'),
    path.join(exeDir, 'gpuix-native.darwin-universal.node'),
    path.join(exeDir, '..', 'Frameworks', `gpuix-native.${process.platform}-${process.arch}.node`),
    path.join(exeDir, '..', 'Frameworks', 'gpuix-native.darwin-arm64.node'),
    path.join(exeDir, '..', 'Resources', `gpuix-native.${process.platform}-${process.arch}.node`),
    path.join(exeDir, '..', 'Resources', 'gpuix-native.darwin-arm64.node'),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        process.env.NAPI_RS_NATIVE_LIBRARY_PATH = candidate;
        break;
      }
    } catch {
      // ignore
    }
  }
}
