export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, { ...init, credentials: init.credentials ?? "same-origin" });
}
