export function cn(...classes: (string | undefined | null | false | Record<string, boolean>)[]) {
  return classes
    .flatMap((c) => {
      if (!c) return [];
      if (typeof c === 'string') return [c];
      // object map e.g. { 'class-name': condition }
      return Object.entries(c)
        .filter(([, v]) => !!v)
        .map(([k]) => k);
    })
    .join(' ');
}

