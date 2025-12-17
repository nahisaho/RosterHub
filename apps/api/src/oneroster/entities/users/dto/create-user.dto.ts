import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsObject,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * Create User DTO
 *
 * Data Transfer Object for creating a new user (POST /api/v1/users).
 * Conforms to OneRoster Japan Profile 1.2.2 specification.
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'OneRoster unique identifier (auto-generated if not provided)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourcedId?: string;

  @ApiProperty({ description: 'Is user account enabled?', example: true })
  @IsBoolean()
  @IsNotEmpty()
  enabledUser: boolean;

  @ApiProperty({
    description: 'Username for authentication',
    example: 'john.doe',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @MinLength(3)
  username: string;

  @ApiProperty({
    description: 'Array of external user IDs',
    example: ['id123', 'external456'],
  })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ description: 'Given name (first name)', example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  givenName: string;

  @ApiProperty({ description: 'Family name (last name)', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  familyName: string;

  @ApiPropertyOptional({ description: 'Middle name', example: 'Robert' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  middleName?: string;

  @ApiProperty({ enum: UserRole, description: 'User role', example: 'student' })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({
    description: 'Unique external identifier',
    example: 'student-12345',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({
    description: 'SMS phone number',
    example: '+81-90-1234-5678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sms?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+81-3-1234-5678',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
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
  @IsOptional()
  @IsObject()
  metadata?: {
    jp?: {
      kanaGivenName?: string;
      kanaFamilyName?: string;
      kanaMiddleName?: string;
      homeClass?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}
