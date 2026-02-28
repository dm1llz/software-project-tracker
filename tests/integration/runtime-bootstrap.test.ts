// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { flushSync } from "react-dom";

import { mountApp, resolveMountElement } from "../../src/main";

describe("runtime bootstrap", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("mounts app into #app and renders initial heading", async () => {
    document.body.innerHTML = '<div id="app"></div>';

    let root: ReturnType<typeof mountApp> | null = null;
    flushSync(() => {
      root = mountApp(resolveMountElement());
    });

    expect(document.querySelector("h1")?.textContent).toBe("Software Project Tracker");
    root?.unmount();
  });

  it("throws controlled error when mount target is missing", () => {
    document.body.innerHTML = '<div id="different-root"></div>';

    expect(() => resolveMountElement("app", document)).toThrow("Missing root container: #app");
  });
});
