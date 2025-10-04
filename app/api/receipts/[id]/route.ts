import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
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
      include: {
        expense: {
          select: {
            id: true,
            description: true,
            originalAmount: true,
            originalCurrency: true,
            status: true,
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
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

    return NextResponse.json(
      createApiResponse(true, { receipt })
    );
  } catch (error) {
    console.error('Get receipt error:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch receipt',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
                status: { in: ['DRAFT', 'SUBMITTED'] }, // Only allow deletion of non-approved expenses
              },
            }
          : {
              expense: {
                companyId: user.companyId,
              },
            }
        ),
      },
      include: {
        expense: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'RECEIPT_NOT_FOUND',
          message: 'Receipt not found or cannot be deleted',
        }),
        { status: 404 }
      );
    }

    // Check if expense is in a state that allows receipt deletion
    if (user.role === 'EMPLOYEE' && receipt.expense?.status && 
        !['DRAFT', 'SUBMITTED'].includes(receipt.expense.status)) {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'RECEIPT_LOCKED',
          message: 'Cannot delete receipt from approved or processed expense',
        }),
        { status: 403 }
      );
    }

    // Delete file from filesystem
    const fullPath = path.join(process.cwd(), receipt.filePath);
    if (existsSync(fullPath)) {
      try {
        await unlink(fullPath);
      } catch (error) {
        console.error('Failed to delete file:', error);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete receipt record from database
    await db.receipt.delete({
      where: { id: receiptId },
    });

    return NextResponse.json(
      createApiResponse(true, { message: 'Receipt deleted successfully' })
    );
  } catch (error) {
    console.error('Delete receipt error:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'DELETE_FAILED',
        message: 'Failed to delete receipt',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const body = await request.json();

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

    // Update receipt (mainly for OCR data corrections)
    const updatedReceipt = await db.receipt.update({
      where: { id: receiptId },
      data: {
        ocrData: body.ocrData || receipt.ocrData,
      },
    });

    return NextResponse.json(
      createApiResponse(true, { receipt: updatedReceipt })
    );
  } catch (error) {
    console.error('Update receipt error:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'UPDATE_FAILED',
        message: 'Failed to update receipt',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}