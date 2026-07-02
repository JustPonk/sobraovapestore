-- Enums used across Sobrao schema

-- Role types for RLS and default behavior
CREATE TYPE role_type AS ENUM ('administrator', 'employee', 'customer', 'guest');

-- Order lifecycle
CREATE TYPE order_status AS ENUM (
  'draft', 'pending', 'paid', 'processing', 'awaiting_shipment', 'shipped', 'delivered', 'cancelled', 'refunded'
);

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded');

-- Inventory movement types
CREATE TYPE inventory_movement_type AS ENUM ('in', 'out', 'adjustment', 'transfer', 'opening');

-- Price types
CREATE TYPE price_type AS ENUM ('list', 'cost', 'sale', 'discount');

-- Shipping status
CREATE TYPE shipping_status AS ENUM ('pending', 'label_created', 'in_transit', 'delivered', 'returned');

-- Coupon / promotion types
CREATE TYPE coupon_type AS ENUM ('percentage', 'fixed', 'free_shipping');

-- Channel of origin
CREATE TYPE sales_channel AS ENUM ('web','mobile','pos','api');

-- Address type
CREATE TYPE address_type AS ENUM ('billing','shipping','both');

-- KPI types
CREATE TYPE kpi_granularity AS ENUM ('daily','weekly','monthly');
