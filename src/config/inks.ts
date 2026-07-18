import { InkColor } from '../types';

export interface InkGroup {
  label: string;
  inks: InkColor[];
}

export const INK_GROUPS: InkGroup[] = [
  { label: 'Neutrals', inks: [
    { name: 'Black', hex: '#000000' },
    { name: 'Gray', hex: '#928D88' },
  ]},
  { label: 'Reds & Pinks', inks: [
    { name: 'Marine Red', hex: '#D2515E' },
    { name: 'Bright Red', hex: '#F15060' },
    { name: 'Crimson', hex: '#E45D50' },
    { name: 'Red', hex: '#FF665E' },
    { name: 'Scarlet', hex: '#FF585B' },
    { name: 'Fluorescent Pink', hex: '#FF48B0' },
    { name: 'Hot Pink', hex: '#FF4C8E' },
  ]},
  { label: 'Oranges & Yellows', inks: [
    { name: 'Fluorescent Orange', hex: '#FF7477' },
    { name: 'Orange', hex: '#FF6C2F' },
    { name: 'Sunflower', hex: '#FFB511' },
    { name: 'Yellow', hex: '#FFE627' },
    { name: 'Flat Gold', hex: '#BB8B41' },
    { name: 'Metallic Gold', hex: '#AC936E' },
  ]},
  { label: 'Blues', inks: [
    { name: 'Midnight', hex: '#435060' },
    { name: 'Federal Blue', hex: '#3D5588' },
    { name: 'Medium Blue', hex: '#4255A4' },
    { name: 'Lake', hex: '#235BA8' },
    { name: 'Sea Blue', hex: '#0074A2' },
    { name: 'Blue', hex: '#0078BF' },
    { name: 'Cornflower', hex: '#62A8E5' },
  ]},
  { label: 'Greens & Teals', inks: [
    { name: 'Spruce', hex: '#4A635D' },
    { name: 'Forest', hex: '#516E5A' },
    { name: 'Hunter Green', hex: '#407060' },
    { name: 'Moss', hex: '#68724D' },
    { name: 'Green', hex: '#00A95C' },
    { name: 'Light Teal', hex: '#00AA93' },
  ]},
  { label: 'Purples', inks: [
    { name: 'Grape', hex: '#6C5D80' },
    { name: 'Purple', hex: '#765BA7' },
    { name: 'Violet', hex: '#9D7AD2' },
  ]},
];

export const INKS: InkColor[] = INK_GROUPS.flatMap((g) => g.inks);
