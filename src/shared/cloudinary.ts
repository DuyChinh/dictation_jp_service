import { v2 as cloudinary } from "cloudinary";
import { config } from "../config.js";

export { cloudinary };

const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

/** Sets up the SDK from config; false while the account isn't configured. */
export function configureCloudinary(): boolean {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) return false;
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return true;
}

/** Why an image data URL can't be uploaded, or null when it can. */
export function imageDataUrlProblem(image: string, maxBytes: number): string | null {
  const match = IMAGE_DATA_URL.exec(image);
  if (!match) return "Image must be a JPEG, PNG or WebP picture";
  if (Buffer.byteLength(match[2], "base64") > maxBytes) return "Image is too large";
  return null;
}

/** True for pictures stored in this app's Cloudinary account, under `folder`. */
export function isOwnImageUrl(url: string, folder: string): boolean {
  const cloud = config.cloudinary.cloudName;
  if (!cloud) return false;
  const prefix = `https://res.cloudinary.com/${cloud}/image/upload/`;
  if (!url.startsWith(prefix)) return false;
  // Optional "v123/" version segment, then the folder.
  return new RegExp(`^(v\\d+/)?${folder}/[\\w/-]+\\.(jpg|jpeg|png|webp)$`).test(url.slice(prefix.length));
}

/** Public id of an uploaded picture from its delivery URL, e.g. "feedback/u1/abc". */
function publicIdFromUrl(url: string): string | null {
  const m = /\/image\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/.exec(url);
  return m ? m[1] : null;
}

/** Removes uploaded pictures; a failed cleanup only leaves orphan files, so it never throws. */
export async function destroyImages(urls: string[]): Promise<void> {
  if (!urls.length || !configureCloudinary()) return;
  const ids = urls.map(publicIdFromUrl).filter((id): id is string => !!id);
  await Promise.all(
    ids.map((id) =>
      cloudinary.uploader.destroy(id, { invalidate: true }).catch((err) => console.error("Image cleanup failed:", err)),
    ),
  );
}

/** Playback and poster URLs for a video the team uploaded; mp4 so every browser can play it. */
export function uploadedVideoUrls(publicId: string): { url: string; poster: string } | null {
  const cloud = config.cloudinary.cloudName;
  if (!cloud) return null;
  const base = `https://res.cloudinary.com/${cloud}/video/upload`;
  return { url: `${base}/q_auto/${publicId}.mp4`, poster: `${base}/so_1,q_auto/${publicId}.jpg` };
}

/**
 * Lets the admin browser upload a video straight to Cloudinary: videos are far too big to pass
 * through this server. The signature pins the folder and file name.
 */
export function signVideoUpload(folder: string, publicId: string) {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ folder, public_id: publicId, timestamp }, apiSecret);
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    publicId,
  };
}

/** Removes uploaded videos by public id; like destroyImages, never throws. */
export async function destroyVideos(publicIds: string[]): Promise<void> {
  if (!publicIds.length || !configureCloudinary()) return;
  await Promise.all(
    publicIds.map((id) =>
      cloudinary.uploader
        .destroy(id, { resource_type: "video", invalidate: true })
        .catch((err) => console.error("Video cleanup failed:", err)),
    ),
  );
}

/** Public ids of the uploaded videos among a post's videos. */
export function uploadedVideoIds(videos: Array<{ provider: string; id: string }> | undefined): string[] {
  return (videos ?? []).filter((v) => v.provider === "cloudinary").map((v) => v.id);
}
