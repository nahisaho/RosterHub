import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsArray,
  IsObject,
  MaxLength,
} from 'class-validator';
import { UserRole, StatusType } from '@prisma/client';

/**
 * Update User DTO
 *
 * OneRoster Japan Profile 1.2.2 compliant user update request.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Is user account enabled?',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabledUser?: boolean;

  @ApiPropertyOptional({
    description: 'Username for authentication',
    example: 'john.doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  username?: string;

  @ApiPropertyOptional({
    description: 'Array of external user IDs',
    example: ['id123', 'external456'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    description: 'Given name (first name)',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  givenName?: string;

  @ApiPropertyOptional({
    description: 'Family name (last name)',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  familyName?: string;

  @ApiPropertyOptional({ description: 'Middle name', example: 'Robert' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  middleName?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'User role',
    example: 'student',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Unique external identifier',
    example: 'student-12345',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  identifier?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

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
    description: 'Grades taught/enrolled',
    example: ['1', '2', '3'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grades?: string[];

  @ApiPropertyOptional({ enum: StatusType, description: 'Record status' })
  @IsOptional()
  @IsEnum(StatusType)
  status?: StatusType;

  @ApiPropertyOptional({
    description: 'Japan Profile metadata',
    example: { jp: { givenNameKana: 'タロウ', familyNameKana: 'ヤマダ' } },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    jp?: {
      givenNameKana?: string;
      familyNameKana?: string;
      studentNumber?: string;
      [key: string]: any;
    };
  };
}
