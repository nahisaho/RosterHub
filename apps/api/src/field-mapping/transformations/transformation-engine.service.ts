/**
 * Transformation Engine Service
 *
 * Applies field transformation rules to CSV data
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MappingTransformationType } from '../dto/create-field-mapping-config.dto';
import * as vm from 'vm';

export interface TransformationContext {
  row: Record<string, any>;
  rowNumber: number;
  lookupTables?: Map<string, Map<string, string>>;
}

@Injectable()
export class TransformationEngineService {
  private readonly logger = new Logger(TransformationEngineService.name);

  /**
   * Apply transformation to a single field
   */
  transform(
    sourceFields: string[],
    transformationType: MappingTransformationType,
    transformConfig: any,
    context: TransformationContext,
    defaultValue?: string,
  ): any {
    try {
      // Get source values
      const sourceValues = sourceFields.map((field) => context.row[field]);

      // Apply transformation based on type
      let result: any;

      switch (transformationType) {
        case MappingTransformationType.DIRECT:
          result = this.transformDirect(sourceValues[0]);
          break;

        case MappingTransformationType.CONSTANT:
          result = this.transformConstant(transformConfig);
          break;

        case MappingTransformationType.CONCATENATE:
          result = this.transformConcatenate(sourceValues, transformConfig);
          break;

        case MappingTransformationType.SPLIT:
          result = this.transformSplit(sourceValues[0], transformConfig);
          break;

        case MappingTransformationType.LOOKUP:
          result = this.transformLookup(sourceValues[0], transformConfig, context);
          break;

        case MappingTransformationType.SCRIPT:
          result = this.transformScript(sourceValues, transformConfig, context);
          break;

        case MappingTransformationType.DATE_FORMAT:
          result = this.transformDateFormat(sourceValues[0], transformConfig);
          break;

        case MappingTransformationType.TRIM:
          result = this.transformTrim(sourceValues[0]);
          break;

        case MappingTransformationType.LOWERCASE:
          result = this.transformLowercase(sourceValues[0]);
          break;

        case MappingTransformationType.UPPERCASE:
          result = this.transformUppercase(sourceValues[0]);
          break;

        case MappingTransformationType.SUBSTRING:
          result = this.transformSubstring(sourceValues[0], transformConfig);
          break;

        case MappingTransformationType.REPLACE:
          result = this.transformReplace(sourceValues[0], transformConfig);
          break;

        case MappingTransformationType.DEFAULT:
          result = this.transformDefault(sourceValues[0], transformConfig);
          break;

        default:
          throw new Error(`Unknown transformation type: ${transformationType}`);
      }

      // Apply default value if result is null/undefined/empty
      if (result == null || result === '') {
        result = defaultValue;
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Transformation error at row ${context.rowNumber}: ${error.message}`,
      );
      throw new BadRequestException(
        `Transformation failed at row ${context.rowNumber}: ${error.message}`,
      );
    }
  }

  /**
   * Direct copy (no transformation)
   */
  private transformDirect(value: any): any {
    return value;
  }

  /**
   * Constant value
   * Config: { value: string }
   */
  private transformConstant(config: any): any {
    return config?.value;
  }

  /**
   * Concatenate multiple fields
   * Config: { separator: string, trim?: boolean }
   */
  private transformConcatenate(values: any[], config: any): string {
    const separator = config?.separator ?? '';
    const trim = config?.trim ?? true;

    const filtered = values.filter((v) => v != null && v !== '');
    const concatenated = filtered.join(separator);

    return trim ? concatenated.trim() : concatenated;
  }

  /**
   * Split field by delimiter
   * Config: { delimiter: string, index: number }
   */
  private transformSplit(value: any, config: any): string {
    if (!value) return '';

    const delimiter = config?.delimiter ?? ',';
    const index = config?.index ?? 0;

    const parts = String(value).split(delimiter);

    return parts[index]?.trim() ?? '';
  }

  /**
   * Lookup value from mapping table
   * Config: { tableName: string, defaultValue?: string }
   */
  private transformLookup(
    value: any,
    config: any,
    context: TransformationContext,
  ): string {
    if (!value) return config?.defaultValue ?? '';

    const tableName = config?.tableName;
    if (!tableName) {
      throw new Error('Lookup table name not specified in config');
    }

    const lookupTable = context.lookupTables?.get(tableName);
    if (!lookupTable) {
      throw new Error(`Lookup table not found: ${tableName}`);
    }

    const result = lookupTable.get(String(value));
    return result ?? config?.defaultValue ?? value;
  }

  /**
   * Execute custom JavaScript expression
   * Config: { expression: string }
   *
   * Available variables:
   * - value: First source field value
   * - values: All source field values
   * - row: Complete row object
   * - rowNumber: Current row number
   */
  private transformScript(
    values: any[],
    config: any,
    context: TransformationContext,
  ): any {
    const expression = config?.expression;
    if (!expression) {
      throw new Error('Script expression not specified in config');
    }

    // Create safe sandbox context
    const sandbox = {
      value: values[0],
      values,
      row: context.row,
      rowNumber: context.rowNumber,
      // Utility functions
      trim: (str: string) => str?.trim(),
      lowercase: (str: string) => str?.toLowerCase(),
      uppercase: (str: string) => str?.toUpperCase(),
      substring: (str: string, start: number, end?: number) => str?.substring(start, end),
      replace: (str: string, search: string, replace: string) =>
        str?.replace(new RegExp(search, 'g'), replace),
      split: (str: string, delimiter: string) => str?.split(delimiter),
      join: (arr: any[], separator: string) => arr?.join(separator),
    };

    try {
      // Execute expression in sandbox
      const script = new vm.Script(`(${expression})`);
      const vmContext = vm.createContext(sandbox);
      return script.runInContext(vmContext, { timeout: 1000 }); // 1 second timeout
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`);
    }
  }

  /**
   * Date format conversion
   * Config: { inputFormat?: string, outputFormat: string }
   */
  private transformDateFormat(value: any, config: any): string {
    if (!value) return '';

    const outputFormat = config?.outputFormat ?? 'YYYY-MM-DD';

    try {
      // Parse date (simple ISO format support for now)
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${value}`);
      }

      // Format based on outputFormat (simple implementation)
      switch (outputFormat) {
        case 'YYYY-MM-DD':
          return date.toISOString().split('T')[0];
        case 'YYYY/MM/DD':
          return date.toISOString().split('T')[0].replace(/-/g, '/');
        case 'DD/MM/YYYY':
          const [year, month, day] = date.toISOString().split('T')[0].split('-');
          return `${day}/${month}/${year}`;
        case 'ISO':
          return date.toISOString();
        default:
          return date.toISOString().split('T')[0];
      }
    } catch (error) {
      throw new Error(`Date format conversion failed: ${error.message}`);
    }
  }

  /**
   * Trim whitespace
   */
  private transformTrim(value: any): string {
    return value ? String(value).trim() : '';
  }

  /**
   * Convert to lowercase
   */
  private transformLowercase(value: any): string {
    return value ? String(value).toLowerCase() : '';
  }

  /**
   * Convert to uppercase
   */
  private transformUppercase(value: any): string {
    return value ? String(value).toUpperCase() : '';
  }

  /**
   * Extract substring
   * Config: { start: number, end?: number }
   */
  private transformSubstring(value: any, config: any): string {
    if (!value) return '';

    const start = config?.start ?? 0;
    const end = config?.end;

    return String(value).substring(start, end);
  }

  /**
   * Find and replace
   * Config: { find: string, replace: string, regex?: boolean }
   */
  private transformReplace(value: any, config: any): string {
    if (!value) return '';

    const find = config?.find;
    const replace = config?.replace ?? '';
    const useRegex = config?.regex ?? false;

    if (!find) return String(value);

    if (useRegex) {
      return String(value).replace(new RegExp(find, 'g'), replace);
    } else {
      return String(value).split(find).join(replace);
    }
  }

  /**
   * Use default value if source is empty
   * Config: { defaultValue: string }
   */
  private transformDefault(value: any, config: any): any {
    if (value == null || value === '') {
      return config?.defaultValue;
    }
    return value;
  }
}
