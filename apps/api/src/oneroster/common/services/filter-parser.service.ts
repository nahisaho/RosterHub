import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * OneRoster Filter Parser Service
 *
 * Parses OneRoster v1.2 filter query expressions and converts them to Prisma query filters.
 *
 * Supported Filter Syntax (OneRoster v1.2 specification):
 * - Equality: field='value' or field="value"
 * - Inequality: field!='value'
 * - Comparison: field>value, field>=value, field<value, field<=value
 * - Contains: field~'value' (for arrays/lists)
 * - Logical AND: filter1 AND filter2
 * - Logical OR: filter1 OR filter2
 *
 * Examples:
 * - givenName='John'
 * - status='active' AND role='student'
 * - score>=90
 * - termSourcedIds~'term-123'
 * - dateLastModified>='2025-01-01'
 *
 * Requirements Coverage:
 * - FR-API-016~020: Filter implementation for REST API
 *
 * @service
 */
@Injectable()
export class FilterParserService {
  /**
   * Parses OneRoster filter expression and converts to Prisma where clause
   *
   * @param filter - OneRoster filter expression
   * @param allowedFields - List of fields that can be filtered (for security)
   * @returns Prisma where clause object
   * @throws BadRequestException if filter syntax is invalid
   */
  parseFilter(filter: string, allowedFields?: string[]): any {
    if (!filter || filter.trim() === '') {
      return {};
    }

    try {
      // Parse the filter expression
      const ast = this.parseExpression(filter);

      // Convert AST to Prisma where clause
      return this.astToPrismaWhere(ast, allowedFields);
    } catch (error) {
      throw new BadRequestException(
        `Invalid filter expression: ${filter}. Error: ${error.message}`,
      );
    }
  }

  /**
   * Parses filter expression into Abstract Syntax Tree (AST)
   *
   * @param expression - Filter expression string
   * @returns AST node
   */
  private parseExpression(expression: string): FilterNode {
    // Remove leading/trailing whitespace
    expression = expression.trim();

    // Check for logical operators (AND, OR)
    const andMatch = this.splitByLogicalOperator(expression, 'AND');
    if (andMatch) {
      return {
        type: 'AND',
        left: this.parseExpression(andMatch.left),
        right: this.parseExpression(andMatch.right),
      };
    }

    const orMatch = this.splitByLogicalOperator(expression, 'OR');
    if (orMatch) {
      return {
        type: 'OR',
        left: this.parseExpression(orMatch.left),
        right: this.parseExpression(orMatch.right),
      };
    }

    // Parse comparison expression (e.g., field='value', field>=10)
    return this.parseComparison(expression);
  }

  /**
   * Splits expression by logical operator (AND/OR) at the top level
   *
   * Handles nested parentheses and quoted strings.
   *
   * @param expression - Filter expression
   * @param operator - Logical operator (AND or OR)
   * @returns Left and right parts if operator found, null otherwise
   */
  private splitByLogicalOperator(
    expression: string,
    operator: 'AND' | 'OR',
  ): { left: string; right: string } | null {
    const operatorPattern = new RegExp(`\\s+${operator}\\s+`, 'i');
    let depth = 0;
    let inQuote = false;
    let quoteChar = '';

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];

      // Track quote state
      if ((char === "'" || char === '"') && (i === 0 || expression[i - 1] !== '\\')) {
        if (!inQuote) {
          inQuote = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuote = false;
          quoteChar = '';
        }
      }

      // Skip if inside quotes
      if (inQuote) continue;

      // Track parentheses depth
      if (char === '(') depth++;
      if (char === ')') depth--;

      // Check for operator at top level (depth 0)
      if (depth === 0) {
        const remaining = expression.substring(i);
        const match = remaining.match(operatorPattern);
        if (match && match.index === 0) {
          return {
            left: expression.substring(0, i).trim(),
            right: expression.substring(i + match[0].length).trim(),
          };
        }
      }
    }

    return null;
  }

  /**
   * Parses comparison expression (e.g., field='value', field>=10)
   *
   * @param expression - Comparison expression
   * @returns Comparison AST node
   */
  private parseComparison(expression: string): ComparisonNode | FilterNode {
    expression = expression.trim();

    // Remove parentheses if present and recursively parse
    if (expression.startsWith('(') && expression.endsWith(')')) {
      const inner = expression.substring(1, expression.length - 1).trim();
      // Recursively parse the inner expression (might be logical or comparison)
      return this.parseExpression(inner);
    }

    // Match operators: !=, >=, <=, =, >, <, ~
    const operatorRegex = /(!=|>=|<=|=|>|<|~)/;
    const match = expression.match(operatorRegex);

    if (!match) {
      throw new Error(`Invalid comparison expression: ${expression}`);
    }

    const operator = match[1];
    const parts = expression.split(operator);

    if (parts.length !== 2) {
      throw new Error(`Invalid comparison expression: ${expression}`);
    }

    const field = parts[0].trim();
    let value = parts[1].trim();

    // Validate field and value are not empty
    if (!field) {
      throw new Error(`Missing field name in expression: ${expression}`);
    }
    if (!value) {
      throw new Error(`Missing value for field '${field}' in expression: ${expression}`);
    }

    // Remove quotes from value
    if ((value.startsWith("'") && value.endsWith("'")) ||
        (value.startsWith('"') && value.endsWith('"'))) {
      value = value.substring(1, value.length - 1);
    }

    return {
      type: 'COMPARISON',
      field,
      operator: operator as ComparisonOperator,
      value,
    };
  }

  /**
   * Converts AST to Prisma where clause
   *
   * @param node - AST node
   * @param allowedFields - Allowed field names for filtering
   * @returns Prisma where clause
   */
  private astToPrismaWhere(node: FilterNode, allowedFields?: string[]): any {
    if (node.type === 'AND') {
      const left = this.astToPrismaWhere(node.left, allowedFields);
      const right = this.astToPrismaWhere(node.right, allowedFields);
      return { AND: [left, right] };
    }

    if (node.type === 'OR') {
      const left = this.astToPrismaWhere(node.left, allowedFields);
      const right = this.astToPrismaWhere(node.right, allowedFields);
      return { OR: [left, right] };
    }

    if (node.type === 'COMPARISON') {
      // Validate field name if allowedFields is provided
      if (allowedFields && !allowedFields.includes(node.field)) {
        throw new BadRequestException(
          `Field '${node.field}' is not allowed for filtering. Allowed fields: ${allowedFields.join(', ')}`,
        );
      }

      return this.comparisonToPrisma(node.field, node.operator, node.value);
    }

    throw new Error(`Unknown AST node type: ${(node as any).type}`);
  }

  /**
   * Converts comparison to Prisma filter condition
   *
   * @param field - Field name
   * @param operator - Comparison operator
   * @param value - Value to compare
   * @returns Prisma filter condition
   */
  private comparisonToPrisma(field: string, operator: ComparisonOperator, value: string): any {
    // Type conversion
    const convertedValue = this.convertValue(value);

    switch (operator) {
      case '=':
        // Prisma equality can be { field: value } or { field: { equals: value } }
        // Simple form is more efficient
        return { [field]: convertedValue };
      case '!=':
        return { [field]: { not: convertedValue } };
      case '>':
        return { [field]: { gt: convertedValue } };
      case '>=':
        return { [field]: { gte: convertedValue } };
      case '<':
        return { [field]: { lt: convertedValue } };
      case '<=':
        return { [field]: { lte: convertedValue } };
      case '~':
        // Contains operator for strings
        // For strings (e.g., title~'Section A'), use contains with case-insensitive mode
        return { [field]: { contains: convertedValue, mode: 'insensitive' } };
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  /**
   * Converts string value to appropriate type
   *
   * @param value - String value
   * @returns Converted value (string, number, boolean, or Date)
   */
  private convertValue(value: string): string | number | boolean | Date {
    // Boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }

    // ISO 8601 Date
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(value)) {
      return new Date(value);
    }

    // String (default)
    return value;
  }
}

/**
 * Filter AST Node Types
 */
type FilterNode = LogicalNode | ComparisonNode;

interface LogicalNode {
  type: 'AND' | 'OR';
  left: FilterNode;
  right: FilterNode;
}

interface ComparisonNode {
  type: 'COMPARISON';
  field: string;
  operator: ComparisonOperator;
  value: string;
}

type ComparisonOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | '~';
