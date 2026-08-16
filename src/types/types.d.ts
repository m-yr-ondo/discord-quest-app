
export interface GameExecutable {
  is_launcher: boolean;
  name: string;
  os: string;
  filename?: string;
  path?: string;
  segments?: number;
  is_running?: boolean;
  is_installed?: boolean;
}
export interface Game {
    uid?: string;
    id: string;
    name: string;
    executables: GameExecutable[];
    icon_hash?: string | null;
    cover_image_hash?: string | null;
    icon_url?: string;
    cover_image_url?: string;
    aliases?: string[];
    themes?: string[];
    is_running?: boolean;
    is_installed?: boolean;
}

export interface GameActionsProvider {
  canPlayGame: (game: Game | null) => boolean;
  isGameInstalled: (game: Game | null) => boolean;
  isExecutableRunning: (executable: GameExecutable) => boolean;
  isGameExecutableInstalled: (executable: GameExecutable) => boolean;
}
