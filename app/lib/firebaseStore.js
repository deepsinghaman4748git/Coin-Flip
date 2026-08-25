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

function serializeTimestamp(val) {
  if (!val) return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val.toDate === "function") return val.toDate();
  return val;
}

function normalizeDoc(docSnap) {
  if (!docSnap || !docSnap.exists()) return null;
  const raw = docSnap.data();
  const data = { ...raw, _id: docSnap.id };
  
  if (data.createdAt && typeof data.createdAt.toDate === "function") {
    data.createdAt = data.createdAt.toDate();
  }
  if (data.updatedAt && typeof data.updatedAt.toDate === "function") {
    data.updatedAt = data.updatedAt.toDate();
  }
  return data;
}

export async function fsFind(collectionName, filter = {}, sortOptions = null, limitCount = null) {
  try {
    const colRef = collection(firestore, collectionName);
    const snap = await getDocs(colRef);
    let results = [];
    snap.forEach((d) => {
      const data = normalizeDoc(d);
      if (data) results.push(data);
    });

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
    if (filter._id) {
      const docRef = doc(firestore, collectionName, String(filter._id));
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const item = normalizeDoc(snap);
        if (matchesFilter(item, filter)) return item;
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
    const docRef = doc(firestore, collectionName, String(id));
    const snap = await getDoc(docRef);
    return normalizeDoc(snap);
  } catch (err) {
    console.error(`Firebase fsFindById error on ${collectionName}:`, err);
    return null;
  }
}

export async function fsCreate(collectionName, data) {
  try {
    const id = data._id || `${collectionName.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const docRef = doc(firestore, collectionName, String(id));
    const itemData = {
      ...data,
      _id: id,
      createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(),
      updatedAt: new Date(),
    };
    await setDoc(docRef, itemData);
    return itemData;
  } catch (err) {
    console.error(`Firebase fsCreate error on ${collectionName}:`, err);
    throw err;
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

    const docRef = doc(firestore, collectionName, String(target._id));
    const updatedFields = {};

    if (update.$set) {
      Object.assign(updatedFields, update.$set);
    } else if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        updatedFields[k] = (target[k] || 0) + v;
      }
    } else {
      Object.assign(updatedFields, update);
    }

    updatedFields.updatedAt = new Date();
    await updateDoc(docRef, updatedFields);
    return { ...target, ...updatedFields };
  } catch (err) {
    console.error(`Firebase fsUpdateOne error on ${collectionName}:`, err);
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
      if (itemVal?.toString?.() === val?.toString?.()) continue;
    }
    if (itemVal !== val) return false;
  }
  return true;
}
