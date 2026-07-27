// No external imports needed

export interface IActionBaseRepository<T> {
  getAsync(automationId: number): Promise<T[]>;
  addAsync(automationId: number, ...params: unknown[]): Promise<number>;
  updateAsync(automationId: number, action: T): Promise<void>;
  deleteAsync(actionId: number): Promise<void>;
}

export interface IBaseConditionsRepository<T> {
  getAsync(automationId: number): Promise<T[]>;
  addAsync(automationId: number, ...params: unknown[]): Promise<number>;
  updateAsync(automationId: number, condition: T): Promise<void>;
  deleteAsync(conditionId: number): Promise<void>;
}
