import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IpWhitelistGuard } from './ip-whitelist.guard';

describe('IpWhitelistGuard', (): void => {
  let guard: IpWhitelistGuard;

  beforeEach(async (): Promise<void> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IpWhitelistGuard],
    }).compile();

    guard = module.get<IpWhitelistGuard>(IpWhitelistGuard);
  });

  it('should be defined', (): void => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', (): void => {
    it('should allow request when API key has no IP whitelist', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: [],
        },
        ip: '192.168.1.100',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow request when client IP matches whitelist (IPv4 exact)', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['192.168.1.100', '10.0.0.1'],
        },
        ip: '192.168.1.100',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow request when client IP is in CIDR range (IPv4)', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['192.168.1.0/24'],
        },
        ip: '192.168.1.150',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow request when client IP matches whitelist (IPv6 exact)', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['2001:db8::1', 'fe80::1'],
        },
        ip: '2001:db8::1',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow request when client IP is in CIDR range (IPv6)', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['2001:db8::/32'],
        },
        ip: '2001:db8::1234',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should extract IP from X-Forwarded-For header', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['203.0.113.50'],
        },
        ip: '10.0.0.1', // Local IP (behind proxy)
        headers: {
          'x-forwarded-for': '203.0.113.50, 192.168.1.1',
        },
      };

      const mockContext = createMockContext(mockRequest);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should extract IP from X-Real-IP header', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['203.0.113.50'],
        },
        ip: '10.0.0.1',
        headers: {
          'x-real-ip': '203.0.113.50',
        },
      };

      const mockContext = createMockContext(mockRequest);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny request when client IP not in whitelist', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['192.168.1.100'],
        },
        ip: '192.168.1.200',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Access denied: IP address not in whitelist',
      );
    });

    it('should deny request when client IP not in CIDR range', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['192.168.1.0/24'],
        },
        ip: '192.168.2.100',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should deny request when no API key found', async (): Promise<void> => {
      const mockRequest = {
        apiKey: null,
        ip: '192.168.1.100',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'API key required for IP validation',
      );
    });

    it('should deny request when client IP cannot be determined', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['192.168.1.100'],
        },
        ip: undefined,
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Unable to determine client IP address',
      );
    });

    it('should handle multiple whitelist entries correctly', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: [
            '192.168.1.0/24',
            '10.0.0.1',
            '2001:db8::/32',
            '172.16.0.100',
          ],
        },
        ip: '172.16.0.100',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should handle IPv4-mapped IPv6 addresses', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['192.168.1.100'],
        },
        ip: '::ffff:192.168.1.100',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should handle invalid IP in whitelist gracefully', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['invalid-ip', '192.168.1.100'],
        },
        ip: '192.168.1.100',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should handle invalid CIDR notation gracefully', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['192.168.1.0/invalid', '192.168.1.100'],
        },
        ip: '192.168.1.100',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);
      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny when all whitelist entries are invalid', async (): Promise<void> => {
      const mockRequest = {
        apiKey: {
          id: 'key-123',
          ipWhitelist: ['invalid-ip', '192.168.1.0/invalid'],
        },
        ip: '192.168.1.100',
        headers: {},
      };

      const mockContext = createMockContext(mockRequest);

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  /**
   * Helper function to create mock execution context
   */
  function createMockContext(
    request: Record<string, unknown>,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: jest.fn(),
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
