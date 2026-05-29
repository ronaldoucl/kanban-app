/**
 * Utilidades para construir y parsear el segmento de URL de un tablero.
 *
 * Formato: `{slug}-{idCorto}`, donde `slug` deriva del título (parte legible y
 * cosmética) e `idCorto` son los últimos caracteres del cuid (su parte
 * aleatoria). El backend resuelve el tablero buscando por `endsWith` acotado al
 * dueño, así que renombrar no rompe enlaces y las URLs viejas con el cuid
 * completo siguen funcionando. Los cuid no contienen guiones, por lo que el id
 * es siempre el último segmento separado por `-`.
 */

/** Cantidad de caracteres finales del cuid que se exponen en la URL. */
const SHORT_ID_LENGTH = 7;

/** Convierte un texto en un slug apto para URL (sin acentos, en minúsculas). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Arma el segmento de URL `{slug}-{idCorto}` para un tablero. */
export function buildBoardPath(board: { id: string; title: string }): string {
  const shortId = board.id.slice(-SHORT_ID_LENGTH);
  const slug = slugify(board.title);
  return slug ? `${slug}-${shortId}` : shortId;
}

/** Extrae el id real del tablero a partir del segmento de URL. */
export function extractBoardId(param: string): string {
  const idx = param.lastIndexOf('-');
  return idx >= 0 ? param.slice(idx + 1) : param;
}
