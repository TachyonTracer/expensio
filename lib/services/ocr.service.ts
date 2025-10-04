import Tesseract from 'tesseract.js';
import { OCRResult, ExtractedExpenseData } from '../types';

export class OCRService {
  private static instance: OCRService;
  private worker: Tesseract.Worker | null = null;

  private constructor() {}

  public static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  /**
   * Initialize the OCR worker
   */
  private async initializeWorker(): Promise<void> {
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('eng');
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,/$€£¥₹-: ',
      });
    }
  }

  /**
   * Process receipt image and extract text using OCR
   */
  public async processReceipt(file: File | Buffer | string): Promise<OCRResult> {
    try {
      await this.initializeWorker();
      
      if (!this.worker) {
        throw new Error('OCR worker failed to initialize');
      }

      const { data } = await this.worker.recognize(file);
      
      const ocrResult: OCRResult = {
        text: data.text,
        confidence: data.confidence,
      };

      // Extract expense data from the OCR text
      const extractedData = await this.extractExpenseData(data.text);
      if (extractedData) {
        ocrResult.extractedData = extractedData;
      }

      return ocrResult;
    } catch (error) {
      console.error('OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract structured expense data from OCR text
   */
  public async extractExpenseData(ocrText: string): Promise<ExtractedExpenseData | null> {
    try {
      const extractedData: ExtractedExpenseData = {
        confidence: 0,
      };

      // Extract amount using various patterns
      const amount = this.extractAmount(ocrText);
      if (amount) {
        extractedData.amount = amount.value;
        extractedData.currency = amount.currency;
        extractedData.confidence += 0.3;
      }

      // Extract date
      const date = this.extractDate(ocrText);
      if (date) {
        extractedData.date = date;
        extractedData.confidence += 0.2;
      }

      // Extract vendor/merchant name
      const vendor = this.extractVendor(ocrText);
      if (vendor) {
        extractedData.vendor = vendor;
        extractedData.confidence += 0.2;
      }

      // Extract category based on vendor or keywords
      const category = this.extractCategory(ocrText, vendor);
      if (category) {
        extractedData.category = category;
        extractedData.confidence += 0.1;
      }

      // Normalize confidence to 0-1 range
      extractedData.confidence = Math.min(extractedData.confidence, 1.0);

      return extractedData.confidence > 0 ? extractedData : null;
    } catch (error) {
      console.error('Data extraction failed:', error);
      return null;
    }
  }

  /**
   * Extract amount and currency from text
   */
  private extractAmount(text: string): { value: number; currency?: string } | null {
    // Common currency symbols and patterns
    const currencyPatterns = [
      // Dollar amounts: $123.45, USD 123.45, 123.45 USD
      /(?:USD?\s*)?[\$]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:USD?)?/gi,
      // Euro amounts: €123.45, EUR 123.45, 123.45 EUR
      /(?:EUR?\s*)?[€]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:EUR?)?/gi,
      // Pound amounts: £123.45, GBP 123.45, 123.45 GBP
      /(?:GBP?\s*)?[£]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:GBP?)?/gi,
      // Yen amounts: ¥123, JPY 123, 123 JPY
      /(?:JPY?\s*)?[¥]?\s*(\d{1,3}(?:,\d{3})*)\s*(?:JPY?)?/gi,
      // Rupee amounts: ₹123.45, INR 123.45, 123.45 INR
      /(?:INR?\s*)?[₹]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:INR?)?/gi,
      // Generic amount patterns
      /(?:total|amount|sum|price|cost|charge)[\s:]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi,
    ];

    const currencyMap: Record<string, string> = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      '₹': 'INR',
    };

    let bestMatch: { value: number; currency?: string } | null = null;
    let highestAmount = 0;

    for (const pattern of currencyPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        const amountStr = match[1]?.replace(/,/g, '');
        const amount = parseFloat(amountStr);
        
        if (!isNaN(amount) && amount > 0) {
          // Prefer higher amounts as they're more likely to be the total
          if (amount > highestAmount) {
            highestAmount = amount;
            
            // Detect currency from the match
            let currency: string | undefined;
            const fullMatch = match[0];
            
            for (const [symbol, code] of Object.entries(currencyMap)) {
              if (fullMatch.includes(symbol)) {
                currency = code;
                break;
              }
            }
            
            // Check for currency codes in the match
            if (!currency) {
              const currencyCodes = ['USD', 'EUR', 'GBP', 'JPY', 'INR'];
              for (const code of currencyCodes) {
                if (fullMatch.toUpperCase().includes(code)) {
                  currency = code;
                  break;
                }
              }
            }

            bestMatch = { value: amount, currency };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Extract date from text
   */
  private extractDate(text: string): Date | null {
    const datePatterns = [
      // MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g,
      // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
      /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g,
      // YYYY-MM-DD
      /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g,
      // Month DD, YYYY
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/gi,
      // DD Month YYYY
      /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/gi,
    ];

    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };

    for (const pattern of datePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        try {
          let date: Date;
          
          if (match[0].match(/[a-zA-Z]/)) {
            // Handle month name patterns
            if (match[1] && isNaN(Number(match[1]))) {
              // Month DD, YYYY format
              const month = monthMap[match[1].toLowerCase().substring(0, 3)];
              const day = parseInt(match[2]);
              const year = parseInt(match[3]);
              date = new Date(year, month, day);
            } else {
              // DD Month YYYY format
              const day = parseInt(match[1]);
              const month = monthMap[match[2].toLowerCase().substring(0, 3)];
              const year = parseInt(match[3]);
              date = new Date(year, month, day);
            }
          } else {
            // Handle numeric date patterns
            const part1 = parseInt(match[1]);
            const part2 = parseInt(match[2]);
            const part3 = parseInt(match[3]);
            
            if (part3 > 1900) {
              // Third part is year
              if (part1 > 12) {
                // DD/MM/YYYY
                date = new Date(part3, part2 - 1, part1);
              } else {
                // MM/DD/YYYY (default to US format)
                date = new Date(part3, part1 - 1, part2);
              }
            } else {
              // YYYY-MM-DD
              date = new Date(part1, part2 - 1, part3);
            }
          }
          
          // Validate date is reasonable (not in future, not too old)
          const now = new Date();
          const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          
          if (date <= now && date >= oneYearAgo) {
            return date;
          }
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Extract vendor/merchant name from text
   */
  private extractVendor(text: string): string | null {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Usually the vendor name is in the first few lines
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      
      // Skip lines that look like addresses, phone numbers, or common receipt headers
      if (this.isLikelyVendorName(line)) {
        return this.cleanVendorName(line);
      }
    }

    return null;
  }

  /**
   * Check if a line is likely to be a vendor name
   */
  private isLikelyVendorName(line: string): boolean {
    // Skip if it looks like an address
    if (/\d+\s+[A-Za-z\s]+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive)/i.test(line)) {
      return false;
    }
    
    // Skip if it looks like a phone number
    if (/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(line)) {
      return false;
    }
    
    // Skip if it's mostly numbers
    if (line.replace(/[^0-9]/g, '').length > line.length * 0.5) {
      return false;
    }
    
    // Skip common receipt headers
    const skipPatterns = [
      /receipt/i,
      /invoice/i,
      /bill/i,
      /thank you/i,
      /customer copy/i,
      /merchant copy/i,
    ];
    
    for (const pattern of skipPatterns) {
      if (pattern.test(line)) {
        return false;
      }
    }
    
    // Must have some alphabetic characters and reasonable length
    return /[A-Za-z]/.test(line) && line.length >= 3 && line.length <= 50;
  }

  /**
   * Clean and format vendor name
   */
  private cleanVendorName(name: string): string {
    return name
      .replace(/[^\w\s&'-]/g, '') // Remove special characters except common business ones
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 50); // Limit length
  }

  /**
   * Extract or infer category from text and vendor
   */
  private extractCategory(text: string, vendor?: string): string | null {
    const categoryKeywords: Record<string, string[]> = {
      'Food & Dining': [
        'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'food', 'dining',
        'mcdonalds', 'starbucks', 'subway', 'kfc', 'dominos', 'lunch', 'dinner',
        'breakfast', 'meal', 'kitchen', 'bistro', 'grill', 'bar'
      ],
      'Transportation': [
        'uber', 'lyft', 'taxi', 'gas', 'fuel', 'parking', 'metro', 'bus',
        'train', 'airline', 'flight', 'car rental', 'toll', 'transport'
      ],
      'Accommodation': [
        'hotel', 'motel', 'inn', 'resort', 'lodge', 'accommodation',
        'marriott', 'hilton', 'hyatt', 'airbnb', 'booking'
      ],
      'Office Supplies': [
        'office', 'supplies', 'staples', 'paper', 'pen', 'printer',
        'computer', 'software', 'equipment', 'desk', 'chair'
      ],
      'Entertainment': [
        'movie', 'cinema', 'theater', 'concert', 'show', 'entertainment',
        'netflix', 'spotify', 'game', 'amusement'
      ],
      'Healthcare': [
        'pharmacy', 'medical', 'doctor', 'hospital', 'clinic', 'health',
        'medicine', 'prescription', 'dental', 'vision'
      ],
      'Utilities': [
        'electric', 'electricity', 'gas', 'water', 'internet', 'phone',
        'utility', 'bill', 'service'
      ],
    };

    const textLower = text.toLowerCase();
    const vendorLower = vendor?.toLowerCase() || '';
    const searchText = `${textLower} ${vendorLower}`;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (searchText.includes(keyword)) {
          return category;
        }
      }
    }

    return 'Other';
  }

  /**
   * Validate extracted data and provide confidence scoring
   */
  public async validateExtractedData(data: ExtractedExpenseData): Promise<{ isValid: boolean; errors: string[]; confidence: number }> {
    const errors: string[] = [];
    let confidence = data.confidence;

    // Validate amount
    if (!data.amount || data.amount <= 0) {
      errors.push('Invalid or missing amount');
      confidence -= 0.3;
    } else if (data.amount > 10000) {
      errors.push('Amount seems unusually high');
      confidence -= 0.1;
    }

    // Validate date
    if (data.date) {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      
      if (data.date > now) {
        errors.push('Date cannot be in the future');
        confidence -= 0.2;
      } else if (data.date < oneYearAgo) {
        errors.push('Date seems too old');
        confidence -= 0.1;
      }
    }

    // Validate vendor
    if (data.vendor && data.vendor.length < 2) {
      errors.push('Vendor name too short');
      confidence -= 0.1;
    }

    // Ensure confidence doesn't go below 0
    confidence = Math.max(0, confidence);

    return {
      isValid: errors.length === 0,
      errors,
      confidence,
    };
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// Export singleton instance
export const ocrService = OCRService.getInstance();