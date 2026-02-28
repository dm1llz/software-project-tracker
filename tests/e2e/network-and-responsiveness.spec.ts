import { expect, test } from "@playwright/test";

const jsonUpload = (name: string, payload: unknown) => ({
  name,
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(payload), "utf8"),
});

test("keeps invalid-schema flow blocked and performs review runs without outbound network calls", async ({ page }) => {
  const outboundRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    const isLocal = ["127.0.0.1", "localhost"].includes(url.hostname);
    if (!isLocal && ["http:", "https:"].includes(url.protocol)) {
      outboundRequests.push(request.url());
    }
  });

  await page.goto("/");

  await page.getByLabel("Schema file").setInputFiles({
    name: "bad-schema.json",
    mimeType: "application/json",
    buffer: Buffer.from("{\n  \"type\": \n", "utf8"),
  });

  await expect(page.getByText("Schema error")).toBeVisible();
  await expect(page.getByLabel("FRD files")).toBeDisabled();

  await page.getByLabel("Schema file").setInputFiles(
    jsonUpload("good-schema.json", {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
      },
      additionalProperties: false,
    }),
  );

  await expect(page.getByText("Schema ready for FRD upload.")).toBeVisible();

  const mediumPayload = {
    title: "Medium FRD",
    body: "x".repeat(1024),
  };
  const twentyFiles = Array.from({ length: 20 }, (_, index) =>
    jsonUpload(`frd-${String(index + 1).padStart(2, "0")}.json`, mediumPayload),
  );

  await page.getByLabel("FRD files").setInputFiles(twentyFiles);
  await expect(page.getByText("total: 20")).toBeVisible();
  await expect(page.getByRole("button", { name: "frd-01.json" })).toBeVisible();

  await expect
    .poll(async () => outboundRequests.length, {
      message: `Unexpected outbound requests: ${outboundRequests.join(", ")}`,
    })
    .toBe(0);
});
