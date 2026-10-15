/** The browser's localStorage for the mock server (one store for every account: it is the "server"). Client only. */
export function serverStorage(): Pick<Storage, "getItem" | "setItem"> {
  if (typeof window === "undefined") throw new Error("no storage on the server");
  return window.localStorage;
}
