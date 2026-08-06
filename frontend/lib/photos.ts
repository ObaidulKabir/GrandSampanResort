export type ResortPhoto = { src: string; alt: string; unoptimized?: boolean };

function unsplash(id: string, params = 'w=1920&q=80') {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&${params}`;
}

export const heroPhotos: ResortPhoto[] = [
  { src: unsplash('photo-1520250497591-112f2f40a3f4'), alt: 'Aerial view of the resort coastline at Cox\u2019s Bazar' },
  { src: unsplash('photo-1573843981267-be1999ff37cd'), alt: 'Infinity pool overlooking the ocean' },
  { src: unsplash('photo-1512100356356-de1b84283e18'), alt: 'Turquoise water and palm-lined beach' },
  { src: unsplash('photo-1602002418082-a4443e081dd1'), alt: 'Suite interior with an ocean view' },
  { src: unsplash('photo-1540541338287-41700207dee6'), alt: 'Infinity pool at sunset' }
];

export const resortPhotos: ResortPhoto[] = [
  { src: unsplash('photo-1566073771259-6a8506099945'), alt: 'Luxury suite bedroom' },
  { src: unsplash('photo-1582719478250-c89cae4dc85b'), alt: 'Resort swimming pool' },
  { src: unsplash('photo-1571896349842-33c89424de2d'), alt: 'Beach loungers at sunset' },
  { src: unsplash('photo-1571003123894-1f0594d2b5d9'), alt: 'Poolside resort lounge' }
];

export const suitePhotoByType: Record<string, string> = {
  standard: unsplash('photo-1571003123894-1f0594d2b5d9', 'w=800&q=80'),
  delux: unsplash('photo-1566073771259-6a8506099945', 'w=800&q=80'),
  deluxe: unsplash('photo-1566073771259-6a8506099945', 'w=800&q=80'),
  premium: unsplash('photo-1602002418082-a4443e081dd1', 'w=800&q=80')
};

export function suitePhoto(type?: string) {
  const key = (type || '').toLowerCase();
  return suitePhotoByType[key] || suitePhotoByType.standard;
}
