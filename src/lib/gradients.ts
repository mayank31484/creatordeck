export const slideGradients = [
  'from-violet-600 to-indigo-600',
  'from-blue-600 to-cyan-500',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-yellow-500',
  'from-purple-600 to-pink-500',
  'from-sky-500 to-blue-600',
  'from-lime-500 to-green-600',
  'from-fuchsia-500 to-purple-600',
];

export function getRandomGradient(index: number): string {
  return slideGradients[index % slideGradients.length];
}
