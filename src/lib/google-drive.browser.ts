export type DriveFolder = { id: string; name?: string };
export type DriveEpubFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
};

type GoogleTokenResponse = { access_token?: string; error?: string; error_description?: string };
type GoogleTokenClient = {
  callback: (response: GoogleTokenResponse) => void;
  requestAccessToken: (options: { prompt: string }) => void;
};
type GooglePickerData = { action?: string; docs?: Array<{ id?: string; name?: string }> };
type GooglePickerView = { setSelectFolderEnabled: (enabled: boolean) => GooglePickerView };
type GooglePickerBuilder = {
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  addView: (view: GooglePickerView) => GooglePickerBuilder;
  setCallback: (callback: (data: GooglePickerData) => void) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
};
type GooglePickerApi = {
  ViewId: { FOLDERS: string };
  Action: { PICKED: string; CANCEL: string };
  DocsView: new (viewId: string) => { setMimeTypes: (mimeTypes: string) => GooglePickerView };
  PickerBuilder: new () => GooglePickerBuilder;
};
type GoogleErrorBody = {
  error?: { message?: string };
  error_description?: string;
  message?: string;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => GoogleTokenClient;
        };
      };
      picker?: GooglePickerApi;
    };
    gapi?: { load: (name: string, options: { callback: () => void; onerror: () => void }) => void };
    __KALLISTIS_CONFIG__?: {
      SUPABASE_URL?: string;
      SUPABASE_PUBLISHABLE_KEY?: string;
      SUPABASE_ANON_KEY?: string;
      VITE_GOOGLE_API_KEY?: string;
      VITE_GOOGLE_CLIENT_ID?: string;
    };
  }
}

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const EPUB_MIME = "application/epub+zip";
let tokenClient: GoogleTokenClient | undefined;
let accessToken = "";

async function driveError(res: Response, fallback: string) {
  let detail = "";
  try {
    const data = (await res.json()) as GoogleErrorBody;
    detail = data.error?.message || data.error_description || data.message || "";
  } catch {
    detail = await res.text().catch(() => "");
  }
  return new Error(`${fallback} (${res.status}${detail ? `: ${detail}` : ""})`);
}

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("Google Drive só pode rodar no navegador.");
  }
}

function env(name: "VITE_GOOGLE_API_KEY" | "VITE_GOOGLE_CLIENT_ID") {
  const value = import.meta.env[name] || window.__KALLISTIS_CONFIG__?.[name] || process.env[name];
  if (!value) {
    throw new Error(
      `Variável ${name} não chegou ao cliente. Confira o runtime config do Cloudflare.`,
    );
  }
  return value;
}

function loadScript(src: string) {
  ensureBrowser();
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
  });
}

export function extractDriveFolderId(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const direct = text.match(/^[\w-]{10,}$/)?.[0];
  if (direct) return direct;
  try {
    const url = new URL(text);
    return (
      url.pathname.match(/\/folders\/([\w-]+)/)?.[1] ??
      url.searchParams.get("id") ??
      url.searchParams.get("folderId")
    );
  } catch {
    return text.match(/folders\/([\w-]+)/)?.[1] ?? null;
  }
}

export async function ensureGoogleDriveToken(): Promise<string> {
  ensureBrowser();
  if (accessToken) return accessToken;
  const clientId = env("VITE_GOOGLE_CLIENT_ID");
  await loadScript("https://accounts.google.com/gsi/client");
  const oauth = window.google?.accounts?.oauth2;
  if (!oauth?.initTokenClient) throw new Error("SDK de login do Google não carregou corretamente.");
  const client = (tokenClient ??= oauth.initTokenClient({
    client_id: clientId,
    scope: DRIVE_SCOPE,
    callback: () => {},
  }));
  return new Promise((resolve, reject) => {
    client.callback = (response) => {
      if (response?.error) reject(new Error(response.error_description || response.error));
      else if (!response?.access_token) reject(new Error("Google não retornou token de acesso."));
      else resolve((accessToken = response.access_token));
    };
    try {
      client.requestAccessToken({ prompt: accessToken ? "" : "consent" });
    } catch (error) {
      reject(
        error instanceof Error ? error : new Error("Falha ao solicitar acesso ao Google Drive."),
      );
    }
  });
}

export async function openDriveFolderPicker(): Promise<DriveFolder | null> {
  ensureBrowser();
  const token = await ensureGoogleDriveToken();
  await Promise.all([
    loadScript("https://apis.google.com/js/api.js"),
    loadScript("https://accounts.google.com/gsi/client"),
  ]);
  const gapi = window.gapi;
  if (!gapi?.load) throw new Error("SDK do Google Picker não carregou corretamente.");
  await new Promise<void>((resolve, reject) =>
    gapi.load("picker", {
      callback: resolve,
      onerror: () => reject(new Error("Falha ao carregar Google Picker.")),
    }),
  );
  return new Promise((resolve, reject) => {
    const picker = window.google?.picker;
    if (!picker) {
      reject(new Error("Google Picker indisponível neste navegador."));
      return;
    }
    const view = new picker.DocsView(picker.ViewId.FOLDERS)
      .setMimeTypes("application/vnd.google-apps.folder")
      .setSelectFolderEnabled(true);
    new picker.PickerBuilder()
      .setDeveloperKey(env("VITE_GOOGLE_API_KEY"))
      .setOAuthToken(token)
      .addView(view)
      .setCallback((data) => {
        if (data.action === picker.Action.PICKED) {
          const doc = data.docs?.[0];
          resolve(doc?.id ? { id: doc.id, name: doc.name } : null);
        }
        if (data.action === picker.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}

export async function listEpubsInDriveFolder(folderId: string): Promise<DriveEpubFile[]> {
  ensureBrowser();
  const token = await ensureGoogleDriveToken();
  const files: DriveEpubFile[] = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      q: `'${folderId.replaceAll("'", "\\'")}' in parents and trashed = false and (mimeType = '${EPUB_MIME}' or name contains '.epub')`,
      fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)",
      orderBy: "name",
      pageSize: "1000",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw await driveError(res, "Não consegui listar a pasta do Google Drive");
    const data = await res.json().catch(() => {
      throw new Error("Google Drive retornou uma resposta inválida ao listar a pasta.");
    });
    files.push(...(data.files ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);

  return files.filter(
    (file: DriveEpubFile) =>
      file.mimeType === EPUB_MIME || file.name.toLowerCase().endsWith(".epub"),
  );
}

export async function downloadDriveFileBlob(fileId: string): Promise<Blob> {
  ensureBrowser();
  const token = await ensureGoogleDriveToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await driveError(res, "Não consegui baixar o EPUB do Google Drive");
  const blob = await res.blob();
  if (blob.size <= 0) throw new Error("O EPUB baixado do Google Drive veio vazio.");
  return blob;
}
