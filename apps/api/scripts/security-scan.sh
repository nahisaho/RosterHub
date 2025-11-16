#!/bin/bash

###############################################################################
# RosterHub API Security Scan Script
#
# This script runs automated security scans on the RosterHub API:
# 1. npm audit (dependency vulnerabilities)
# 2. Trivy (Docker image scanning)
# 3. ESLint security plugin (SAST)
# 4. Git secrets scanning
# 5. Environment variable validation
#
# Usage:
#   ./scripts/security-scan.sh [--fix] [--verbose]
#
# Options:
#   --fix      Attempt to auto-fix vulnerabilities
#   --verbose  Show detailed output
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Flags
FIX_MODE=false
VERBOSE=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --fix)
      FIX_MODE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
  esac
done

# Function to print colored output
print_header() {
  echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Start security scan
echo -e "${BLUE}"
cat << "EOF"
 ____            _            _   _       _
|  _ \ ___  ___| |_ ___ _ __| | | |_   _| |__
| |_) / _ \/ __| __/ _ \ '__| |_| | | | | '_ \
|  _ < (_) \__ \ ||  __/ |  |  _  | |_| | |_) |
|_| \_\___/|___/\__\___|_|  |_| |_|\__,_|_.__/

   Security Scan v1.0.0
EOF
echo -e "${NC}"

echo "Scan started at: $(date)"
echo "Working directory: $(pwd)"
echo ""

# Track overall status
SCAN_FAILED=false

###############################################################################
# 1. npm audit (Dependency Vulnerabilities)
###############################################################################

print_header "1. NPM Dependency Audit"

if command -v npm >/dev/null 2>&1; then
  if [ "$FIX_MODE" = true ]; then
    print_warning "Running npm audit with auto-fix..."
    if npm audit fix; then
      print_success "npm audit fix completed"
    else
      print_warning "Some vulnerabilities could not be auto-fixed"
    fi
  fi

  echo "Running npm audit..."
  if npm audit --audit-level=moderate; then
    print_success "No moderate or higher vulnerabilities found"
  else
    print_error "Vulnerabilities detected! Review output above."
    SCAN_FAILED=true
  fi

  # Check production dependencies only
  echo ""
  echo "Checking production dependencies only..."
  if npm audit --production --audit-level=high; then
    print_success "No high or critical vulnerabilities in production dependencies"
  else
    print_error "High or critical vulnerabilities in production dependencies!"
    SCAN_FAILED=true
  fi

  # Generate audit report
  if [ "$VERBOSE" = true ]; then
    echo ""
    echo "Generating detailed audit report..."
    npm audit --json > npm-audit-report.json
    print_success "Detailed report saved to npm-audit-report.json"
  fi
else
  print_error "npm not found. Skipping dependency audit."
fi

###############################################################################
# 2. Trivy (Docker Image Scanning)
###############################################################################

print_header "2. Docker Image Security Scan (Trivy)"

if command -v trivy >/dev/null 2>&1; then
  # Check if Docker image exists
  if docker images | grep -q "rosterhub/api"; then
    echo "Scanning Docker image: rosterhub/api:latest"

    if trivy image --severity HIGH,CRITICAL --exit-code 1 rosterhub/api:latest; then
      print_success "No HIGH or CRITICAL vulnerabilities in Docker image"
    else
      print_error "HIGH or CRITICAL vulnerabilities found in Docker image!"
      SCAN_FAILED=true
    fi

    if [ "$VERBOSE" = true ]; then
      echo ""
      echo "Generating detailed Trivy report..."
      trivy image --format json --output trivy-report.json rosterhub/api:latest
      print_success "Detailed report saved to trivy-report.json"
    fi
  else
    print_warning "Docker image 'rosterhub/api:latest' not found. Build image first:"
    echo "  docker-compose build api"
  fi
else
  print_warning "Trivy not installed. Install with:"
  echo "  brew install aquasecurity/trivy/trivy   # macOS"
  echo "  wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -"
  echo "  echo 'deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main' | sudo tee -a /etc/apt/sources.list.d/trivy.list"
  echo "  sudo apt-get update && sudo apt-get install trivy   # Ubuntu/Debian"
fi

###############################################################################
# 3. ESLint Security Plugin (SAST)
###############################################################################

print_header "3. Static Code Analysis (ESLint Security)"

if [ -f "node_modules/.bin/eslint" ]; then
  echo "Running ESLint security checks..."

  if [ "$FIX_MODE" = true ]; then
    if ./node_modules/.bin/eslint "{src,apps,libs,test}/**/*.ts" --fix; then
      print_success "ESLint security checks passed (with fixes applied)"
    else
      print_error "ESLint security issues detected (after auto-fix)"
      SCAN_FAILED=true
    fi
  else
    if ./node_modules/.bin/eslint "{src,apps,libs,test}/**/*.ts"; then
      print_success "ESLint security checks passed"
    else
      print_error "ESLint security issues detected"
      SCAN_FAILED=true
    fi
  fi
else
  print_warning "ESLint not found. Run: npm install"
fi

###############################################################################
# 4. Git Secrets Scanning
###############################################################################

print_header "4. Git Secrets Detection"

# Check for committed secrets
echo "Scanning for committed secrets..."

# Check for .env files
if git ls-files | grep -q ".env$"; then
  print_error ".env file is committed to git! This exposes secrets."
  echo "  Fix: Add .env to .gitignore and remove from git:"
  echo "    git rm --cached .env"
  echo "    echo '.env' >> .gitignore"
  SCAN_FAILED=true
else
  print_success ".env files are not committed (good!)"
fi

# Check for hardcoded secrets in code
echo "Checking for hardcoded secrets in source code..."

SECRET_PATTERNS=(
  "password\s*=\s*['\"][^'\"]+['\"]"
  "api[_-]?key\s*=\s*['\"][^'\"]+['\"]"
  "secret\s*=\s*['\"][^'\"]+['\"]"
  "token\s*=\s*['\"][^'\"]+['\"]"
  "BEGIN RSA PRIVATE KEY"
  "BEGIN OPENSSH PRIVATE KEY"
)

SECRETS_FOUND=false

for pattern in "${SECRET_PATTERNS[@]}"; do
  if grep -r -i -E "$pattern" src/ --exclude-dir=node_modules 2>/dev/null | grep -v -E "(example|test|mock|TODO|placeholder)"; then
    SECRETS_FOUND=true
  fi
done

if [ "$SECRETS_FOUND" = true ]; then
  print_error "Potential hardcoded secrets found in source code!"
  echo "  Review matches above and replace with environment variables."
  SCAN_FAILED=true
else
  print_success "No hardcoded secrets detected"
fi

# Check for git-secrets tool
if command -v git-secrets >/dev/null 2>&1; then
  echo "Running git-secrets scan..."
  if git secrets --scan; then
    print_success "git-secrets scan passed"
  else
    print_error "git-secrets detected potential secrets!"
    SCAN_FAILED=true
  fi
else
  print_warning "git-secrets not installed. Install with:"
  echo "  brew install git-secrets   # macOS"
  echo "  git clone https://github.com/awslabs/git-secrets.git && cd git-secrets && make install   # Linux"
fi

###############################################################################
# 5. Environment Variable Validation
###############################################################################

print_header "5. Environment Configuration Validation"

if [ -f ".env" ]; then
  echo "Checking .env configuration..."

  # Required variables
  REQUIRED_VARS=(
    "DATABASE_URL"
    "REDIS_HOST"
    "REDIS_PORT"
    "JWT_SECRET"
    "NODE_ENV"
  )

  MISSING_VARS=()

  for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env; then
      MISSING_VARS+=("$var")
    fi
  done

  if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    print_success "All required environment variables are defined"
  else
    print_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
      echo "  - $var"
    done
    SCAN_FAILED=true
  fi

  # Check for weak secrets
  echo "Checking for weak secrets..."

  if grep -q "JWT_SECRET=.*changeme" .env || grep -q "JWT_SECRET=.*secret" .env || grep -q "JWT_SECRET=.*password" .env; then
    print_error "JWT_SECRET appears to be a weak default value!"
    echo "  Generate a strong secret: openssl rand -base64 32"
    SCAN_FAILED=true
  else
    print_success "JWT_SECRET does not match common weak patterns"
  fi

  # Check NODE_ENV
  if grep -q "NODE_ENV=production" .env; then
    print_success "NODE_ENV is set to production"
  else
    print_warning "NODE_ENV is not set to 'production'"
  fi

else
  print_error ".env file not found!"
  echo "  Copy .env.example to .env and configure your environment"
  SCAN_FAILED=true
fi

###############################################################################
# 6. Security Headers Check (if app is running)
###############################################################################

print_header "6. Security Headers Validation"

if curl -s http://localhost:3000/health >/dev/null 2>&1; then
  echo "API is running. Checking security headers..."

  # Test for security headers
  RESPONSE_HEADERS=$(curl -s -I http://localhost:3000/health)

  SECURITY_HEADERS=(
    "X-Content-Type-Options"
    "X-Frame-Options"
    "Strict-Transport-Security"
    "X-XSS-Protection"
  )

  MISSING_HEADERS=()

  for header in "${SECURITY_HEADERS[@]}"; do
    if ! echo "$RESPONSE_HEADERS" | grep -q "$header"; then
      MISSING_HEADERS+=("$header")
    fi
  done

  if [ ${#MISSING_HEADERS[@]} -eq 0 ]; then
    print_success "All recommended security headers are present"
  else
    print_warning "Missing security headers (consider adding helmet.js):"
    for header in "${MISSING_HEADERS[@]}"; do
      echo "  - $header"
    done
  fi

else
  print_warning "API is not running. Start with: npm run start:dev"
  echo "  Skipping security headers check."
fi

###############################################################################
# 7. SSL/TLS Configuration (Production)
###############################################################################

print_header "7. SSL/TLS Configuration"

if [ -f "docker-compose.yml" ]; then
  # Check if HTTPS is configured
  if grep -q "443:443" docker-compose.yml; then
    print_success "HTTPS port (443) is configured in docker-compose.yml"
  else
    print_warning "HTTPS port (443) not found in docker-compose.yml"
    echo "  Configure SSL/TLS for production deployment"
  fi

  # Check for SSL certificate paths
  if grep -q "ssl_certificate" docker-compose.yml || grep -q "SSL_CERT" docker-compose.yml; then
    print_success "SSL certificate configuration found"
  else
    print_warning "No SSL certificate configuration found"
    echo "  Add SSL certificates for production (see docs/deployment/)"
  fi
else
  print_warning "docker-compose.yml not found"
fi

###############################################################################
# Summary
###############################################################################

print_header "Security Scan Summary"

echo "Scan completed at: $(date)"
echo ""

if [ "$SCAN_FAILED" = true ]; then
  print_error "SECURITY SCAN FAILED"
  echo ""
  echo "Action required:"
  echo "  1. Review errors and warnings above"
  echo "  2. Fix critical vulnerabilities immediately"
  echo "  3. Run scan again with: ./scripts/security-scan.sh"
  echo "  4. See docs/security/security-audit-checklist.md for details"
  echo ""
  exit 1
else
  print_success "SECURITY SCAN PASSED"
  echo ""
  echo "Your RosterHub API passed all security checks!"
  echo ""
  echo "Recommended actions:"
  echo "  - Review warnings above (if any)"
  echo "  - Run this scan weekly: ./scripts/security-scan.sh"
  echo "  - Keep dependencies updated: npm update"
  echo "  - Review security audit checklist: docs/security/security-audit-checklist.md"
  echo ""
  exit 0
fi
