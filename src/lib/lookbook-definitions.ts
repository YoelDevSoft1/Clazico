export type DefaultLookbookDefinition = {
  id: string;
  title: string;
  slug: string;
  season: string;
  description: string;
  thesis: string;
  tempo: string;
  palette: string;
  tags: string[];
  image: string;
};

export const DEFAULT_LOOKBOOKS: DefaultLookbookDefinition[] = [
  {
    id: 'asfalto-rojo',
    title: 'Asfalto Rojo',
    slug: 'asfalto-rojo',
    season: 'Drop 01',
    description:
      'Sneakers protagonistas, piezas negras y acentos rojos para un uniforme urbano que se compra completo.',
    thesis: 'Para entrar fuerte sin explicar demasiado.',
    tempo: 'Urbano / Noche',
    palette: 'Negro, blanco, rojo',
    tags: ['Sneaker first', 'Oversized', 'Stock real'],
    image: '/lookbooks/asfalto-rojo.png',
  },
  {
    id: 'court-ready',
    title: 'Court Ready',
    slug: 'court-ready',
    season: 'Drop 02',
    description:
      'Siluetas limpias, capas deportivas y prendas listas para moverse entre cancha, calle y tienda.',
    thesis: 'La mezcla exacta entre rendimiento y presencia.',
    tempo: 'Sport / Diario',
    palette: 'Blanco, grafito, rojo',
    tags: ['Sportwear', 'Capas ligeras', 'Velox sync'],
    image: '/lookbooks/court-ready.png',
  },
  {
    id: 'after-hours',
    title: 'After Hours',
    slug: 'after-hours',
    season: 'Drop 03',
    description:
      'Looks mas oscuros, texturas fuertes y accesorios que convierten una compra rapida en editorial.',
    thesis: 'Cuando el outfit tiene que aguantar toda la noche.',
    tempo: 'Premium / Calle',
    palette: 'Zinc, humo, rojo',
    tags: ['Nocturno', 'Accesorios', 'Edicion limitada'],
    image: '/lookbooks/after-hours.png',
  },
  {
    id: 'clean-rotation',
    title: 'Clean Rotation',
    slug: 'clean-rotation',
    season: 'Drop 04',
    description:
      'La rotacion esencial: pares versatiles, ropa facil y combinaciones para repetir sin verse igual.',
    thesis: 'Menos ruido, mas intencion.',
    tempo: 'Minimal / Semana',
    palette: 'Blanco, negro, gris',
    tags: ['Esenciales', 'Rotacion', 'Compra rapida'],
    image: '/lookbooks/clean-rotation.png',
  },
];

export function getDefaultLookbookBySlug(slug: string) {
  return DEFAULT_LOOKBOOKS.find((lookbook) => lookbook.slug === slug);
}
