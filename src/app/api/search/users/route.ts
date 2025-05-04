import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json([]);
    }

    // TODO: Implement actual database search
    // This is a mock response for now
    const mockUsers = Array.from({ length: 3 }, (_, i) => ({
      id: (i + 1).toString(),
      name: `Test User ${i + 1}`,
      username: `user${i + 1}`,
      email: `user${i + 1}@example.com`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })).filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.username.toLowerCase().includes(query.toLowerCase())
    );

    return NextResponse.json(mockUsers);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}