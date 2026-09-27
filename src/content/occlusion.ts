/**
 * Salas en las que NO se usa el mapa de profundidad para que los muebles tapen
 * a los personajes (si en alguna el mapa sale mal y corta cabezas o pies).
 * Se decide mirando las capturas de tools/depth_maps.py y del juego.
 */
export const ZONE_OCCLUSION: Record<string, boolean> = {};
