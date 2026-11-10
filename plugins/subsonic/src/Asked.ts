type Asked = {
  text: (name: string) => string | null;
  texts: (name: string) => string[];
  number: (name: string, fallback: number, most: number) => number;
};

export type { Asked };
