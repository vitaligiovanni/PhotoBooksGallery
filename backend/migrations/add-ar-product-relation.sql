-- Migration: Add product relation to AR projects (safe, backward compatible)
-- Date: 2025-11-22
-- Purpose: Connect AR projects with products for pricing and cart integration

-- Step 1: Add product_id column (nullable for backward compatibility)
-- Note: products.id is VARCHAR (UUID), not INTEGER
ALTER TABLE ar_projects 
ADD COLUMN IF NOT EXISTS product_id VARCHAR REFERENCES products(id) ON DELETE SET NULL;

-- Step 2: Add attached_to_order flag (track if AR is part of an order)
ALTER TABLE ar_projects
ADD COLUMN IF NOT EXISTS attached_to_order BOOLEAN DEFAULT false;

-- Step 3: Add pricing fields for AR as a product add-on
ALTER TABLE ar_projects
ADD COLUMN IF NOT EXISTS ar_price DECIMAL(10,2) DEFAULT 500.00; -- Default AR price 500 AMD

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ar_projects_product_id ON ar_projects(product_id);
CREATE INDEX IF NOT EXISTS idx_ar_projects_user_id ON ar_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_projects_created_at ON ar_projects(created_at);

-- Step 5: Add comments for documentation
COMMENT ON COLUMN ar_projects.product_id IS 'Link to product (photobook, calendar, etc.) that this AR enhances';
COMMENT ON COLUMN ar_projects.attached_to_order IS 'True if this AR is included in a customer order';
COMMENT ON COLUMN ar_projects.ar_price IS 'Price for AR feature in AMD (default 500)';

-- Rollback script (if needed):
-- ALTER TABLE ar_projects DROP COLUMN IF EXISTS product_id;
-- ALTER TABLE ar_projects DROP COLUMN IF EXISTS attached_to_order;
-- ALTER TABLE ar_projects DROP COLUMN IF EXISTS ar_price;
-- DROP INDEX IF EXISTS idx_ar_projects_product_id;
-- DROP INDEX IF EXISTS idx_ar_projects_user_id;
-- DROP INDEX IF EXISTS idx_ar_projects_created_at;
