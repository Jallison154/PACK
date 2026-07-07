declare module 'sql.js' {
  export interface SqlValue {
    [key: string]: string | number | null | Uint8Array
  }

  export interface Statement {
    bind(params?: unknown[]): boolean
    step(): boolean
    getAsObject(): SqlValue
    free(): void
  }

  export class Database {
    constructor(data?: ArrayLike<number> | Buffer | null)
    run(sql: string, params?: unknown[]): Database
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }

  export interface SqlJsStatic {
    Database: typeof Database
  }

  export interface InitSqlJsConfig {
    locateFile?: (file: string) => string
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>
}
