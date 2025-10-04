import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  verifyToken,
} from '@/lib/auth';
import { JWTPayload, UserRole } from '@/lib/types';

// Mock environment variables
vi.mock('@/lib/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret',
    JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    BCRYPT_SALT_ROUNDS: 10,
  },
}));

describe('Authentication Functions', () => {
  const testPassword = 'testPassword123';
  const testJWTPayload: JWTPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    companyId: '123e4567-e89b-12d3-a456-426614174001',
    role: 'EMPLOYEE' as UserRole,
    email: 'test@example.com',
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Password Hashing and Verification', () => {
    it('should hash password correctly', async () => {
      const hashedPassword = await hashPassword(testPassword);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(testPassword);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isValid = await verifyPassword(testPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isValid = await verifyPassword('wrongPassword', hashedPassword);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const hashedPassword = await hashPassword(testPassword);
      const isValid = await verifyPassword('', hashedPassword);
      
      expect(isValid).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid access token', () => {
      const token = generateAccessToken(testJWTPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate valid refresh token', () => {
      const token = generateRefreshToken(testJWTPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for access and refresh', () => {
      const accessToken = generateAccessToken(testJWTPayload);
      const refreshToken = generateRefreshToken(testJWTPayload);
      
      expect(accessToken).not.toBe(refreshToken);
    });

    it('should include correct payload in access token', () => {
      const token = generateAccessToken(testJWTPayload);
      const decoded = jwt.verify(token, 'test-jwt-secret') as JWTPayload;
      
      expect(decoded.userId).toBe(testJWTPayload.userId);
      expect(decoded.companyId).toBe(testJWTPayload.companyId);
      expect(decoded.role).toBe(testJWTPayload.role);
      expect(decoded.email).toBe(testJWTPayload.email);
    });
  });

  describe('JWT Token Verification', () => {
    it('should verify valid access token', () => {
      const token = generateAccessToken(testJWTPayload);
      const payload = verifyAccessToken(token);
      
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testJWTPayload.userId);
      expect(payload?.companyId).toBe(testJWTPayload.companyId);
      expect(payload?.role).toBe(testJWTPayload.role);
      expect(payload?.email).toBe(testJWTPayload.email);
    });

    it('should verify valid refresh token', () => {
      const token = generateRefreshToken(testJWTPayload);
      const payload = verifyRefreshToken(token);
      
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testJWTPayload.userId);
    });

    it('should return null for invalid access token', () => {
      const payload = verifyAccessToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should return null for invalid refresh token', () => {
      const payload = verifyRefreshToken('invalid-token');
      expect(payload).toBeNull();
    });

    it('should return null for expired token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { ...testJWTPayload, exp: Math.floor(Date.now() / 1000) - 3600 },
        'test-jwt-secret'
      );
      
      const payload = verifyAccessToken(expiredToken);
      expect(payload).toBeNull();
    });

    it('should return null for token with wrong secret', () => {
      const tokenWithWrongSecret = jwt.sign(testJWTPayload, 'wrong-secret');
      const payload = verifyAccessToken(tokenWithWrongSecret);
      expect(payload).toBeNull();
    });
  });

  describe('Token Header Extraction', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'valid-jwt-token';
      const authHeader = `Bearer ${token}`;
      const extractedToken = extractTokenFromHeader(authHeader);
      
      expect(extractedToken).toBe(token);
    });

    it('should return null for missing header', () => {
      const extractedToken = extractTokenFromHeader(null);
      expect(extractedToken).toBeNull();
    });

    it('should return null for invalid header format', () => {
      const extractedToken = extractTokenFromHeader('InvalidFormat token');
      expect(extractedToken).toBeNull();
    });

    it('should return null for header without token', () => {
      const extractedToken = extractTokenFromHeader('Bearer ');
      expect(extractedToken).toBe('');
    });

    it('should return null for empty header', () => {
      const extractedToken = extractTokenFromHeader('');
      expect(extractedToken).toBeNull();
    });
  });

  describe('Request Token Verification', () => {
    it('should verify token from request headers', async () => {
      const token = generateAccessToken(testJWTPayload);
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      
      const payload = await verifyToken(request);
      
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testJWTPayload.userId);
    });

    it('should return null for request without authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const payload = await verifyToken(request);
      
      expect(payload).toBeNull();
    });

    it('should return null for request with invalid token', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });
      
      const payload = await verifyToken(request);
      
      expect(payload).toBeNull();
    });

    it('should return null for request with malformed authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'InvalidFormat token',
        },
      });
      
      const payload = await verifyToken(request);
      
      expect(payload).toBeNull();
    });
  });

  describe('Token Expiration Handling', () => {
    it('should handle token expiration gracefully', () => {
      // Mock jwt.verify to throw an expiration error
      const jwtVerifySpy = vi.spyOn(jwt, 'verify').mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const payload = verifyAccessToken('expired-token');
      expect(payload).toBeNull();
      
      jwtVerifySpy.mockRestore();
    });

    it('should handle malformed token gracefully', () => {
      // Mock jwt.verify to throw a malformed token error
      const jwtVerifySpy = vi.spyOn(jwt, 'verify').mockImplementation(() => {
        const error = new Error('jwt malformed');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      const payload = verifyAccessToken('malformed-token');
      expect(payload).toBeNull();
      
      jwtVerifySpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle bcrypt errors gracefully', async () => {
      // Mock bcrypt.compare to throw an error
      const bcryptCompareSpy = vi.spyOn(bcrypt, 'compare').mockRejectedValue(new Error('Bcrypt error'));
      
      await expect(verifyPassword('password', 'hash')).rejects.toThrow('Bcrypt error');
      
      bcryptCompareSpy.mockRestore();
    });

    it('should handle bcrypt hash errors gracefully', async () => {
      // Mock bcrypt.hash to throw an error
      const bcryptHashSpy = vi.spyOn(bcrypt, 'hash').mockRejectedValue(new Error('Hash error'));
      
      await expect(hashPassword('password')).rejects.toThrow('Hash error');
      
      bcryptHashSpy.mockRestore();
    });

    it('should handle JWT signing errors gracefully', () => {
      // Mock jwt.sign to throw an error
      const jwtSignSpy = vi.spyOn(jwt, 'sign').mockImplementation(() => {
        throw new Error('JWT signing error');
      });

      expect(() => generateAccessToken(testJWTPayload)).toThrow('JWT signing error');
      
      jwtSignSpy.mockRestore();
    });
  });
});