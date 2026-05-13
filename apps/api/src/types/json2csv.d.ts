declare module "json2csv" {
  export class Parser<T = unknown> {
    constructor(opts?: { fields?: Array<string | { label: string; value: string }>; header?: boolean });
    parse(data: T[]): string;
  }
}
