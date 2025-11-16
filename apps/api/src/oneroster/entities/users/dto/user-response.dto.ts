import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User, UserRole, StatusType } from '@prisma/client';

/**
 * User Response DTO
 *
 * OneRoster Japan Profile 1.2.2 compliant user response format.
 * Transforms Prisma User entity to OneRoster JSON format.
 */
export class UserResponseDto {
  @ApiProperty({ description: 'OneRoster unique identifier', example: 'user-abc123' })
  sourcedId: string;

  @ApiProperty({ description: 'Record creation timestamp' })
  dateCreated: string;

  @ApiProperty({ description: 'Last modification timestamp' })
  dateLastModified: string;

  @ApiProperty({ enum: StatusType, description: 'Record status' })
  status: StatusType;

  @ApiProperty({ description: 'Is user account enabled?', example: true })
  enabledUser: boolean;

  @ApiProperty({ description: 'Username for authentication', example: 'john.doe' })
  username: string;

  @ApiProperty({ description: 'Array of external user IDs', example: ['id123'] })
  userIds: string[];

  @ApiProperty({ description: 'Given name (first name)', example: 'John' })
  givenName: string;

  @ApiProperty({ description: 'Family name (last name)', example: 'Doe' })
  familyName: string;

  @ApiPropertyOptional({ description: 'Middle name', example: 'Robert' })
  middleName?: string;

  @ApiProperty({ enum: UserRole, description: 'User role', example: 'student' })
  role: UserRole;

  @ApiProperty({ description: 'Unique external identifier', example: 'student-12345' })
  identifier: string;

  @ApiProperty({ description: 'Email address', example: 'john.doe@example.com' })
  email: string;

  @ApiPropertyOptional({ description: 'SMS phone number' })
  sms?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Japan Profile extensions (metadata.jp.*)',
    example: {
      jp: {
        kanaGivenName: 'タロウ',
        kanaFamilyName: 'ヤマダ',
        homeClass: 'class-123',
      },
    },
  })
  metadata?: {
    jp?: {
      kanaGivenName?: string;
      kanaFamilyName?: string;
      kanaMiddleName?: string;
      homeClass?: string;
    };
  };

  constructor(user: User) {
    this.sourcedId = user.sourcedId;
    this.dateCreated = user.dateCreated.toISOString();
    this.dateLastModified = user.dateLastModified.toISOString();
    this.status = user.status;
    this.enabledUser = user.enabledUser;
    this.username = user.username;
    this.userIds = user.userIds;
    this.givenName = user.givenName;
    this.familyName = user.familyName;
    this.middleName = user.middleName || undefined;
    this.role = user.role;
    this.identifier = user.identifier;
    this.email = user.email;
    this.sms = user.sms || undefined;
    this.phone = user.phone || undefined;
    this.metadata = user.metadata as any || undefined;
  }
}
