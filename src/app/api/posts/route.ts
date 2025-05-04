import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createPostSchema = z.object({
  content: z.string().min(1).max(500),
  imageUrl: z.string().url().optional(),
});

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '10');
    const username = searchParams.get('username');

    // TODO: Implement actual database integration
    // This is a mock response for now
    const mockPosts = Array.from({ length: limit }, (_, i) => {
      const id = cursor ? parseInt(cursor) + i + 1 : i + 1;
      return {
        id: id.toString(),
        content: `This is a sample post ${id}`,
        author: {
          id: '1',
          name: username || 'Test User',
          username: username || 'testuser',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        likes: Math.floor(Math.random() * 10),
        comments: Math.floor(Math.random() * 5),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const nextCursor = (cursor ? parseInt(cursor) : 0) + limit;
    const hasMore = nextCursor < 50; // Mock total of 50 posts

    return NextResponse.json({
      posts: mockPosts,
      nextCursor: hasMore ? nextCursor.toString() : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createPostSchema.parse(body);

    // TODO: Implement actual database integration
    // This is a mock response for now
    const mockPost = {
      id: Date.now().toString(),
      ...validatedData,
      author: {
        id: '1',
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(mockPost, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}