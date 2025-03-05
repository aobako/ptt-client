export abstract class SelectQueryBuilder<T> {
  abstract where(type: string, condition: any): this

  abstract get(): Promise<T[]>

  abstract getOne(): Promise<T | undefined>
}
