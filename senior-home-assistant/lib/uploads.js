import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Saves an uploaded photo (a File from FormData) to /public/uploads and
 * returns its public URL, or null if no file was provided.
 *
 * MVP-only: files live on local disk. For a real deployment, swap this
 * for an object storage upload (S3, etc.) - see README "Future work".
 */
export async function savePhotoUpload(file) {
  if (!file || typeof file === "string" || file.size === 0) return null;

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Photo must be a JPEG, PNG, WEBP, or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Photo must be smaller than 5MB.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = file.type.split("/")[1];
  const filename = `${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  return `/uploads/${filename}`;
}
