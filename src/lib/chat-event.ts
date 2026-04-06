/**
 * Open the embedded agent chat panel.
 * Dispatches a synthetic Cmd+J keydown event which ModuleLayoutShell listens for.
 * The message parameter is currently unused — the agent panel opens to a blank state.
 */
export function openChatWithContext(_message: string): void {
  window.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "j",
      metaKey: true,
      ctrlKey: true,
      bubbles: true,
    })
  );
}
