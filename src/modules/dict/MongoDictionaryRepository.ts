import { DictEntry, DictKanji, DictVi, type IDictEntry, type IDictKanji, type IDictVi } from "../../models/Dict.js";
import type { DictionaryRepository } from "./DictionaryRepository.js";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class MongoDictionaryRepository implements DictionaryRepository {
  findByKeys(keys: string[]): Promise<IDictEntry[]> {
    if (!keys.length) return Promise.resolve([]);
    return DictEntry.find({ keys: { $in: keys } }).lean<IDictEntry[]>();
  }

  findByKeyPrefix(prefix: string, limit: number): Promise<IDictEntry[]> {
    return DictEntry.find({ keys: { $regex: `^${escapeRegex(prefix)}` } })
      .sort({ w: -1, _id: 1 })
      .limit(limit)
      .lean<IDictEntry[]>();
  }

  findByEnglish(tokens: string[], limit: number): Promise<IDictEntry[]> {
    if (!tokens.length) return Promise.resolve([]);
    return DictEntry.find({ en: { $all: tokens } })
      .sort({ w: -1, _id: 1 })
      .limit(limit)
      .lean<IDictEntry[]>();
  }

  async findByVietnamese(tokens: string[], limit: number): Promise<IDictEntry[]> {
    if (!tokens.length) return [];
    const hits = await DictVi.find({ t: { $all: tokens } }, { _id: 1 }).limit(limit * 4).lean<Array<{ _id: number }>>();
    if (!hits.length) return [];
    return DictEntry.find({ _id: { $in: hits.map((h) => h._id) } })
      .sort({ w: -1, _id: 1 })
      .limit(limit)
      .lean<IDictEntry[]>();
  }

  getEntry(id: number): Promise<IDictEntry | null> {
    return DictEntry.findById(id).lean<IDictEntry>();
  }

  async getVi(ids: number[]): Promise<Map<number, IDictVi>> {
    if (!ids.length) return new Map();
    const rows = await DictVi.find({ _id: { $in: ids } }).lean<IDictVi[]>();
    return new Map(rows.map((r) => [r._id, r]));
  }

  getKanji(chars: string[]): Promise<IDictKanji[]> {
    if (!chars.length) return Promise.resolve([]);
    return DictKanji.find({ _id: { $in: chars } }).lean<IDictKanji[]>();
  }
}
