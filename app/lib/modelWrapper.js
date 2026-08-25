import mongoose from "mongoose";
import { inMemoryDb } from "./inMemoryStore.js";
import { fsFind, fsFindOne, fsFindById, fsCreate, fsUpdateOne } from "./firebaseStore.js";

function matchesQuery(doc, query) {
  if (!query || Object.keys(query).length === 0) return true;
  for (const [key, val] of Object.entries(query)) {
    if (key === "$or" && Array.isArray(val)) {
      const matchAny = val.some((subQ) => matchesQuery(doc, subQ));
      if (!matchAny) return false;
      continue;
    }
    if (key === "$and" && Array.isArray(val)) {
      const matchAll = val.every((subQ) => matchesQuery(doc, subQ));
      if (!matchAll) return false;
      continue;
    }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      if ("$ne" in val && (doc[key] === val.$ne || doc[key]?.toString?.() === val.$ne?.toString?.())) return false;
      if ("$in" in val) {
        if (!Array.isArray(val.$in)) return false;
        const hasMatch = val.$in.some((item) => item === doc[key] || item?.toString?.() === doc[key]?.toString?.());
        if (!hasMatch) return false;
        continue;
      }
      if ("$nin" in val) {
        if (Array.isArray(val.$nin)) {
          const hasMatch = val.$nin.some((item) => item === doc[key] || item?.toString?.() === doc[key]?.toString?.());
          if (hasMatch) return false;
        }
        continue;
      }
      if ("$gte" in val && doc[key] < val.$gte) return false;
      if ("$lte" in val && doc[key] > val.$lte) return false;
      if ("$gt" in val && doc[key] <= val.$gt) return false;
      if ("$lt" in val && doc[key] >= val.$lt) return false;
      continue;
    }

    const docVal = doc[key];
    if (docVal && val && docVal.toString && val.toString) {
      if (docVal.toString() === val.toString()) continue;
    }
    if (docVal !== val) return false;
  }
  return true;
}

function cloneDoc(doc, collectionKey) {
  if (!doc) return null;
  const cloned = { ...doc };

  cloned.toObject = function () {
    const obj = { ...this };
    delete obj.save;
    delete obj.toObject;
    return obj;
  };

  cloned.save = async function () {
    const updatedData = { ...this };
    delete updatedData.save;
    delete updatedData.toObject;
    updatedData.updatedAt = new Date();

    // Save to Firestore
    try {
      await fsUpdateOne(collectionKey, { _id: this._id }, { $set: updatedData });
    } catch (e) {
      console.warn("Firestore save fallback error:", e);
    }

    // Sync in-memory
    if (collectionKey && inMemoryDb[collectionKey]) {
      const coll = inMemoryDb[collectionKey];
      const index = coll.findIndex((d) => d._id?.toString() === this._id?.toString());
      if (index !== -1) {
        coll[index] = { ...coll[index], ...updatedData };
      } else {
        coll.unshift(updatedData);
      }
    }
    return this;
  };

  return cloned;
}

function createQueryChain(fetchAsync, collectionKey) {
  let selectFields = null;
  let sortField = null;
  let limitCount = null;
  let skipCount = null;

  const chain = {
    select(fields) {
      selectFields = fields;
      return chain;
    },
    sort(order) {
      sortField = order;
      return chain;
    },
    limit(n) {
      limitCount = n;
      return chain;
    },
    skip(n) {
      skipCount = n;
      return chain;
    },
    populate() {
      return chain;
    },
    lean() {
      return chain;
    },
    async exec() {
      return chain.then((r) => r);
    },
    async then(resolve, reject) {
      try {
        let results = await fetchAsync();
        if (Array.isArray(results)) {
          let list = [...results];
          if (sortField) {
            const key = typeof sortField === "string" ? sortField.replace(/^-/, "") : Object.keys(sortField)[0];
            const desc = typeof sortField === "string" ? sortField.startsWith("-") : sortField[key] === -1 || sortField[key] === "desc";
            list.sort((a, b) => {
              const aVal = a[key] instanceof Date ? a[key].getTime() : a[key];
              const bVal = b[key] instanceof Date ? b[key].getTime() : b[key];
              if (aVal < bVal) return desc ? 1 : -1;
              if (aVal > bVal) return desc ? -1 : 1;
              return 0;
            });
          }
          if (skipCount) list = list.slice(skipCount);
          if (limitCount) list = list.slice(0, limitCount);
          return resolve(list.map((d) => cloneDoc(d, collectionKey)));
        } else {
          return resolve(cloneDoc(results, collectionKey));
        }
      } catch (err) {
        if (reject) return reject(err);
        throw err;
      }
    },
  };

  return chain;
}

export function getModel(modelName, MongooseModel) {
  const collectionKey =
    modelName === "User"
      ? "users"
      : modelName === "Game"
      ? "games"
      : modelName === "Transaction"
      ? "transactions"
      : modelName === "Withdraw"
      ? "withdraws"
      : "settings";

  const firestoreMethods = {
    find(query = {}) {
      return createQueryChain(async () => {
        try {
          const docs = await fsFind(collectionKey, query);
          if (docs && docs.length > 0) return docs;
        } catch (err) {
          console.warn("fsFind error:", err);
        }
        const coll = inMemoryDb[collectionKey] || [];
        return coll.filter((doc) => matchesQuery(doc, query));
      }, collectionKey);
    },

    findOne(query = {}) {
      return createQueryChain(async () => {
        try {
          const doc = await fsFindOne(collectionKey, query);
          if (doc) return doc;
        } catch (err) {
          console.warn("fsFindOne error:", err);
        }
        const coll = inMemoryDb[collectionKey] || [];
        return coll.find((doc) => matchesQuery(doc, query)) || null;
      }, collectionKey);
    },

    findById(id) {
      return createQueryChain(async () => {
        try {
          const doc = await fsFindById(collectionKey, id);
          if (doc) return doc;
        } catch (err) {
          console.warn("fsFindById error:", err);
        }
        const coll = inMemoryDb[collectionKey] || [];
        return coll.find((doc) => doc._id?.toString() === id?.toString()) || null;
      }, collectionKey);
    },

    async countDocuments(query = {}) {
      try {
        const docs = await fsFind(collectionKey, query);
        if (docs) return docs.length;
      } catch (err) {
        console.warn("countDocuments fs error:", err);
      }
      const coll = inMemoryDb[collectionKey] || [];
      return coll.filter((doc) => matchesQuery(doc, query)).length;
    },

    async create(doc) {
      const newDoc = {
        ...doc,
        _id: doc._id || `${collectionKey.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        createdAt: doc.createdAt || new Date(),
        updatedAt: new Date(),
      };

      try {
        await fsCreate(collectionKey, newDoc);
      } catch (err) {
        console.warn("fsCreate error, keeping in-memory:", err);
      }

      const coll = inMemoryDb[collectionKey] || [];
      coll.unshift(newDoc);
      return cloneDoc(newDoc, collectionKey);
    },

    async updateOne(query, update, options = {}) {
      return firestoreMethods.findOneAndUpdate(query, update, options);
    },

    async updateMany(query, update) {
      const coll = inMemoryDb[collectionKey] || [];
      const matches = coll.filter((d) => matchesQuery(d, query));
      for (const doc of matches) {
        if (update.$set) Object.assign(doc, update.$set);
        else if (update.$inc) {
          for (const [k, v] of Object.entries(update.$inc)) {
            doc[k] = (doc[k] || 0) + v;
          }
        } else {
          Object.assign(doc, update);
        }
        doc.updatedAt = new Date();
        try {
          await fsUpdateOne(collectionKey, { _id: doc._id }, update);
        } catch (e) {
          // ignore
        }
      }
      return { modifiedCount: matches.length };
    },

    async findOneAndUpdate(query, update, options = {}) {
      let doc = null;
      try {
        doc = await fsUpdateOne(collectionKey, query, update, options);
      } catch (err) {
        console.warn("fsUpdateOne error:", err);
      }

      const coll = inMemoryDb[collectionKey] || [];
      let memDoc = coll.find((d) => matchesQuery(d, query));
      if (!memDoc && doc) {
        coll.unshift(doc);
        memDoc = doc;
      }

      if (memDoc) {
        if (update.$set) {
          Object.assign(memDoc, update.$set);
        } else if (update.$inc) {
          for (const [k, v] of Object.entries(update.$inc)) {
            memDoc[k] = (memDoc[k] || 0) + v;
          }
        } else {
          Object.assign(memDoc, update);
        }
        memDoc.updatedAt = new Date();
        return cloneDoc(memDoc, collectionKey);
      }

      if (options.upsert) {
        return await firestoreMethods.create({ ...query, ...(update.$set || update) });
      }

      return doc ? cloneDoc(doc, collectionKey) : null;
    },

    async findByIdAndUpdate(id, update, options = {}) {
      return firestoreMethods.findOneAndUpdate({ _id: id }, update, options);
    },

    async aggregate(pipeline = []) {
      const docs = await firestoreMethods.find({});
      let filtered = [...docs];
      for (const stage of pipeline) {
        if (stage.$match) {
          filtered = filtered.filter((d) => matchesQuery(d, stage.$match));
        }
      }
      let totalAmount = 0;
      let totalCount = filtered.length;
      for (const d of filtered) {
        if (typeof d.amount === "number") totalAmount += d.amount;
        if (typeof d.winAmount === "number") totalAmount += d.winAmount;
        if (typeof d.entryFee === "number") totalAmount += d.entryFee;
      }
      return [{ _id: null, total: totalAmount, count: totalCount, totalAmount, totalProfit: totalAmount }];
    },
  };

  return new Proxy(MongooseModel, {
    get(target, prop) {
      if (mongoose.connection.readyState === 1) {
        return target[prop];
      }
      if (prop in firestoreMethods) {
        return firestoreMethods[prop];
      }
      return target[prop];
    },
  });
}
