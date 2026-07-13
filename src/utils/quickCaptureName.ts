/** Keeps name state in sync when Quick Capture expands — always use the full input value. */
export function applyQuickCaptureNameChange(
  nextValue: string,
  expanded: boolean,
): { name: string; expanded: boolean } {
  return {
    name: nextValue,
    expanded: expanded || nextValue.length > 0,
  }
}
