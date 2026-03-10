export interface ContextualSource {
  title: string;
  url: string;
  content: string;
}

export type ContextualAPIKey =
  | 'reliefweb'
  | 'gdacs'
  | 'usgs'
  | 'nasa-eonet'
  | 'who'
  | 'open-meteo';
