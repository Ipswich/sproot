const OUTPUT_ACTION_PRECEDENCE_VALUES = ["Normal", "High", "Emergency"] as const;

type OutputActionPrecedence = (typeof OUTPUT_ACTION_PRECEDENCE_VALUES)[number];

const OUTPUT_ACTION_PRECEDENCE_PRIORITY: Record<OutputActionPrecedence, number> = {
  Normal: 200,
  High: 500,
  Emergency: 800,
};

function isOutputActionPrecedence(value: string): value is OutputActionPrecedence {
  return OUTPUT_ACTION_PRECEDENCE_VALUES.includes(value as OutputActionPrecedence);
}

export {
  OUTPUT_ACTION_PRECEDENCE_PRIORITY,
  OUTPUT_ACTION_PRECEDENCE_VALUES,
  isOutputActionPrecedence,
};
export type { OutputActionPrecedence };