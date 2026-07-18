import { InkColor } from '../types';

export interface InkGroup {
  label: string;
  inks: InkColor[];
}

export const INK_GROUPS: InkGroup[] = [
  { label: 'Neutrals', inks: [
    { name: 'Black', hex: '#000000', transparency: 0.15 },
    { name: 'Gray', hex: '#928D88', transparency: 0.5 },
  ]},
  { label: 'Reds & Pinks', inks: [
    { name: 'Marine Red', hex: '#D2515E', transparency: 0.5 },
    { name: 'Bright Red', hex: '#F15060', transparency: 0.5 },
    { name: 'Crimson', hex: '#E45D50', transparency: 0.5 },
    { name: 'Red', hex: '#FF665E', transparency: 0.5 },
    { name: 'Scarlet', hex: '#FF585B', transparency: 0.5 },
    { name: 'Fluorescent Pink', hex: '#FF48B0', transparency: 0.8 },
    { name: 'Hot Pink', hex: '#FF4C8E', transparency: 0.6 },
  ]},
  { label: 'Oranges & Yellows', inks: [
    { name: 'Fluorescent Orange', hex: '#FF7477', transparency: 0.7 },
    { name: 'Orange', hex: '#FF6C2F', transparency: 0.55 },
    { name: 'Sunflower', hex: '#FFB511', transparency: 0.6 },
    { name: 'Yellow', hex: '#FFE627', transparency: 0.75 },
    { name: 'Flat Gold', hex: '#BB8B41', transparency: 0.4 },
    { name: 'Metallic Gold', hex: '#AC936E', transparency: 0.2 },
  ]},
  { label: 'Blues', inks: [
    { name: 'Midnight', hex: '#435060', transparency: 0.2 },
    { name: 'Federal Blue', hex: '#3D5588', transparency: 0.4 },
    { name: 'Medium Blue', hex: '#4255A4', transparency: 0.45 },
    { name: 'Lake', hex: '#235BA8', transparency: 0.45 },
    { name: 'Sea Blue', hex: '#0074A2', transparency: 0.5 },
    { name: 'Blue', hex: '#0078BF', transparency: 0.5 },
    { name: 'Cornflower', hex: '#62A8E5', transparency: 0.7 },
  ]},
  { label: 'Greens & Teals', inks: [
    { name: 'Spruce', hex: '#4A635D', transparency: 0.35 },
    { name: 'Forest', hex: '#516E5A', transparency: 0.35 },
    { name: 'Hunter Green', hex: '#407060', transparency: 0.4 },
    { name: 'Moss', hex: '#68724D', transparency: 0.45 },
    { name: 'Green', hex: '#00A95C', transparency: 0.5 },
    { name: 'Light Teal', hex: '#00AA93', transparency: 0.55 },
  ]},
  { label: 'Purples', inks: [
    { name: 'Grape', hex: '#6C5D80', transparency: 0.45 },
    { name: 'Purple', hex: '#765BA7', transparency: 0.5 },
    { name: 'Violet', hex: '#9D7AD2', transparency: 0.6 },
  ]},
];

export const INKS: InkColor[] = INK_GROUPS.flatMap((g) => g.inks);
