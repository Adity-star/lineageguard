export interface ChangedFile {
  path: string;

  content: string;

  encoding?: 'utf-8' | 'base64';
}
