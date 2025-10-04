import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/middleware';
import { createApiResponse } from '@/lib/api-response';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        }),
        { status: 401 }
      );
    }

    const { user } = authResult;
    const receiptId = params.id;

    // Find receipt with access control
    const receipt = await db.receipt.findFirst({
      where: {
        id: receiptId,
        ...(user.role === 'EMPLOYEE' 
          ? {
              expense: {
                userId: user.id,
                companyId: user.companyId,
              },
            }
          : {
              expense: {
                companyId: user.companyId,
              },
            }
        ),
      },
    });

    if (!receipt) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'RECEIPT_NOT_FOUND',
          message: 'Receipt not found or access denied',
        }),
        { status: 404 }
      );
    }

    // Check if file exists
    const fullPath = path.join(process.cwd(), receipt.filePath);
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'FILE_NOT_FOUND',
          message: 'Receipt file not found on server',
        }),
        { status: 404 }
      );
    }

    // Read and serve the file
    const fileBuffer = await readFile(fullPath);
    
    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', receipt.mimeType);
    headers.set('Content-Length', fileBuffer.length.toString());
    headers.set('Content-Disposition', `inline; filename="${receipt.fileName}"`);
    headers.set('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Serve receipt file error:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'FILE_SERVE_FAILED',
        message: 'Failed to serve receipt file',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}