import swaggerUi from "swagger-ui-express";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { join } from "node:path";

const yamlPath = join(import.meta.dirname, "..", "..", "docs", "api", "openapi.yaml");
const rawYaml = readFileSync(yamlPath, "utf-8");
const swaggerSpec = parse(rawYaml);

const swaggerUiHandler = swaggerUi.serve;
const swaggerUiSetup = swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Code Panel API — Docs",
});

export { swaggerUiHandler, swaggerUiSetup, swaggerSpec };
