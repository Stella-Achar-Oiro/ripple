import { User } from './user';

export interface Post {
  id: string;
  content: string;
  author: User;
  likes: number;
  comments: number;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostsState {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
}

export interface CreatePostData {
  content: string;
  image?: File;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  postId: string;
  createdAt: string;
  updatedAt: string;
}