import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const dir = join(process.cwd(), 'public', 'features');
    const files = await readdir(dir, { withFileTypes: true });
    const names = files
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter((n) => /\.(png|jpe?g|svg)$/i.test(n));
    return NextResponse.json(names);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

