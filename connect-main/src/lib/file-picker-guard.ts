const FILE_PICKER_GUARD_MS = 3_500;
const FILE_UPLOAD_SUCCESS_GUARD_MS = 10 * 60 * 1000;
const FILE_PICKER_MAX_OPEN_MS = 2 * 60 * 1000;
const FILE_PICKER_SESSION_KEY = "filePickerGuardState";

const getBody = () => (typeof document === "undefined" ? null : document.body);

const readStoredState = () => {
  if (typeof window === "undefined") return null;

  try {
    const rawState = window.sessionStorage.getItem(FILE_PICKER_SESSION_KEY);
    return rawState ? JSON.parse(rawState) as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

const writeStoredState = (state: Record<string, unknown>) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(FILE_PICKER_SESSION_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures; body dataset guard still works in normal browsers.
  }
};

const removeStoredState = () => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(FILE_PICKER_SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
};

const getGuardSnapshot = () => {
  const body = getBody();
  const storedState = readStoredState();

  return {
    isOpen: body?.dataset.filePickerOpen === "true" || storedState?.filePickerOpen === true,
    openedAt: Math.max(Number(body?.dataset.filePickerOpenedAt || 0), Number(storedState?.filePickerOpenedAt || 0)),
    guardUntil: Math.max(Number(body?.dataset.filePickerGuardUntil || 0), Number(storedState?.filePickerGuardUntil || 0)),
  };
};

export const markFilePickerOpen = () => {
  const body = getBody();
  if (!body) return;

  const now = Date.now();
  body.dataset.filePickerOpen = "true";
  body.dataset.filePickerOpenedAt = String(now);
  body.dataset.filePickerGuardUntil = String(now + FILE_PICKER_GUARD_MS);
  writeStoredState({
    filePickerOpen: true,
    filePickerOpenedAt: now,
    filePickerGuardUntil: now + FILE_PICKER_GUARD_MS,
  });
};

export const extendFilePickerGuard = (durationMs = 30_000) => {
  const body = getBody();
  if (!body) return;

  const storedState = readStoredState();
  const currentGuardUntil = Math.max(
    Number(body.dataset.filePickerGuardUntil || 0),
    Number(storedState?.filePickerGuardUntil || 0)
  );
  const nextGuardUntil = Date.now() + durationMs;
  body.dataset.filePickerOpen = "true";
  body.dataset.filePickerGuardUntil = String(Math.max(currentGuardUntil, nextGuardUntil));
  writeStoredState({
    ...storedState,
    filePickerOpen: true,
    filePickerOpenedAt: Number(body.dataset.filePickerOpenedAt || storedState?.filePickerOpenedAt || Date.now()),
    filePickerGuardUntil: Math.max(currentGuardUntil, nextGuardUntil),
  });
};

export const markFilePickerClosed = () => {
  const body = getBody();
  if (!body) return;

  body.dataset.filePickerOpen = "false";
  const storedState = readStoredState();
  writeStoredState({ ...storedState, filePickerOpen: false });
};

export const isFilePickerGuardActive = () => {
  const { isOpen, openedAt, guardUntil } = getGuardSnapshot();
  const pickerLikelyOpen =
    isOpen &&
    openedAt > 0 &&
    Date.now() - openedAt < FILE_PICKER_MAX_OPEN_MS;

  return pickerLikelyOpen || guardUntil > Date.now();
};

export const clearFilePickerState = () => {
  const body = getBody();
  if (!body) return;

  delete body.dataset.filePickerOpen;
  delete body.dataset.filePickerOpenedAt;
  delete body.dataset.filePickerGuardUntil;
  delete body.dataset.filePickerClearToken;
  removeStoredState();
};

export const scheduleFilePickerGuardClear = (delayMs = FILE_PICKER_GUARD_MS) => {
  const body = getBody();
  if (!body || typeof window === "undefined") return;

  const token = `${Date.now()}-${Math.random()}`;
  body.dataset.filePickerClearToken = token;

  window.setTimeout(() => {
    const currentBody = getBody();
    if (!currentBody || currentBody.dataset.filePickerClearToken !== token) return;

    const openedAt = Number(currentBody.dataset.filePickerOpenedAt || 0);
    const pickerLikelyStillOpen =
      currentBody.dataset.filePickerOpen === "true" &&
      openedAt > 0 &&
      Date.now() - openedAt < FILE_PICKER_MAX_OPEN_MS;

    if (pickerLikelyStillOpen) {
      scheduleFilePickerGuardClear(FILE_PICKER_GUARD_MS);
      return;
    }

    const guardUntil = Number(currentBody.dataset.filePickerGuardUntil || 0);
    if (guardUntil > Date.now()) {
      scheduleFilePickerGuardClear(guardUntil - Date.now() + 100);
      return;
    }

    clearFilePickerState();
  }, delayMs);
};

export const keepFilePickerGuardAfterSuccessfulUpload = () => {
  extendFilePickerGuard(FILE_UPLOAD_SUCCESS_GUARD_MS);
};