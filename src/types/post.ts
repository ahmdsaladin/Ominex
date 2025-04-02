export interface User {
  id: string;
  name: string | null;
  image: string | null;
}

export interface Post {
  id: string;
  content: string;
  mediaUrl?: string | null;
  platform: string;
  platformId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  user: User;
} 