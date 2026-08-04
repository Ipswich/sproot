const OUTPUT_ACTION_PRECEDENCE_VALUES = ["Normal", "High", "Emergency"] as const;

type OutputActionPrecedence = (typeof OUTPUT_ACTION_PRECEDENCE_VALUES)[number];

const OUTPUT_ACTION_PRECEDENCE_PRIORITY: Record<OutputActionPrecedence, number> = {
  Normal: 200,
  High: 500,
  Emergency: 800,
};

const OUTPUT_ACTION_PRECEDENCE_COLORS: Record<OutputActionPrecedence, string> = {
  Normal: "blue",
  High: "yellow",
  Emergency: "red",
};

function isOutputActionPrecedence(value: string): value is OutputActionPrecedence {
  return OUTPUT_ACTION_PRECEDENCE_VALUES.includes(value as OutputActionPrecedence);
}

function getOutputActionPrecedenceColor(precedence: string): string {
  return OUTPUT_ACTION_PRECEDENCE_COLORS[precedence as OutputActionPrecedence] ?? "gray";
}

export {
  OUTPUT_ACTION_PRECEDENCE_COLORS,
  OUTPUT_ACTION_PRECEDENCE_PRIORITY,
  OUTPUT_ACTION_PRECEDENCE_VALUES,
  isOutputActionPrecedence,
  getOutputActionPrecedenceColor,
};
export type { OutputActionPrecedence };
