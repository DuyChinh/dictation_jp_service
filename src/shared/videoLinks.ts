/** A video shown on the feedback board: stored as provider + id, never as a raw URL. */
export const LINK_PROVIDERS = ["youtube", "drive"] as const;
/** "cloudinary" videos are files the team uploaded from the admin area. */
export const VIDEO_PROVIDERS = [...LINK_PROVIDERS, "cloudinary"] as const;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];
export type VideoRef = { provider: VideoProvider; id: string };

/** Where team uploads go; the id of an uploaded video is its Cloudinary public id. */
export const TEAM_VIDEO_FOLDER = "feedback/team/videos";

export const VIDEO_ID_PATTERN: Record<VideoProvider, RegExp> = {
  youtube: /^[A-Za-z0-9_-]{11}$/,
  drive: /^[A-Za-z0-9_-]{20,120}$/,
  cloudinary: new RegExp(`^${TEAM_VIDEO_FOLDER}/[a-f0-9]{18}$`),
};

export function isValidVideo(v: VideoRef): boolean {
  return VIDEO_PROVIDERS.includes(v.provider) && VIDEO_ID_PATTERN[v.provider].test(v.id);
}
