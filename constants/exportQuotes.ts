
export const EXPORT_QUOTES: string[] = [
  "Design is intelligence made visible.",
  "Every frame is a chance to say something.",
  "Great edits are invisible — you just feel them.",
  "Creativity takes courage.",
  "The details are not the details. They make the design.",
  "Simplicity is the ultimate sophistication.",
  "A story well cut is a story well told.",
  "Art is never finished, only abandoned.",
  "Good editing whispers, it doesn't shout.",
  "Make it simple, but significant.",
  "Every cut is a decision. Every decision is a voice.",
  "Style is a way of saying who you are without speaking.",
  "The pixels are patient. Take your time.",
  "Polish is just patience with taste.",
  "Rendering brilliance, one frame at a time.",
];


export function getRandomQuote(exclude?: string): string {
  const pool = exclude
    ? EXPORT_QUOTES.filter((q) => q !== exclude)
    : EXPORT_QUOTES;
  return pool[Math.floor(Math.random() * pool.length)];
}