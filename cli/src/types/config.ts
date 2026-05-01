export interface PrerequisiteStatus {
  ansible: {
    installed: boolean;
    version: string | null;
    skipped: boolean;
  };
  terraform: {
    installed: boolean;
    version: string | null;
    skipped: boolean;
  };
}
