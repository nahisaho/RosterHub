import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

/**
 * Sort Order Enum
 *
 * OneRoster v1.2 supports ascending (asc) and descending (desc) sorting.
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Sorting DTO
 *
 * Implements OneRoster v1.2 sorting pattern:
 * - sort: Field name to sort by
 * - orderBy: Sort order (asc or desc)
 *
 * Examples:
 * - GET /users?sort=familyName&orderBy=asc
 * - GET /classes?sort=dateLastModified&orderBy=desc
 *
 * Requirements Coverage:
 * - REQ-API-021~025: Sorting implementation
 *
 * @dto
 */
export class SortingDto {
  /**
   * Field name to sort by
   *
   * Examples: familyName, dateLastModified, status
   */
  @ApiProperty({
    description: 'Field name to sort by',
    type: String,
    required: false,
    example: 'familyName',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  /**
   * Sort order (ascending or descending)
   *
   * Default: asc (ascending)
   */
  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    required: false,
    default: SortOrder.ASC,
    example: SortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  orderBy?: SortOrder = SortOrder.ASC;
}

/**
 * Combined Query Parameters DTO
 *
 * Combines pagination, sorting, and filtering for REST API endpoints.
 */
export class QueryParamsDto extends SortingDto {
  /**
   * Maximum number of records to return
   */
  @ApiProperty({
    description: 'Maximum number of records to return',
    type: Number,
    required: false,
    default: 100,
    minimum: 1,
    maximum: 1000,
    example: 100,
  })
  @IsOptional()
  @IsString()
  limit?: string = '100';

  /**
   * Number of records to skip
   */
  @ApiProperty({
    description: 'Number of records to skip',
    type: Number,
    required: false,
    default: 0,
    minimum: 0,
    example: 0,
  })
  @IsOptional()
  @IsString()
  offset?: string = '0';

  /**
   * Filter expression (OneRoster filter syntax)
   *
   * Examples:
   * - givenName='John'
   * - status='active' AND role='student'
   * - score>=90
   */
  @ApiProperty({
    description: 'Filter expression (OneRoster syntax)',
    type: String,
    required: false,
    example: "status='active'",
  })
  @IsOptional()
  @IsString()
  filter?: string;

  /**
   * Field selection (comma-separated list)
   *
   * Examples:
   * - sourcedId,givenName,familyName
   * - sourcedId,status,dateLastModified
   */
  @ApiProperty({
    description: 'Comma-separated list of fields to return',
    type: String,
    required: false,
    example: 'sourcedId,givenName,familyName,email',
  })
  @IsOptional()
  @IsString()
  fields?: string;
}
