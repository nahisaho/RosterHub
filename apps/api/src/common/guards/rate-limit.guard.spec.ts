import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let cacheManager: any;

  beforeEach(async () => {
    // Mock cache manager
    cacheManager = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow request when under rate limit', async () => {
      const now = Date.now();
      cacheManager.get.mockResolvedValueOnce(10); // current count
      cacheManager.get.mockResolvedValueOnce(now); // window start

      const mockRequest = {
        apiKey: {
          id: 'key-123',
          rateLimit: 1000,
        },
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockContext = createMockContext(mockRequest, mockResponse);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(cacheManager.set).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        '1000',
      );
    });

    it('should allow first request in new window', async () => {
      const now = Date.now();
      cacheManager.get.mockResolvedValueOnce(null); // no current count
      cacheManager.get.mockResolvedValueOnce(null); // no window start

      const mockRequest = {
        apiKey: {
          id: 'key-123',
          rateLimit: 1000,
        },
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockContext = createMockContext(mockRequest, mockResponse);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(cacheManager.set).toHaveBeenCalledTimes(2); // count and timestamp
    });

    it('should deny request when rate limit exceeded', async () => {
      const now = Date.now();
      cacheManager.get.mockResolvedValueOnce(1000); // current count at limit
      cacheManager.get.mockResolvedValueOnce(now); // window start

      const mockRequest = {
        apiKey: {
          id: 'key-123',
          rateLimit: 1000,
        },
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockContext = createMockContext(mockRequest, mockResponse);

      try {
        await guard.canActivate(mockContext);
        // If we get here, the test should fail
        expect(true).toBe(false); // Force failure
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(error.getResponse()).toMatchObject({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
        });
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Retry-After',
          expect.any(Number),
        );
      }
    });

    it('should use default rate limit when not specified in API key', async () => {
      const now = Date.now();
      cacheManager.get.mockResolvedValueOnce(null);
      cacheManager.get.mockResolvedValueOnce(null);

      const mockRequest = {
        apiKey: {
          id: 'key-123',
          // No rateLimit specified
        },
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockContext = createMockContext(mockRequest, mockResponse);
      await guard.canActivate(mockContext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        '1000', // Default limit
      );
    });

    it('should reset count in new window', async () => {
      const now = Date.now();
      const oldWindowStart = now - (60 * 60 * 1000 + 1000); // More than 1 hour ago

      cacheManager.get.mockResolvedValueOnce(500); // old count
      cacheManager.get.mockResolvedValueOnce(oldWindowStart); // old window

      const mockRequest = {
        apiKey: {
          id: 'key-123',
          rateLimit: 1000,
        },
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockContext = createMockContext(mockRequest, mockResponse);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      // Should reset to 1 for new window
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('count'),
        1,
        expect.any(Number),
      );
    });

    it('should throw error when no API key found', async () => {
      const mockRequest = {
        apiKey: null,
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockContext = createMockContext(mockRequest, mockResponse);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        HttpException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toMatchObject({
        message: 'API key required for rate limiting',
      });
    });

    it('should add rate limit headers with remaining count', async () => {
      const now = Date.now();
      cacheManager.get.mockResolvedValueOnce(250); // current count
      cacheManager.get.mockResolvedValueOnce(now); // window start

      const mockRequest = {
        apiKey: {
          id: 'key-123',
          rateLimit: 1000,
        },
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockContext = createMockContext(mockRequest, mockResponse);
      await guard.canActivate(mockContext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Limit',
        '1000',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        '749', // 1000 - 251 (current count after increment)
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(String),
      );
    });

    it('should handle cache errors gracefully (fail open)', async () => {
      cacheManager.get.mockRejectedValue(new Error('Redis connection failed'));

      const mockRequest = {
        apiKey: {
          id: 'key-123',
          rateLimit: 1000,
        },
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockContext = createMockContext(mockRequest, mockResponse);
      const result = await guard.canActivate(mockContext);

      // Should fail open (allow request) when cache is unavailable
      expect(result).toBe(true);
    });

    it('should set correct remaining count to 0 when limit exceeded', async () => {
      const now = Date.now();
      cacheManager.get.mockResolvedValueOnce(1000); // at limit
      cacheManager.get.mockResolvedValueOnce(now);

      const mockRequest = {
        apiKey: {
          id: 'key-123',
          rateLimit: 1000,
        },
      };

      const mockResponse = {
        setHeader: jest.fn(),
      };

      const mockContext = createMockContext(mockRequest, mockResponse);

      try {
        await guard.canActivate(mockContext);
      } catch (error) {
        // Expected error
      }

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        '0',
      );
    });
  });

  /**
   * Helper function to create mock execution context
   */
  function createMockContext(request: any, response?: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response || { setHeader: jest.fn() },
        getNext: jest.fn(),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as ExecutionContext;
  }
});
