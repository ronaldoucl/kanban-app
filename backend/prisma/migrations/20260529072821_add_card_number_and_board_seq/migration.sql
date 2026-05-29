-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "cardSeq" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "number" INTEGER NOT NULL DEFAULT 0;

-- Backfill: asignar un número secuencial por tablero a las cards existentes,
-- ordenadas por fecha de creación (y por id para desempatar de forma estable).
WITH numbered AS (
  SELECT
    c."id",
    ROW_NUMBER() OVER (
      PARTITION BY col."boardId"
      ORDER BY c."createdAt", c."id"
    ) AS rn
  FROM "Card" c
  JOIN "Column" col ON c."columnId" = col."id"
)
UPDATE "Card"
SET "number" = numbered.rn
FROM numbered
WHERE "Card"."id" = numbered."id";

-- Sincronizar el contador de cada tablero con el mayor número ya asignado,
-- para que las nuevas cards continúen la secuencia sin colisionar.
UPDATE "Board" b
SET "cardSeq" = COALESCE((
  SELECT MAX(c."number")
  FROM "Card" c
  JOIN "Column" col ON c."columnId" = col."id"
  WHERE col."boardId" = b."id"
), 0);
