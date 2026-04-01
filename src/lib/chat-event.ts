/**
 * Dispatch a custom event to open the chat panel with a pre-filled message.
 * Used by module pages to connect "Talk to Agent" buttons to the chat panel.
 */
export function openChatWithContext(message: string): void {
  window.dispatchEvent(
    new CustomEvent("spokestack:open-chat", { detail: { message } })
  );
}
