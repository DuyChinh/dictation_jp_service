export {
  ALGORITHM_VERSION,
  NORMALIZATION_VERSION,
  type AlgorithmVersion,
  type NormalizationVersion,
} from "./versions.js";

export {
  normalizePrimary,
  normalizeForPunctInsensitive,
  stripPunctuation,
} from "./normalize.js";

export { levenshtein } from "./levenshtein.js";

export { diffCharacters, type DiffOp } from "./diff.js";

export {
  scoreDictation,
  joinFullQuestionExpected,
  joinFillBlankExpected,
  type DictationScoreInput,
  type DictationScoreResult,
} from "./scoreDictation.js";

export {
  evaluateListening,
  type ListeningChoice,
  type ListeningEvaluateInput,
  type ListeningEvaluateResult,
} from "./evaluateListening.js";
