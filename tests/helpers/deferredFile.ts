export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

export const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
};

export const makeDeferredTextFile = (name: string, deferred: Deferred<string>): File => {
  const file = new File(["{}"], name, { type: "application/json" });
  Object.defineProperty(file, "text", {
    configurable: true,
    value: () => deferred.promise,
  });
  return file;
};
