import { join, resolve, normalize, sep } from "node:path";

// Absolute path to the folder holding "semester 1|2" (and images/) on disk.
// Must be set on the server (local: C:\work\projects, Docker: /data or similar).
export function getContentRoot(): string {
  const raw = process.env.CONTENT_ROOT ?? "C:/work/projects";
  return resolve(raw);
}

// Resolves a stored relative pdf_file against the content root, rejecting
// any path that escapes the root (path traversal).
export function resolveContentFile(relativePath: string): string | null {
  const root = getContentRoot();
  const target = normalize(join(root, relativePath));
  if (target !== root && !target.startsWith(root + sep)) return null;
  return target;
}
