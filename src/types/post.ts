import { User } from './user';

export interface Post {
  id: string;
  content: string;
  author: User;
  likes: number;
  comments: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostData {
  content: string;
  imageUrl?: string;
}

export interface PostState {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
}