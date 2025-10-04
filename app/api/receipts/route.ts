import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/middleware';
import { FileUploadSchema } from '@/lib/types';
import { createApiResponse } from '@/lib/api-response';
import { ocrService } from '@/lib/services/ocr.service';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'receipts');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const expenseId = formData.get('expenseId') as string;

    if (!file) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'MISSING_FILE',
          message: 'No file provided',
        }),
        { status: 400 }
      );
    }

    // Validate file
    const validation = FileUploadSchema.safeParse({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
    });

    if (!validation.success) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'INVALID_FILE',
          message: 'File validation failed',
          details: validation.error.errors,
        }),
        { status: 400 }
      );
    }

    // Additional security checks
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds 5MB limit',
        }),
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'INVALID_FILE_TYPE',
          message: 'File type not allowed. Only JPEG, PNG, GIF, and PDF files are supported.',
        }),
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    await ensureUploadDir();

    // Generate unique filename
    const fileExtension = path.extname(file.name);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFileName);
    const relativePath = path.join('uploads', 'receipts', uniqueFileName);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Process OCR if it's an image
    let ocrData = null;
    if (file.type.startsWith('image/')) {
      try {
        const ocrResult = await ocrService.processReceipt(buffer);
        ocrData = {
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          extractedData: ocrResult.extractedData,
          processedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('OCR processing failed:', error);
        // Continue without OCR data - it's not critical for file upload
      }
    }

    // Save receipt record to database
    const receipt = await db.receipt.create({
      data: {
        id: uuidv4(),
        expenseId: expenseId || null,
        filePath: relativePath,
        fileName: file.name,
        mimeType: file.type,
        ocrData: ocrData,
      },
    });

    return NextResponse.json(
      createApiResponse(true, {
        receipt: {
          id: receipt.id,
          fileName: receipt.fileName,
          mimeType: receipt.mimeType,
          filePath: receipt.filePath,
          ocrData: receipt.ocrData,
          createdAt: receipt.createdAt,
        },
      })
    );
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'UPLOAD_FAILED',
        message: 'File upload failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get('expenseId');

    let receipts;

    if (expenseId) {
      // Get receipts for specific expense
      // First verify user has access to this expense
      const expense = await db.expense.findFirst({
        where: {
          id: expenseId,
          companyId: user.companyId,
          ...(user.role === 'EMPLOYEE' ? { userId: user.id } : {}),
        },
      });

      if (!expense) {
        return NextResponse.json(
          createApiResponse(false, null, {
            code: 'EXPENSE_NOT_FOUND',
            message: 'Expense not found or access denied',
          }),
          { status: 404 }
        );
      }

      receipts = await db.receipt.findMany({
        where: { expenseId },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Get all receipts for user's company (admin/manager) or user's receipts (employee)
      const whereClause = user.role === 'EMPLOYEE' 
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
          };

      receipts = await db.receipt.findMany({
        where: whereClause,
        include: {
          expense: {
            select: {
              id: true,
              description: true,
              originalAmount: true,
              originalCurrency: true,
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(
      createApiResponse(true, { receipts })
    );
  } catch (error) {
    console.error('Get receipts error:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch receipts',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}