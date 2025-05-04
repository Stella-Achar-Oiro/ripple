import { NextResponse } from 'next/server';
import { z } from 'zod';

const registerSchema = z.object({
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // TODO: Implement actual registration logic
    // This is a mock response for now
    const mockUser = {
      id: '1',
      ...validatedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // In a real application, you would:
    // 1. Check if user already exists
    // 2. Hash the password
    // 3. Save user to database
    // 4. Generate JWT token
    // 5. Set secure HTTP-only cookie
    const mockToken = 'mock-jwt-token';

    return new NextResponse(
      JSON.stringify({ 
        user: mockUser,
        token: mockToken
      }), 
      {
        status: 201,
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
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}