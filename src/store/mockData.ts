import { User } from '@/types/user';
import { Post } from '@/types/post';

// Mock user data
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'johndoe',
    email: 'john@example.com',
    name: 'John Doe',
    avatar: '/default-avatar.png',
    bio: 'Software engineer and coffee enthusiast',
    createdAt: '2023-01-15T00:00:00.000Z',
    updatedAt: '2023-01-15T00:00:00.000Z',
  },
  {
    id: '2',
    username: 'janedoe',
    email: 'jane@example.com',
    name: 'Jane Doe',
    avatar: '/default-avatar.png',
    bio: 'UX designer and plant lover',
    createdAt: '2023-02-20T00:00:00.000Z',
    updatedAt: '2023-02-20T00:00:00.000Z',
  },
  {
    id: '3',
    username: 'alexsmith',
    email: 'alex@example.com',
    name: 'Alex Smith',
    avatar: '/default-avatar.png',
    bio: 'Product manager and hiking enthusiast',
    createdAt: '2023-03-10T00:00:00.000Z',
    updatedAt: '2023-03-10T00:00:00.000Z',
  },
  {
    id: '4',
    username: 'sarahjones',
    email: 'sarah@example.com',
    name: 'Sarah Jones',
    avatar: '/default-avatar.png',
    bio: 'Data scientist and amateur photographer',
    createdAt: '2023-04-05T00:00:00.000Z',
    updatedAt: '2023-04-05T00:00:00.000Z',
  },
  {
    id: '5',
    username: 'mikebrown',
    email: 'mike@example.com',
    name: 'Mike Brown',
    avatar: '/default-avatar.png',
    bio: 'Frontend developer and music producer',
    createdAt: '2023-05-12T00:00:00.000Z',
    updatedAt: '2023-05-12T00:00:00.000Z',
  },
];

// Mock post data
export const mockPosts: Post[] = [
  {
    id: '1',
    content: 'Just launched my new website! Check it out at example.com',
    author: mockUsers[0],
    likes: 42,
    comments: 7,
    createdAt: '2023-06-15T10:30:00.000Z',
    updatedAt: '2023-06-15T10:30:00.000Z',
  },
  {
    id: '2',
    content: 'Working on a new design system for our product. Excited to share more soon!',
    author: mockUsers[1],
    likes: 28,
    comments: 5,
    createdAt: '2023-06-14T14:20:00.000Z',
    updatedAt: '2023-06-14T14:20:00.000Z',
  },
  {
    id: '3',
    content: 'Just finished reading "Atomic Habits" by James Clear. Highly recommend!',
    author: mockUsers[2],
    likes: 35,
    comments: 12,
    createdAt: '2023-06-13T09:15:00.000Z',
    updatedAt: '2023-06-13T09:15:00.000Z',
  },
  {
    id: '4',
    content: 'Beautiful sunset at the beach today! 🌅',
    author: mockUsers[3],
    likes: 56,
    comments: 8,
    image: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?q=80&w=500',
    createdAt: '2023-06-12T19:45:00.000Z',
    updatedAt: '2023-06-12T19:45:00.000Z',
  },
  {
    id: '5',
    content: 'Just released a new open-source library for React. Check it out on GitHub!',
    author: mockUsers[4],
    likes: 47,
    comments: 15,
    createdAt: '2023-06-11T11:30:00.000Z',
    updatedAt: '2023-06-11T11:30:00.000Z',
  },
  {
    id: '6',
    content: 'Attended an amazing tech conference this weekend. So many great insights!',
    author: mockUsers[0],
    likes: 31,
    comments: 9,
    createdAt: '2023-06-10T16:20:00.000Z',
    updatedAt: '2023-06-10T16:20:00.000Z',
  },
  {
    id: '7',
    content: 'Working from a coffee shop today. The change of scenery is refreshing!',
    author: mockUsers[1],
    likes: 24,
    comments: 6,
    createdAt: '2023-06-09T08:45:00.000Z',
    updatedAt: '2023-06-09T08:45:00.000Z',
  },
  {
    id: '8',
    content: 'Just hiked to the top of Mount Rainier. The view was breathtaking!',
    author: mockUsers[2],
    likes: 62,
    comments: 18,
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=500',
    createdAt: '2023-06-08T12:10:00.000Z',
    updatedAt: '2023-06-08T12:10:00.000Z',
  },
];

// Simulate API delay
export const simulateDelay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

// Simulate API error (20% chance)
export const simulateError = (errorRate = 0.2) => Math.random() < errorRate;