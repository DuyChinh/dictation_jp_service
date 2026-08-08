export const ALGORITHM_VERSION = "dictation-v1" as const;
export const NORMALIZATION_VERSION = "norm-v1" as const;

export type AlgorithmVersion = typeof ALGORITHM_VERSION;
export type NormalizationVersion = typeof NORMALIZATION_VERSION;
