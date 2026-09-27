/**
 * Deja un sombreado solo con ASCII: quita los comentarios (en español, con
 * tildes). La especificación de GLSL ES solo admite ASCII y algunas gráficas
 * de tablet rechazan el sombreado entero por una «á» en un comentario.
 */
export function glsl(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}
