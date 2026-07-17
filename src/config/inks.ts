import { InkColor } from '../types';

/**
 * Official Risograph ink palette with accurate RGB hex approximations.
 * Based on Riso ink swatch references and community color guides.
 */
export const INKS: InkColor[] = [
  // Neutrals
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },

  // Reds & Pinks
  { name: 'Bright Red', hex: '#F15060' },
  { name: 'Red', hex: '#FF665E' },
  { name: 'Scarlet', hex: '#FF585B' },
  { name: 'Crimson', hex: '#E45D50' },
  { name: 'Fluorescent Pink', hex: '#FF48B0' },
  { name: 'Hot Pink', hex: '#FF4C8E' },
  { name: 'Flat Gold', hex: '#BB8B41' },

  // Oranges & Yellows
  { name: 'Orange', hex: '#FF6C2F' },
  { name: 'Sunflower', hex: '#FFB511' },
  { name: 'Yellow', hex: '#FFE627' },
  { name: 'Fluorescent Orange', hex: '#FF7477' },

  // Blues
  { name: 'Blue', hex: '#0078BF' },
  { name: 'Federal Blue', hex: '#3D5588' },
  { name: 'Cornflower', hex: '#62A8E5' },
  { name: 'Marine Red', hex: '#D2515E' },
  { name: 'Midnight', hex: '#435060' },

  // Greens & Teals
  { name: 'Green', hex: '#00A95C' },
  { name: 'Light Teal', hex: '#00AA93' },
  { name: 'Sea Blue', hex: '#0074A2' },
  { name: 'Lake', hex: '#235BA8' },
  { name: 'Moss', hex: '#68724D' },
  { name: 'Spruce', hex: '#4A635D' },
  { name: 'Forest', hex: '#516E5A' },
  { name: 'Hunter Green', hex: '#407060' },

  // Purples
  { name: 'Violet', hex: '#9D7AD2' },
  { name: 'Purple', hex: '#765BA7' },
  { name: 'Grape', hex: '#6C5D80' },

  // Grays & Misc
  { name: 'Medium Blue', hex: '#4255A4' },
  { name: 'Gray', hex: '#928D88' },
  { name: 'Metallic Gold', hex: '#AC936E' },
];
