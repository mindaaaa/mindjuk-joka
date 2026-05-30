export function stripExtension(name: string): string {
  const dotIdx = name.lastIndexOf('.');

  if (dotIdx <= 0) {
    return name;
  }
  return name.slice(0, dotIdx);
}
