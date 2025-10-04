import { db } from '../db';
import { Receipt, ExtractedExpenseData, OCRResult } from '../types';
import { ocrService } from './ocr.service';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

export class ReceiptService {
  private static instance: ReceiptService;
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'receipts');

  private constructor() {}

  public static getInstance(): ReceiptService {
    if (!ReceiptService.instance) {
      ReceiptService.instance = new ReceiptService();
    }
    return ReceiptService.instance;
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir(): Promise<void> {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload and process a receipt file
   */
  public async uploadReceipt(
    file: File | Buffer,
    fileName: string,
    mimeType: string,
    expenseId?: string,
    processOCR: boolean = true
  ): Promise<Receipt> {
    await this.ensureUploadDir();

    // Generate unique filename
    const fileExtension = path.extname(fileName);
    const uniqueFileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, uniqueFileName);
    const relativePath = path.join('uploads', 'receipts', uniqueFileName);

    // Convert File to Buffer if needed
    let buffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file;
    }

    // Save file to disk
    await writeFile(filePath, buffer);

    // Process OCR if it's an image and OCR is requested
    let ocrData = null;
    if (processOCR && mimeType.startsWith('image/')) {
      try {
        const ocrResult = await ocrService.processReceipt(buffer);
        ocrData = {
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          extractedData: ocrResult.extractedData,
          processedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('OCR processing failed during upload:', error);
        // Continue without OCR data - it's not critical for file upload
      }
    }

    // Save receipt record to database
    const receipt = await db.receipt.create({
      data: {
        id: uuidv4(),
        expenseId: expenseId || null,
        filePath: relativePath,
        fileName,
        mimeType,
        ocrData,
      },
    });

    return receipt;
  }

  /**
   * Get receipt by ID with access control
   */
  public async getReceipt(receiptId: string, userId: string, userRole: string, companyId: string): Promise<Receipt | null> {
    const whereClause = {
      id: receiptId,
      ...(userRole === 'EMPLOYEE' 
        ? {
            expense: {
              userId,
              companyId,
            },
          }
        : {
            expense: {
              companyId,
            },
          }
      ),
    };

    return await db.receipt.findFirst({
      where: whereClause,
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
  }

  /**
   * Get receipts for an expense
   */
  public async getReceiptsForExpense(expenseId: string, userId: string, userRole: string, companyId: string): Promise<Receipt[]> {
    // First verify user has access to this expense
    const expense = await db.expense.findFirst({
      where: {
        id: expenseId,
        companyId,
        ...(userRole === 'EMPLOYEE' ? { userId } : {}),
      },
    });

    if (!expense) {
      throw new Error('Expense not found or access denied');
    }

    return await db.receipt.findMany({
      where: { expenseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all receipts for a user or company
   */
  public async getReceipts(userId: string, userRole: string, companyId: string): Promise<Receipt[]> {
    const whereClause = userRole === 'EMPLOYEE' 
      ? {
          expense: {
            userId,
            companyId,
          },
        }
      : {
          expense: {
            companyId,
          },
        };

    return await db.receipt.findMany({
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

  /**
   * Delete a receipt
   */
  public async deleteReceipt(receiptId: string, userId: string, userRole: string, companyId: string): Promise<void> {
    // Find receipt with access control
    const receipt = await db.receipt.findFirst({
      where: {
        id: receiptId,
        ...(userRole === 'EMPLOYEE' 
          ? {
              expense: {
                userId,
                companyId,
                status: { in: ['DRAFT', 'SUBMITTED'] }, // Only allow deletion of non-approved expenses
              },
            }
          : {
              expense: {
                companyId,
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
      throw new Error('Receipt not found or cannot be deleted');
    }

    // Check if expense is in a state that allows receipt deletion
    if (userRole === 'EMPLOYEE' && receipt.expense?.status && 
        !['DRAFT', 'SUBMITTED'].includes(receipt.expense.status)) {
      throw new Error('Cannot delete receipt from approved or processed expense');
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
  }

  /**
   * Update receipt OCR data
   */
  public async updateReceiptOCRData(receiptId: string, ocrData: any, userId: string, userRole: string, companyId: string): Promise<Receipt> {
    // Find receipt with access control
    const receipt = await this.getReceipt(receiptId, userId, userRole, companyId);
    
    if (!receipt) {
      throw new Error('Receipt not found or access denied');
    }

    return await db.receipt.update({
      where: { id: receiptId },
      data: { ocrData },
    });
  }

  /**
   * Reprocess OCR for a receipt
   */
  public async reprocessOCR(receiptId: string, userId: string, userRole: string, companyId: string): Promise<OCRResult> {
    const receipt = await this.getReceipt(receiptId, userId, userRole, companyId);
    
    if (!receipt) {
      throw new Error('Receipt not found or access denied');
    }

    if (!receipt.mimeType.startsWith('image/')) {
      throw new Error('OCR processing is only available for image files');
    }

    // Check if file exists
    const fullPath = path.join(process.cwd(), receipt.filePath);
    if (!existsSync(fullPath)) {
      throw new Error('Receipt file not found on server');
    }

    // Read file and process OCR
    const fs = await import('fs/promises');
    const fileBuffer = await fs.readFile(fullPath);
    const ocrResult = await ocrService.processReceipt(fileBuffer);

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

    return ocrResult;
  }

  /**
   * Get file path for a receipt
   */
  public async getReceiptFilePath(receiptId: string, userId: string, userRole: string, companyId: string): Promise<string> {
    const receipt = await this.getReceipt(receiptId, userId, userRole, companyId);
    
    if (!receipt) {
      throw new Error('Receipt not found or access denied');
    }

    const fullPath = path.join(process.cwd(), receipt.filePath);
    if (!existsSync(fullPath)) {
      throw new Error('Receipt file not found on server');
    }

    return fullPath;
  }

  /**
   * Validate receipt file
   */
  public validateReceiptFile(fileName: string, mimeType: string, size: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

    if (size > maxSize) {
      errors.push('File size exceeds 5MB limit');
    }

    if (!allowedTypes.includes(mimeType)) {
      errors.push('File type not allowed. Only JPEG, PNG, GIF, and PDF files are supported.');
    }

    if (!fileName || fileName.trim().length === 0) {
      errors.push('File name is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get receipt statistics for a user or company
   */
  public async getReceiptStats(userId: string, userRole: string, companyId: string): Promise<{
    totalReceipts: number;
    receiptsWithOCR: number;
    averageOCRConfidence: number;
    receiptsByType: Record<string, number>;
  }> {
    const whereClause = userRole === 'EMPLOYEE' 
      ? {
          expense: {
            userId,
            companyId,
          },
        }
      : {
          expense: {
            companyId,
          },
        };

    const receipts = await db.receipt.findMany({
      where: whereClause,
      select: {
        mimeType: true,
        ocrData: true,
      },
    });

    const totalReceipts = receipts.length;
    const receiptsWithOCR = receipts.filter(r => r.ocrData).length;
    
    let totalConfidence = 0;
    let confidenceCount = 0;
    
    const receiptsByType: Record<string, number> = {};

    receipts.forEach(receipt => {
      // Count by type
      receiptsByType[receipt.mimeType] = (receiptsByType[receipt.mimeType] || 0) + 1;
      
      // Calculate average confidence
      if (receipt.ocrData && typeof receipt.ocrData === 'object' && 'confidence' in receipt.ocrData) {
        totalConfidence += receipt.ocrData.confidence as number;
        confidenceCount++;
      }
    });

    const averageOCRConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    return {
      totalReceipts,
      receiptsWithOCR,
      averageOCRConfidence,
      receiptsByType,
    };
  }
}

// Export singleton instance
export const receiptService = ReceiptService.getInstance();