#!/bin/bash

# Batch fix 'any' type issues in API route files
# This script automates common 'any' type fixes

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"
}

# API route files to fix
API_FILES=(
    "src/app/api/campuses/route.ts"
    "src/app/api/schedules/route.ts"
    "src/app/api/matches/route.ts"
    "src/app/api/leaves/route.ts"
    "src/app/api/generate-plan/route.ts"
    "src/app/api/orders/route.ts"
    "src/app/api/checkins/route.ts"
    "src/app/api/courts/route.ts"
    "src/app/api/smart-plan/route.ts"
    "src/app/api/match-events/route.ts"
    "src/app/api/growth-reports/route.ts"
    "src/app/api/training-analysis/route.ts"
    "src/app/api/growth/route.ts"
    "src/app/api/enrollments/route.ts"
    "src/app/api/payments/route.ts"
)

# Fix import statements (add Prisma import if missing)
fix_imports() {
    local file=$1
    log "Fixing imports in $file"
    
    # Check if Prisma import exists
    if ! grep -q "import.*Prisma.*from '@prisma/client'" "$file"; then
        # Add Prisma import after the existing import
        if grep -q "import { PrismaClient } from" "$file"; then
            sed -i "s/import { PrismaClient } from/import { PrismaClient, Prisma } from/" "$file"
        elif grep -q "import prisma from" "$file"; then
            sed -i "/import prisma from/a import { Prisma } from '@prisma/client';" "$file"
        fi
        log "  Added Prisma import"
    fi
}

# Fix where clause types
fix_where_clause() {
    local file=$1
    local model_name=$2
    
    # Check if file contains 'where: any'
    if grep -q "where: any" "$file"; then
        log "  Fixing where clause in $file"
        
        # Replace 'where: any' with proper Prisma type
        # This is a simplified version - may need manual review
        sed -i "s/const where: any = {};/const where: Prisma.${model_name}WhereInput = {};/" "$file"
        sed -i "s/where: any/where: Prisma.${model_name}WhereInput/" "$file"
    fi
}

# Process API files
log "Starting batch fix of 'any' types..."

for file in "${API_FILES[@]}"; do
    if [ -f "$file" ]; then
        log "Processing $file"
        
        # Determine model name from file path
        MODEL_NAME=""
        case "$file" in
            *campuses*) MODEL_NAME="Campus" ;;
            *schedules*) MODEL_NAME="Schedule" ;;
            *matches*) MODEL_NAME="Match" ;;
            *leaves*) MODEL_NAME="Leave" ;;
            *orders*) MODEL_NAME="Order" ;;
            *checkins*) MODEL_NAME="Checkin" ;;
            *courts*) MODEL_NAME="Court" ;;
            *teams*) MODEL_NAME="Team" ;;
            *bookings*) MODEL_NAME="Booking" ;;
            *records*) MODEL_NAME="TrainingRecord" ;;
            *courses*) MODEL_NAME="Course" ;;
            *enrollments*) MODEL_NAME="Enrollment" ;;
            *payments*) MODEL_NAME="Payment" ;;
            *growth*) 
                if [[ "$file" == *"growth-reports"* ]]; then
                    MODEL_NAME="GrowthReport"
                else
                    MODEL_NAME="GrowthRecord"
                fi
                ;;
            *training-analysis*) MODEL_NAME="TrainingAnalysis" ;;
            *match-events*) MODEL_NAME="MatchEvent" ;;
            *smart-plan*) MODEL_NAME="SmartPlan" ;;
            *generate-plan*) MODEL_NAME="TrainingPlan" ;;
        esac
        
        if [ -n "$MODEL_NAME" ]; then
            fix_imports "$file"
            fix_where_clause "$file" "$MODEL_NAME"
        else
            warn "  Could not determine model name for $file"
        fi
    else
        warn "  File not found: $file"
    fi
done

log "Batch fix completed!"
log "Please review the changes and run 'npm run type-check' to verify"

# Count remaining 'any' types
log "Checking remaining 'any' types..."
ANY_COUNT=$(grep -r ": any" src/app/api --include="*.ts" | wc -l)
AS_ANY_COUNT=$(grep -r "as any" src/app/api --include="*.ts" | wc -l)

echo ""
echo "Summary:"
echo "  - ': any' occurrences: $ANY_COUNT"
echo "  - 'as any' occurrences: $AS_ANY_COUNT"
echo ""
echo "Next steps:"
echo "  1. Review the changes: git diff"
echo "  2. Run type check: npm run type-check"
echo "  3. Fix any remaining issues manually"
echo "  4. Build and test: npm run build"
