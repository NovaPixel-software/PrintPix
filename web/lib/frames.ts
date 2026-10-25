/*
 * Overlay designs for photos. Each one is a transparent PNG (2000 x 2000 px, round) laid over the photo: a ring of
 * hearts, stars or night sky. The name is not in the picture, it is the ribbon label drawn on top by labels.ts.
 *
 * To add a design: put a square PNG in web/public/frames/ and add one line below. `ink` and `ribbon` are the name
 * colour and the ribbon colour the design starts with.
 */
export interface FrameDef {
  id: string;
  label: string;
  src: string;
  ink: string;
  ribbon: string;
}

export const FRAMES: FrameDef[] = [
  { id: 'hearts-pink', label: 'Pink hearts', src: '/frames/hearts-pink.png', ink: '#ffffff', ribbon: '#ec407a' },
  { id: 'hearts-red', label: 'Red hearts', src: '/frames/hearts-red.png', ink: '#ffffff', ribbon: '#d62839' },
  { id: 'stars-gold', label: 'Gold stars', src: '/frames/stars-gold.png', ink: '#14213d', ribbon: '#e0a800' },
  { id: 'night-moon', label: 'Night & moon', src: '/frames/night-moon.png', ink: '#14213d', ribbon: '#f6d56b' },
  { id: 'night-stars', label: 'Night stars', src: '/frames/night-stars.png', ink: '#14213d', ribbon: '#ffd54f' },
  { id: 'clouds-blue', label: 'Blue sky', src: '/frames/clouds-blue.png', ink: '#ffffff', ribbon: '#3fa5e3' },
  { id: 'dots-pastel', label: 'Pastel dots', src: '/frames/dots-pastel.png', ink: '#ffffff', ribbon: '#ff8fab' },
  { id: 'ring-gold', label: 'Gold ring', src: '/frames/ring-gold.png', ink: '#ffffff', ribbon: '#1e3a6e' },
];

export const getFrame = (id: string | undefined) => (id ? FRAMES.find((f) => f.id === id) : undefined);
