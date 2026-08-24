import { createContext, useContext } from 'react';

export type MessageWorkspaceShellMode = 'standard' | 'entering' | 'immersive' | 'exiting';

export const MESSAGE_WORKSPACE_SHELL_TRANSITION_MS = 320;

export type MessageWorkspaceShellController = {
  available: boolean;
  mode: MessageWorkspaceShellMode;
  immersive: boolean;
  enterImmersive: () => void;
  exitImmersive: () => void;
};

const MessageWorkspaceShellContext = createContext<MessageWorkspaceShellController>({
  available: false,
  mode: 'standard',
  immersive: false,
  enterImmersive: () => undefined,
  exitImmersive: () => undefined,
});

export const MessageWorkspaceShellProvider = MessageWorkspaceShellContext.Provider;

export function useMessageWorkspaceShell(): MessageWorkspaceShellController {
  return useContext(MessageWorkspaceShellContext);
}
