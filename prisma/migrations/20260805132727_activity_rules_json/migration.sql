/*
  Reglas de la actividad: de dos columnas booleanas a un único objeto JSON.

  Motivo: agregar una regla nueva (permitir editar código, subir archivos,
  cambiar de lenguaje, ...) dejaba de requerir una migración por regla. Las
  reglas ausentes del JSON se resuelven contra el catálogo de la aplicación
  (src/config/activity-rules.catalog.ts), así que las filas existentes siguen
  siendo válidas.

  Los valores de allow_copy y allow_paste se copian dentro de "rules" antes de
  borrar las columnas: no se pierde ninguna configuración.
*/
-- AlterTable
ALTER TABLE "activities" ADD COLUMN "rules" JSONB;

-- Backfill: preserva las reglas existentes dentro del nuevo objeto JSON.
UPDATE "activities"
SET "rules" = jsonb_build_object(
  'allowCopy', "allow_copy",
  'allowPaste', "allow_paste"
);

-- AlterTable
ALTER TABLE "activities" DROP COLUMN "allow_copy",
DROP COLUMN "allow_paste";
