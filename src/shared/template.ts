// Fills copy templates: `{n}` inserts a value, `{n:shovel|shovels}` picks the word for that count,
// so every string says "1 shovel" and "2 shovels" without a second key (UI-4.2).

export type TemplateVars = Readonly<Record<string, string | number>>;

export const fillTemplate = (template: string, vars: TemplateVars): string =>
  template.replace(
    /\{(\w+)(?::([^|{}]*)\|([^{}]*))?\}/g,
    (m, k: string, one: string | undefined, many: string | undefined) => {
      if (!(k in vars)) return m;
      const v = vars[k];
      if (one === undefined || many === undefined) return String(v);
      return Number(v) === 1 ? one : many;
    }
  );
