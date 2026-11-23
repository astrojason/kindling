/** An unread article from the user's articles library, as the Discover feed returns it. */
export interface DiscoverArticle {
  id: number;
  title: string;
  url: string;
  summary: string;
  readingTime: number;
  keywords: string[];
  categories: string[];
  content: string;
  createdAt: number;
}
