/** A video shown on the feedback board: stored as provider + id, never as a raw URL. */
export const VIDEO_PROVIDERS = ["youtube", "drive"] as const;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];
export type VideoRef = { provider: VideoProvider; id: string };

export const VIDEO_ID_PATTERN: Record<VideoProvider, RegExp> = {
  youtube: /^[A-Za-z0-9_-]{11}$/,
  drive: /^[A-Za-z0-9_-]{20,120}$/,
};

export function isValidVideo(v: VideoRef): boolean {
  return VIDEO_PROVIDERS.includes(v.provider) && VIDEO_ID_PATTERN[v.provider].test(v.id);
}
