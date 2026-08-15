import { readdir } from "node:fs/promises";
import { join, normalize, sep } from "node:path";
import { getContentRoot } from "@/shared/content";

export const OSPE_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

export const OSPE_IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export const OSPE_FOLDER_TO_MODULE: Record<string, string> = {
  "module 1": "ahe-101",
  "module 2": "ppg-102",
  "module 3": "pmb-103",
  RESP: "rs-201",
  CVS: "cvs-202",
  RENAL: "rau-203",
  IBL: "ibl-204",
};

export function getImagesRoot(): string {
  return join(getContentRoot(), "images");
}

export function resolveOspeImage(folder: string, file: string): string | null {
  const imagesRoot = getImagesRoot();
  const target = normalize(join(imagesRoot, folder, file));
  if (target !== imagesRoot && !target.startsWith(imagesRoot + sep)) return null;
  return target;
}

export async function listImagesInFolder(folder: string): Promise<string[]> {
  const dir = join(getImagesRoot(), folder);
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => {
      if (!e.isFile()) return false;
      const lower = e.name.toLowerCase();
      return OSPE_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
    })
    .map((e) => e.name)
    .sort();
}

export async function listOspeFolders(): Promise<{ folder: string; count: number }[]> {
  const entries = await readdir(getImagesRoot(), { withFileTypes: true }).catch(() => []);
  const out: { folder: string; count: number }[] = [];
  for (const e of entries) {
    if (!e.isDirectory() || !(e.name in OSPE_FOLDER_TO_MODULE)) continue;
    const files = await listImagesInFolder(e.name);
    out.push({ folder: e.name, count: files.length });
  }
  return out;
}
