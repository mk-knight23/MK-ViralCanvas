export interface MemeTemplate {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
  box_count?: number;
  source?: string;
  thumbnail?: string;
  sourceUrl?: string;
}

export interface FavoriteMeme {
  id: string;
  image: string;
  topText: string;
  bottomText: string;
  date: string;
}
