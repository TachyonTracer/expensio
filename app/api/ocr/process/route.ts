import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/middleware';
import { createApiResponse } from '@/lib/api-response';
import { ocrService } from '@/lib/services/ocr.service';

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
    const body = await request.json();
    const { receiptId, file } = body;

    let ocrResult;

    if (receiptId) {
      // Process existing receipt
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

      // Check if file exists and is an image
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

      if (!receipt.mimeType.startsWith('image/')) {
        return NextResponse.json(
          createApiResponse(false, null, {
            code: 'INVALID_FILE_TYPE',
            message: 'OCR processing is only available for image files',
          }),
          { status: 400 }
        );
      }

      // Read file and process OCR
      const fileBuffer = await readFile(fullPath);
      ocrResult = await ocrService.processReceipt(fileBuffer);

      // Update receipt with new OCR data
      await db.receipt.update({
        where: { id: receiptId },
        data: {
          ocrData: {
            text: ocrResult.text,
            confidence: ocrResult.confidence,
            extractedData: ocrResult.extractedData,
            processedAt: new Date().toISOString(),
          },
        },
      });
    } else if (file) {
      // Process uploaded file directly (for preview before saving)
      const formData = await request.formData();
      const uploadedFile = formData.get('file') as File;

      if (!uploadedFile) {
        return NextResponse.json(
          createApiResponse(false, null, {
            code: 'MISSING_FILE',
            message: 'No file provided',
          }),
          { status: 400 }
        );
      }

      if (!uploadedFile.type.startsWith('image/')) {
        return NextResponse.json(
          createApiResponse(false, null, {
            code: 'INVALID_FILE_TYPE',
            message: 'OCR processing is only available for image files',
          }),
          { status: 400 }
        );
      }

      // Process OCR directly from uploaded file
      const bytes = await uploadedFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      ocrResult = await ocrService.processReceipt(buffer);
    } else {
      return NextResponse.json(
        createApiResponse(false, null, {
          code: 'MISSING_INPUT',
          message: 'Either receiptId or file must be provided',
        }),
        { status: 400 }
      );
    }

    // Validate extracted data
    let validationResult = null;
    if (ocrResult.extractedData) {
      validationResult = await ocrService.validateExtractedData(ocrResult.extractedData);
    }

    return NextResponse.json(
      createApiResponse(true, {
        ocrResult,
        validation: validationResult,
      })
    );
  } catch (error) {
    console.error('OCR processing error:', error);
    return NextResponse.json(
      createApiResponse(false, null, {
        code: 'OCR_PROCESSING_FAILED',
        message: 'OCR processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}