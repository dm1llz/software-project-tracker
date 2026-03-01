import { expect, test } from "@playwright/test";

const jsonUpload = (name: string, payload: unknown) => ({
  name,
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(payload), "utf8"),
});

const textUpload = (name: string, text: string) => ({
  name,
  mimeType: "application/json",
  buffer: Buffer.from(text, "utf8"),
});

test("completes a mixed-result review flow and inspects file detail tabs", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Schema file").setInputFiles(
    jsonUpload("schema.json", {
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

  await page.getByLabel("FRD files").setInputFiles([
    jsonUpload("valid-frd.json", { title: "Good" }),
    jsonUpload("valid-frd.json", { description: "Missing title", extra: true }),
    textUpload("invalid-json.frd", "{\n  \"title\": \n"),
  ]);

  await expect(page.getByText("total: 3")).toBeVisible();
  await expect(page.getByRole("button", { name: "valid-frd.json (1)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "valid-frd.json (2)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "invalid-json.frd" })).toBeVisible();
  await expect(page.getByRole("region", { name: "File results" })).toHaveCount(1);
  await expect(
    page
      .getByRole("region", { name: "Schema controls" })
      .getByRole("region", { name: "File results" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "valid-frd.json (1)" }).click();
  await expect(page.getByRole("heading", { name: "File detail" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Readable FRD" })).toBeVisible();

  await page.getByRole("button", { name: "invalid-json.frd" }).click();
  await expect(page.getByRole("button", { name: "Readable FRD" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Issues" })).toBeVisible();
});
