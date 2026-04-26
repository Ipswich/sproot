/**
 * Simple data interface representing an output action.
 * Maps an automation to an output and value to set.
 */
export class OutputAction {
  id: number;
  automationId: number;
  outputId: number;
  value: number;

  constructor(data: { id: number; automationId: number; outputId: number; value: number }) {
    this.id = data.id;
    this.automationId = data.automationId;
    this.outputId = data.outputId;
    this.value = data.value;
  }
}
