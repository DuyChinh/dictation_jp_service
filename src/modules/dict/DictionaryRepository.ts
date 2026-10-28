import type { IDictEntry, IDictKanji, IDictVi } from "../../models/Dict.js";

/**
 * Everything the dictionary API needs from storage. Today MongoDB implements it; moving to PostgreSQL
 * means writing one more class here and re-running the import, nothing above this interface changes.
 */
export interface DictionaryRepository {
  /** Entries having any of these written forms exactly. */
  findByKeys(keys: string[]): Promise<IDictEntry[]>;
  /** Entries with a written form starting with `prefix`. */
  findByKeyPrefix(prefix: string, limit: number): Promise<IDictEntry[]>;
  /** Entries whose English glosses contain all these folded tokens. */
  findByEnglish(tokens: string[], limit: number): Promise<IDictEntry[]>;
  /** Entries whose Vietnamese meanings contain all these folded tokens. */
  findByVietnamese(tokens: string[], limit: number): Promise<IDictEntry[]>;
  getEntry(id: number): Promise<IDictEntry | null>;
  getVi(ids: number[]): Promise<Map<number, IDictVi>>;
  getKanji(chars: string[]): Promise<IDictKanji[]>;
}
