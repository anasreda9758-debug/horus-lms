import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import type { PracticalImage } from "./model";
import { FIXTURE_IMAGE_ID, fixtureSvg } from "./fixtures";

export async function readPracticalImage(image: PracticalImage) {
  if (image.isFixture) {
    if (process.env.NODE_ENV !== "development" || image.id !== FIXTURE_IMAGE_ID) throw new Error("Fixture not available");
    return { bytes: Buffer.from(fixtureSvg), mime: "image/svg+xml" };
  }
  // Trusted, private local assets only. Never fetch a URL supplied in content.
  const root = await realpath(path.join(process.cwd(), "private", "practical-images"));
  const file = await realpath(path.resolve(root, image.storageKey));
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Invalid image path");
  const mime = ({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" } as Record<string, string>)[path.extname(file).toLowerCase()];
  if (!mime) throw new Error("Unsupported image format");
  return { bytes: await readFile(file), mime };
}
