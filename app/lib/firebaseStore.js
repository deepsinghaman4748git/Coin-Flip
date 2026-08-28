import { firestore } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
} from "firebase/firestore";

// High-speed in-memory cache for Firestore collection snapshots (2s TTL)
const collectionCache = new Map();
const singleDocCache = new Map();
const CACHE_TTL_MS = 2000;

function withTimeout(promise, ms = 5000, fallback = null) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function sanitizeForFirestore(val, depth = 0) {
  if (depth > 10) return null;
  if (val === undefined || typeof val === "function" || typeof val === "symbol") {
    return undefined;
  }
  if (val === null) {
    return null;
  }
  if (typeof val === "number" || typeof val === "boolean" || typeof val === "string") {
    return val;
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val.toDate === "function") {
    try {
      const d = val.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  if (
    typeof val === "object" &&
    typeof val.seconds === "number" &&
    typeof val.nanoseconds === "number"
  ) {
    return new Date(val.seconds * 1000 + Math.round(val.nanoseconds / 1000000));
  }
  if (Array.isArray(val)) {
    return val
      .map((item) => sanitizeForFirestore(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (typeof val === "object") {
    if (typeof val.toHexString === "function") {
      return val.toHexString();
    }
    const clean = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === "_id" || k === "save" || k === "toObject" || typeof v === "function") continue;
      const sanitized = sanitizeForFirestore(v, depth + 1);
      if (sanitized !== undefined) {
        clean[k] = sanitized;
      }
    }
    return clean;
  }
  return String(val);
}

function deepNormalize(val) {
  if (val === null || val === undefined) return val;
  if (typeof val?.toDate === "function") {
    try {
      return val.toDate();
    } catch {
      return val;
    }
  }
  if (
    typeof val === "object" &&
    typeof val.seconds === "number" &&
    typeof val.nanoseconds === "number"
  ) {
    return new Date(val.seconds * 1000 + Math.round(val.nanoseconds / 1000000));
  }
  if (Array.isArray(val)) {
    return val.map(deepNormalize);
  }
  if (typeof val === "object" && (val.constructor === Object || !val.constructor)) {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = deepNormalize(v);
    }
    return res;
  }
  return val;
}

function normalizeDoc(docSnap) {
  if (!docSnap || !docSnap.exists()) return null;
  const raw = docSnap.data();
  const normalizedRaw = deepNormalize(raw) || {};
  return { ...normalizedRaw, _id: docSnap.id };
}

export function invalidateCache(collectionName, id = null) {
  collectionCache.delete(collectionName);
  if (id) {
    singleDocCache.delete(`${collectionName}:${id}`);
  }
}

export async function fsFind(collectionName, filter = {}, sortOptions = null, limitCount = null) {
  try {
    const cachedEntry = collectionCache.get(collectionName);
    let allDocs = null;

    if (cachedEntry && Date.now() - cachedEntry.time < CACHE_TTL_MS) {
      allDocs = cachedEntry.data;
    } else {
      const colRef = collection(firestore, collectionName);
      const snap = await withTimeout(getDocs(colRef), 5000, null);
      if (snap) {
        allDocs = [];
        snap.forEach((d) => {
          const data = normalizeDoc(d);
          if (data) allDocs.push(data);
        });
        collectionCache.set(collectionName, { data: allDocs, time: Date.now() });
      } else if (cachedEntry) {
        allDocs = cachedEntry.data;
      } else {
        allDocs = [];
      }
    }

    let results = [...allDocs];

    // Apply in-memory filtering for rich Mongo queries
    if (filter && Object.keys(filter).length > 0) {
      results = results.filter((item) => matchesFilter(item, filter));
    }

    if (sortOptions) {
      const key = typeof sortOptions === "string" ? sortOptions.replace(/^-/, "") : Object.keys(sortOptions)[0];
      const desc = typeof sortOptions === "string" ? sortOptions.startsWith("-") : sortOptions[key] === -1 || sortOptions[key] === "desc";
      results.sort((a, b) => {
        const aVal = a[key] instanceof Date ? a[key].getTime() : a[key];
        const bVal = b[key] instanceof Date ? b[key].getTime() : b[key];
        if (aVal < bVal) return desc ? 1 : -1;
        if (aVal > bVal) return desc ? -1 : 1;
        return 0;
      });
    }

    if (limitCount && limitCount > 0) {
      results = results.slice(0, limitCount);
    }

    return results;
  } catch (err) {
    console.error(`Firebase fsFind error on ${collectionName}:`, err);
    return [];
  }
}

export async function fsFindOne(collectionName, filter = {}) {
  try {
    if (filter && filter._id) {
      const docById = await fsFindById(collectionName, filter._id);
      if (!docById) return null;
      // Must verify that the document satisfies all other filter conditions (e.g. $gte walletBalance)
      if (matchesFilter(docById, filter)) {
        return docById;
      }
      return null;
    }
    const all = await fsFind(collectionName, filter, null, 1);
    return all.length > 0 ? all[0] : null;
  } catch (err) {
    console.error(`Firebase fsFindOne error on ${collectionName}:`, err);
    return null;
  }
}

export async function fsFindById(collectionName, id) {
  try {
    if (!id) return null;
    const idStr = String(id);
    const cacheKey = `${collectionName}:${idStr}`;
    const cached = singleDocCache.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
      return cached.data;
    }

    // Check collection cache first
    const colCached = collectionCache.get(collectionName);
    if (colCached && colCached.data) {
      const match = colCached.data.find((d) => d._id?.toString() === idStr);
      if (match) {
        singleDocCache.set(cacheKey, { data: match, time: Date.now() });
        return match;
      }
    }

    const docRef = doc(firestore, collectionName, idStr);
    const snap = await withTimeout(getDoc(docRef), 5000, null);
    if (snap && snap.exists()) {
      const data = normalizeDoc(snap);
      if (data) {
        singleDocCache.set(cacheKey, { data, time: Date.now() });
        return data;
      }
    }
    return null;
  } catch (err) {
    console.error(`Firebase fsFindById error on ${collectionName}:`, err);
    return null;
  }
}

export async function fsCreate(collectionName, data) {
  try {
    const id = data._id || `${collectionName.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const docRef = doc(firestore, collectionName, String(id));
    const rawData = {
      ...data,
      _id: id,
      createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(),
      updatedAt: new Date(),
    };
    const sanitizedData = sanitizeForFirestore(rawData);
    await withTimeout(setDoc(docRef, sanitizedData), 5000, null);
    invalidateCache(collectionName, id);
    return { ...rawData, ...sanitizedData, _id: id };
  } catch (err) {
    console.error(`Firebase fsCreate error on ${collectionName}:`, err);
    invalidateCache(collectionName);
    return data;
  }
}

export async function fsUpdateOne(collectionName, filter, update, options = {}) {
  try {
    let target = await fsFindOne(collectionName, filter);
    if (!target) {
      if (options.upsert) {
        const createData = { ...filter, ...(update.$set || update) };
        return await fsCreate(collectionName, createData);
      }
      return null;
    }

    if (!matchesFilter(target, filter)) {
      return null;
    }

    const docRef = doc(firestore, collectionName, String(target._id));
    const updatedFields = {};

    if (update.$set) {
      Object.assign(updatedFields, update.$set);
      if (typeof updatedFields.walletBalance === "number") {
        updatedFields.walletBalance = Math.max(0, updatedFields.walletBalance);
      }
    } else if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        let newVal = (Number(target[k]) || 0) + Number(v);
        if (k === "walletBalance" || k === "balance") {
          // If the query was expecting a minimum balance (e.g. $gte) and newVal < 0, reject
          if (newVal < 0 && filter && filter[k] && filter[k].$gte !== undefined) {
            return null;
          }
          newVal = Math.max(0, newVal);
        }
        updatedFields[k] = newVal;
      }
    } else {
      Object.assign(updatedFields, update);
      if (typeof updatedFields.walletBalance === "number") {
        updatedFields.walletBalance = Math.max(0, updatedFields.walletBalance);
      }
    }

    delete updatedFields._id;
    delete updatedFields.id;
    delete updatedFields.save;
    delete updatedFields.toObject;

    updatedFields.updatedAt = new Date();
    const sanitizedFields = sanitizeForFirestore(updatedFields) || {};
    await withTimeout(updateDoc(docRef, sanitizedFields), 5000, null);
    invalidateCache(collectionName, target._id);
    return { ...target, ...updatedFields };
  } catch (err) {
    console.error(`Firebase fsUpdateOne error on ${collectionName}:`, err);
    invalidateCache(collectionName);
    return null;
  }
}

function matchesFilter(item, filter) {
  if (!item || !filter) return false;
  for (const [key, val] of Object.entries(filter)) {
    if (key === "$or" && Array.isArray(val)) {
      const matchAny = val.some((subQ) => matchesFilter(item, subQ));
      if (!matchAny) return false;
      continue;
    }
    if (key === "$and" && Array.isArray(val)) {
      const matchAll = val.every((subQ) => matchesFilter(item, subQ));
      if (!matchAll) return false;
      continue;
    }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      if ("$ne" in val && (item[key] === val.$ne || item[key]?.toString?.() === val.$ne?.toString?.())) return false;
      if ("$in" in val) {
        if (!Array.isArray(val.$in)) return false;
        const hasMatch = val.$in.some((x) => x === item[key] || x?.toString?.() === item[key]?.toString?.());
        if (!hasMatch) return false;
        continue;
      }
      if ("$nin" in val) {
        if (Array.isArray(val.$nin)) {
          const hasMatch = val.$nin.some((x) => x === item[key] || x?.toString?.() === item[key]?.toString?.());
          if (hasMatch) return false;
        }
        continue;
      }
      if ("$gte" in val && item[key] < val.$gte) return false;
      if ("$lte" in val && item[key] > val.$lte) return false;
      if ("$gt" in val && item[key] <= val.$gt) return false;
      if ("$lt" in val && item[key] >= val.$lt) return false;
      continue;
    }

    const itemVal = item[key];
    if (itemVal !== undefined && val !== undefined) {
      if (typeof itemVal === "string" && typeof val === "string") {
        if (itemVal.toLowerCase() === val.toLowerCase()) continue;
      }
      if (itemVal?.toString?.() === val?.toString?.()) continue;
    }
    if (itemVal !== val) return false;
  }
  return true;
}
