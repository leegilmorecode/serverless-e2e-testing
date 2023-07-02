import { v4 as uuid } from 'uuid';

export function generateRandomId(length = 36): string {
  if (length > 36) {
    throw new Error('max uuid v4 length is 36');
  }
  return uuid().substring(0, length);
}
