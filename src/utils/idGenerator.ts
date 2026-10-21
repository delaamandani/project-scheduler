let counter = 0;

export function generateId(prefix: string = 'id'): string {
  counter++;
  return `${prefix}-${Date.now()}-${counter}`;
}

export function resetCounter(): void {
  counter = 0;
}
