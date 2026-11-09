export const JOURNAL_FILE = '.anhedral-journal.json';

export const TRANSACTION_DIRECTORY = '.anhedral-txn';

export const JOURNAL_VERSION = 2 as const;

export const LOCAL_TRANSACTION_ROOT_PATTERN =
  /^(?:stage|backup)-\d+-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type JournalEntry = {
  relativePath: string;
  backupPath: string | null;
  backupFingerprint?: string;
  installed: boolean;
  installedFingerprint: string | null;
};

export type TransactionJournal = {
  version: typeof JOURNAL_VERSION;
  backupRoot: string;
  stageRoot: string;
  entries: JournalEntry[];
  createdDirectories: string[];
};
