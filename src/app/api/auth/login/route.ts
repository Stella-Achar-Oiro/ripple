import { NextResponse } from 'next/server';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // TODO: Implement actual authentication logic
    // This is a mock response for now
    const mockUser = {
      id: '1',
      email: validatedData.email,
      name: 'Test User',
      username: 'testuser',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // In a real application, you would:
    // 1. Verify credentials against a database
    // 2. Generate a JWT token
    // 3. Set secure HTTP-only cookie
    const mockToken = 'mock-jwt-token';

    return new NextResponse(
      JSON.stringify({ 
        user: mockUser,
        token: mockToken
      }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          // In production, you'd set secure cookie options
          'Set-Cookie': `token=${mockToken}; Path=/; HttpOnly`
        }
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }
}