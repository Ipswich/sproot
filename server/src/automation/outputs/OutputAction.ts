import { OutputActionPrecedence } from "@sproot/common/automation/OutputActionPrecedence";

/**
 * Simple data interface representing an output action.
 * Maps an automation to an output and value to set.
 */
export class OutputAction {
  id: number;
  automationId: number;
  outputId: number;
  value: number;
  precedence: OutputActionPrecedence;
  automationName: string | undefined;

  constructor(data: {
    id: number;
    automationId: number;
    outputId: number;
    value: number;
    precedence: OutputActionPrecedence;
    automationName?: string;
  }) {
    this.id = data.id;
    this.automationId = data.automationId;
    this.outputId = data.outputId;
    this.value = data.value;
    this.precedence = data.precedence;
    this.automationName = data.automationName;
  }
}
