export const initialUsers = [
  {
    id: 1,
    name: "Alice Johnson",
    avatar: "👩‍💼",
    followers: 245,
    following: 189,
    isFollowing: false,
  },
  {
    id: 2,
    name: "Bob Smith",
    avatar: "👨‍💻",
    followers: 156,
    following: 203,
    isFollowing: true,
  },
  {
    id: 3,
    name: "Carol Davis",
    avatar: "👩‍🎨",
    followers: 342,
    following: 167,
    isFollowing: false,
  },
  {
    id: 4,
    name: "David Wilson",
    avatar: "👨‍🎓",
    followers: 89,
    following: 134,
    isFollowing: true,
  },
];

export const initialPosts = [
  {
    id: 1,
    author: "Alice Johnson",
    avatar: "👩‍💼",
    time: "2h ago",
    content:
      "Just finished an amazing project! Feeling grateful for my amazing team. 🚀",
    tags: ["programming", "work", "teamwork"],
    likes: 24,
    comments: 8,
    shares: 3,
    liked: false,
    image: null,
  },
  {
    id: 2,
    author: "Bob Smith",
    avatar: "👨‍💻",
    time: "4h ago",
    content:
      "Beautiful sunset from my balcony today. Nature never fails to amaze me! 🌅",
    tags: ["photography", "nature", "sunset"],
    likes: 45,
    comments: 12,
    shares: 7,
    liked: true,
    image: "🌅",
  },
  {
    id: 3,
    author: "Carol Davis",
    avatar: "👩‍🎨",
    time: "6h ago",
    content:
      "Working on a new art piece. Abstract expressionism has always been my passion. What do you think?",
    tags: ["art", "painting", "creativity"],
    likes: 67,
    comments: 23,
    shares: 15,
    liked: false,
    image: "🎨",
  },
  {
    id: 4,
    author: "David Wilson",
    avatar: "👨‍🎓",
    time: "8h ago",
    content:
      "Great football match today! Our team played amazingly well. Next match is this weekend!",
    tags: ["football", "sports", "team"],
    likes: 32,
    comments: 15,
    shares: 5,
    liked: false,
    image: "⚽",
  },
];

export const initialGroups = [
  { id: 1, name: "Web Developers", members: 1234, avatar: "💻", joined: true },
  {
    id: 2,
    name: "Photography Enthusiasts",
    members: 856,
    avatar: "📸",
    joined: false,
  },
  { id: 3, name: "Book Club", members: 432, avatar: "📚", joined: true },
  {
    id: 4,
    name: "Fitness Motivation",
    members: 2341,
    avatar: "💪",
    joined: false,
  },
  { id: 5, name: "Football Fans", members: 892, avatar: "⚽", joined: true },
  { id: 6, name: "Artists United", members: 567, avatar: "🎨", joined: false },
];

export const initialNotifications = [
  {
    id: 1,
    type: "like",
    user: "Bob Smith",
    action: "liked your post",
    time: "5m ago",
    read: false,
  },
  {
    id: 2,
    type: "comment",
    user: "Carol Davis",
    action: "commented on your post",
    time: "1h ago",
    read: false,
  },
  {
    id: 3,
    type: "follow",
    user: "David Wilson",
    action: "started following you",
    time: "2h ago",
    read: true,
  },
  {
    id: 4,
    type: "group",
    user: "Web Developers",
    action: "New post in group",
    time: "4h ago",
    read: true,
  },
];

export const trendingTags = [
  { tag: "programming", posts: 1234 },
  { tag: "football", posts: 892 },
  { tag: "photography", posts: 756 },
  { tag: "art", posts: 543 },
  { tag: "sports", posts: 423 },
  { tag: "nature", posts: 387 },
  { tag: "work", posts: 321 },
  { tag: "creativity", posts: 298 },
];

export const availableTags = [
  "programming",
  "football",
  "sports",
  "photography",
  "art",
  "nature",
  "work",
  "creativity",
  "teamwork",
  "sunset",
  "painting",
  "team",
];
