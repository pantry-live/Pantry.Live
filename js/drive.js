/*
 * Pantry — Google Drive storage.
 *
 * The app keeps one JSON file in a visible "Pantry App" folder. The
 * drive.file scope means the app only sees files it created itself.
 * No API key is needed; every request uses the OAuth access token.
 */

import { expireSession, getAccessToken } from "./auth.js";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

class DriveError extends Error {
  constructor(message, code = "drive_error", status = 0) {
    super(message);
    this.name = "DriveError";
    this.code = code;
    this.status = status;
  }
}

let cachedFolderId = null;
let cachedFileId = null;

function escapeQuery(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function tokenOrThrow() {
  const token = getAccessToken();
  if (!token) throw new DriveError("Not signed in.", "auth_expired", 401);
  return token;
}

async function driveFetch(url, options = {}) {
  const token = tokenOrThrow();
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (error) {
    throw new DriveError(error?.message || "Network request failed.", "network_error");
  }

  if (response.status === 401) {
    expireSession();
    throw new DriveError("Session expired.", "auth_expired", 401);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json();
      detail = payload?.error?.message || "";
    } catch {
      /* Some errors have no JSON body. */
    }
    const code = response.status === 403 ? "permission_denied" : "drive_error";
    throw new DriveError(detail || `Drive request failed (${response.status}).`, code, response.status);
  }

  return response;
}

async function findFolder(name) {
  if (cachedFolderId) return cachedFolderId;

  const query = `name = '${escapeQuery(name)}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name)&pageSize=10`;
  const response = await driveFetch(url);
  const payload = await response.json();
  const folder = payload.files?.[0];

  if (folder?.id) {
    cachedFolderId = folder.id;
    return cachedFolderId;
  }
  return null;
}

async function createFolder(name) {
  const response = await driveFetch(`${DRIVE_API}/files?fields=id,name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder"
    })
  });
  const payload = await response.json();
  if (!payload?.id) throw new DriveError("Could not create the Drive folder.", "create_folder");
  cachedFolderId = payload.id;
  return cachedFolderId;
}

async function ensureFolder(name) {
  return (await findFolder(name)) || createFolder(name);
}

async function findFile(name, folderId) {
  if (cachedFileId) return cachedFileId;

  const query = `name = '${escapeQuery(name)}' and '${escapeQuery(folderId)}' in parents and trashed = false`;
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&spaces=drive&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=10`;
  const response = await driveFetch(url);
  const payload = await response.json();
  const file = payload.files?.[0];

  if (file?.id) {
    cachedFileId = file.id;
    return cachedFileId;
  }
  return null;
}

async function readFile(fileId) {
  const response = await driveFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`);
  const text = await response.text();

  if (!text.trim()) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new DriveError("The data file is not valid JSON.", "invalid_json");
  }
}

async function writeFile(fileId, data) {
  await driveFetch(`${UPLOAD_API}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,modifiedTime`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
}

async function createFile(name, folderId) {
  const response = await driveFetch(`${DRIVE_API}/files?fields=id,name,modifiedTime`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/json",
      parents: [folderId]
    })
  });
  const payload = await response.json();
  if (!payload?.id) throw new DriveError("Could not create the data file.", "create_file");

  cachedFileId = payload.id;
  await writeFile(cachedFileId, {});
  return cachedFileId;
}

async function ensureDataFile({ folderName, fileName }) {
  const folderId = await ensureFolder(folderName);
  let fileId = await findFile(fileName, folderId);
  if (!fileId) fileId = await createFile(fileName, folderId);
  return { folderId, fileId };
}

export function resetCache() {
  cachedFolderId = null;
  cachedFileId = null;
}

/**
 * Find or create the data file and read it.
 * `data` is null when the file is empty or contains JSON null.
 */
export async function loadData(options) {
  try {
    const { fileId } = await ensureDataFile(options);
    const data = await readFile(fileId);
    return { fileId, data };
  } catch (error) {
    if (error instanceof DriveError && error.status === 404) {
      resetCache();
      const { fileId } = await ensureDataFile(options);
      const data = await readFile(fileId);
      return { fileId, data };
    }
    throw error;
  }
}

/** Write the JSON data, recreating the file if it was deleted. */
export async function saveData(fileId, data, options) {
  if (!fileId) {
    const next = await ensureDataFile(options);
    await writeFile(next.fileId, data);
    return next.fileId;
  }

  try {
    await writeFile(fileId, data);
    return fileId;
  } catch (error) {
    if (error instanceof DriveError && error.status === 404) {
      resetCache();
      const next = await ensureDataFile(options);
      await writeFile(next.fileId, data);
      return next.fileId;
    }
    throw error;
  }
}
