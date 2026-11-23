/** "1 reply", "1,234 replies": a chirp's reply count in words. */
export function repliesLabel(count: number): string {
  return count === 1 ? '1 reply' : `${count.toLocaleString('en')} replies`;
}

/** Shared by the reply link and button, so both read like the like toggle beside them. */
export const replyActionClasses = {
  group: '-ml-2 flex items-center gap-0.5 text-sm text-ink-muted tabular-nums',
  icon: 'grid size-9 place-items-center rounded-full transition-colors duration-150',
} as const;

/** History state that asks a conversation page to put the cursor in its reply box. */
export interface ConversationState {
  focusReply: true;
}
