import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function createEmptyStore() {
  return {
    connections: [],
  };
}

async function readStore(storeFile) {
  try {
    const raw = await readFile(storeFile, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.connections)) {
      return createEmptyStore();
    }

    return parsed;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return createEmptyStore();
    }

    throw error;
  }
}

async function writeStore(storeFile, store) {
  await mkdir(dirname(storeFile), { recursive: true });
  await writeFile(storeFile, JSON.stringify(store, null, 2), "utf8");
}

export async function getConnectionByTargetAccount(storeFile, targetAccount) {
  const store = await readStore(storeFile);

  return (
    store.connections.find(
      (connection) => connection.targetAccount === targetAccount,
    ) ?? null
  );
}

export async function upsertConnection(storeFile, connection) {
  const store = await readStore(storeFile);
  const now = new Date().toISOString();
  const preparedConnection = {
    ...connection,
    createdAt:
      store.connections.find(
        (storedConnection) =>
          storedConnection.targetAccount === connection.targetAccount,
      )?.createdAt ?? now,
    updatedAt: now,
  };

  const remainingConnections = store.connections.filter(
    (storedConnection) =>
      storedConnection.targetAccount !== connection.targetAccount,
  );

  remainingConnections.push(preparedConnection);

  await writeStore(storeFile, { connections: remainingConnections });

  return preparedConnection;
}
