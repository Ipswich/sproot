import ModelList from "../../../../sensors/ModelList";

export default function supportedModelsHandler(): string[] {
  return Object.values(ModelList);
}
