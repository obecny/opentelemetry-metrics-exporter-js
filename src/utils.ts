import { randomBytes } from 'crypto';

export function getRandomKey(length: number) {
  return randomBytes(length).toString('hex');
}
