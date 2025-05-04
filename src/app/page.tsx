import Image from "next/image";
import CreatePost from "@/features/posts/CreatePost";
import PostList from "@/features/posts/PostList";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <CreatePost />
        <PostList />
      </main>
    </div>
  );
}
