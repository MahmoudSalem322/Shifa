import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

/* A deliberately small JSON-file store for the features the Shifaa .NET
   API does not cover yet (appointment history, donations, prescription
   reads). One file per collection under ./data, writes serialised per
   collection so concurrent requests cannot interleave.

   This is an MVP stand-in: it lives on the server's disk, so it needs a
   persistent filesystem (next start on a VM / container). On serverless
   hosting, move these collections to the .NET API or a database — the
   route handlers only talk to store.read / store.update. */

const DATA_DIR = process.env.SHIFA_DATA_DIR || path.join(process.cwd(), 'data');
const queues = new Map();

function fileFor(collection) {
  if (!/^[a-z-]+$/.test(collection)) throw new Error('Invalid collection name');
  return path.join(DATA_DIR, collection + '.json');
}

async function readFile(collection) {
  try {
    const text = await fs.readFile(fileFor(collection), 'utf8');
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeFile(collection, items) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = fileFor(collection);
  const temp = target + '.' + process.pid + '.tmp';
  await fs.writeFile(temp, JSON.stringify(items, null, 2), 'utf8');
  /* On Windows an antivirus or indexer holding the target briefly makes
     rename fail with EPERM / EBUSY; a short retry gets past it. */
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fs.rename(temp, target);
      return;
    } catch (error) {
      if (attempt >= 4 || !['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) {
        await fs.rm(temp, { force: true }).catch(() => {});
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}

/* Runs `fn` with exclusive access to the collection. */
function exclusive(collection, fn) {
  const previous = queues.get(collection) || Promise.resolve();
  const next = previous.catch(() => {}).then(fn);
  queues.set(collection, next.catch(() => {}));
  return next;
}

export const store = {
  read(collection) {
    return exclusive(collection, () => readFile(collection));
  },

  /* `mutate(items)` returns { items, result }; items are persisted and
     result is handed back to the caller. Throwing aborts the write. */
  update(collection, mutate) {
    return exclusive(collection, async () => {
      const items = await readFile(collection);
      const { items: nextItems, result } = await mutate(items);
      await writeFile(collection, nextItems);
      return result;
    });
  },

  newId(prefix) {
    return prefix + '_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
  }
};
