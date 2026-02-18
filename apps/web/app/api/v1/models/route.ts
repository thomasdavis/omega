import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    object: 'list',
    data: [
      {
        id: 'omega',
        object: 'model',
        created: 1700000000,
        owned_by: 'omega',
      },
    ],
  });
}
