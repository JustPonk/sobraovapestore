Sobrao - Database schema for PostgreSQL 16 and Supabase

This folder contains the production SQL foundation for Sobrao. The design is normalized for ERP, e-commerce, logistics, analytics, and future AI workloads.

Execution order

1. `00_extensions.sql`
2. `01_enums.sql`
3. `02_functions.sql`
4. `03_profiles.sql`
5. `04_roles.sql`
6. `05_permissions.sql`
7. `06_catalog.sql`
8. `07_inventory.sql`
9. `08_customers.sql`
10. `09_orders.sql`
11. `10_payments.sql`
12. `11_shipping.sql`
13. `12_marketing.sql`
14. `13_ai.sql`
15. `14_analytics.sql`
16. `15_audit.sql`
17. `16_indexes.sql`
18. `17_views.sql`
19. `18_seed.sql`
20. `20_visitors.sql`
21. `19_rls.sql`

Recommended deployment flow

1. Load schema files from `00` through `17`.
2. Load `18_seed.sql` to populate baseline roles, permissions, catalog defaults, payment methods, settings, and shipping configuration.
3. Load `20_visitors.sql` before `19_rls.sql`, then load `19_rls.sql` last so initial inserts are not blocked by policies.

Architecture principles

- UUID primary keys with `gen_random_uuid()`.
- `timestamptz` for all temporal fields.
- Soft delete via `deleted_at` where records must remain historically visible.
- Immutable event/history tables for inventory, orders, analytics, and audit.
- Composite foreign keys and bridge tables for many-to-many relationships.
- Partial indexes for single-default rules and frequent filtered access paths.
- Comments on tables and important columns to preserve business meaning inside the database.

Table reference

Security

- `profiles`: stores the business user profile linked to Supabase Auth. It is fed by authentication signup, profile completion, and ERP user management. It relates to `user_roles`, `customers`, `carts`, `orders`, `audit_logs`, and most operational tables as the actor reference.
- `roles`: catalogs RBAC roles such as administrator, employee, customer, and guest. It is fed by seed data and role administration. It relates to `user_roles` and `role_permissions`.
- `user_roles`: bridge table that assigns one or more roles to a profile. It is fed by admin operations or seed logic. It relates `profiles` to `roles`.
- `permissions`: defines fine-grained capabilities like `orders.manage` or `catalog.read`. It is fed by seed data and future security administration. It relates to `role_permissions`.
- `role_permissions`: bridge table that assigns permissions to roles. It is fed by seeds and admin maintenance. It relates `roles` to `permissions`.

Catalog

- `categories`: hierarchical taxonomy for navigation and merchandising. It is fed by seed data and catalog administration. It relates to itself through `parent_id` and to products through `product_categories` and `promotion_categories`.
- `brands`: master data for manufacturers or commercial brands. It is fed by seeds and catalog management. It relates to `products`.
- `products`: product master record with no stock or sellable-state logic. It is fed by catalog managers and imports. It relates to `brands`, `product_categories`, `product_variants`, `product_images`, `product_attributes`, `product_attribute_values`, `product_prices`, `cart_items`, `order_items`, `favorites`, `recently_viewed`, `ai_recommendations`, and `dashboard_events`.
- `product_categories`: many-to-many bridge between products and categories. It is fed by catalog assignment workflows. It relates `products` to `categories`.
- `product_variants`: sellable SKU-level record with barcode, dimensions, and option payload. It is fed by catalog imports and ERP variant maintenance. It relates to `products`, `stock`, `inventory_movements`, `product_images`, `product_attribute_values`, `product_prices`, `cart_items`, `order_items`, `favorites`, `recently_viewed`, and `ai_recommendations`.
- `product_images`: media assets for products or variants. It is fed by catalog uploads and DAM processes. It relates to `products` and `product_variants`.
- `product_attributes`: defines product specification fields and variant axes. It is fed by catalog configuration. It relates to `product_attribute_values`.
- `product_attribute_values`: stores typed attribute values for products or variants. It is fed by catalog entry forms, PIM imports, or ERP sync. It relates to `products`, `product_variants`, and `product_attributes`.
- `product_prices`: temporal price history for products or variants. It is fed by pricing workflows, promotions, or ERP updates. It relates to `products` and `product_variants`.

Inventory

- `warehouses`: physical or virtual stock locations. It is fed by ERP setup and future branch creation. It relates to `stock`, `inventory_movements`, and `purchase_orders`.
- `suppliers`: vendor master records for procurement. It is fed by purchasing and ERP onboarding. It relates to `purchase_orders`.
- `stock`: current balance of quantity by warehouse and variant. It is fed automatically by `inventory_movements`. It relates to `warehouses` and `product_variants`.
- `inventory_movements`: immutable ledger of every inbound, outbound, transfer, opening, or adjustment movement. It is fed by ERP receipts, sales, reservations, returns, and corrections. It relates to `warehouses`, `product_variants`, and optionally the document that caused the movement.
- `purchase_orders`: supplier purchase headers for replenishment. It is fed by procurement workflows and automatic restock logic. It relates to `suppliers`, `warehouses`, `profiles`, and `purchase_order_items`.
- `purchase_order_items`: line items for the purchase order. It is fed by procurement entry and receiving. It relates to `purchase_orders` and `product_variants`.

Customers

- `customers`: business customer master record. It is fed by storefront registration, guest checkout conversion, CRM import, or ERP customer creation. It relates to `profiles`, `customer_addresses`, `customer_notes`, `customer_tags`, `customer_tag_assignments`, `carts`, `orders`, `favorites`, `recently_viewed`, `newsletters`, `chatbot_conversations`, `ai_recommendations`, `dashboard_events`, and `audit_logs`.
- `customer_addresses`: normalized address book for billing and shipping. It is fed by checkout, customer self-service, or CRM updates. It relates to `customers` and is snapshotted later into `orders`.
- `customer_notes`: internal CRM and support notes. It is fed by employees and support workflows. It relates to `customers` and `profiles`.
- `customer_tags`: reusable segmentation labels. It is fed by marketing or CRM setup. It relates to `customer_tag_assignments`.
- `customer_tag_assignments`: many-to-many bridge between customers and tags. It is fed by CRM and segmentation automation. It relates `customers` to `customer_tags`.

Cart and orders

- `carts`: temporary shopping basket for guests and authenticated users. It is fed by storefront browsing and session activity. It relates to `customers`, `profiles`, `cart_items`, and later `orders`.
- `cart_items`: active cart lines with current price snapshot. It is fed by add-to-cart and quantity updates. It relates to `carts`, `products`, and `product_variants`.
- `orders`: immutable order header with financial, customer, and address snapshots. It is fed when checkout is confirmed from a cart or a manual ERP sale. It relates to `carts`, `customers`, `profiles`, `order_items`, `payments`, `refunds`, `order_status_history`, `shipping_rates`, and `audit_logs`.
- `order_items`: immutable line snapshots storing product name, SKU, image, and price at checkout time. It is fed from cart conversion or manual order entry. It relates to `orders`, `products`, and `product_variants`.
- `order_status_history`: append-only lifecycle log for order changes. It is fed automatically by order status updates. It relates to `orders` and `profiles`.

Payments

- `payment_methods`: registry of supported methods and provider configuration. It is fed by seed data and payment-admin setup. It relates to `payments`.
- `payments`: payment attempts, authorizations, captures, and failures. It is fed by gateway callbacks or manual ERP confirmation. It relates to `orders` and `payment_methods`.
- `refunds`: refund ledger tied to captured payments. It is fed by support, ERP, or payment gateway events. It relates to `payments` and `orders`.

Shipping and configuration

- `shipping_zones`: geographic delivery groups. It is fed by logistics setup. It relates to `shipping_zone_countries` and `shipping_rates`.
- `shipping_zone_countries`: list of countries that belong to each zone. It is fed by logistics setup. It relates to `shipping_zones`.
- `shipping_rates`: rules that calculate shipping cost and delivery windows. It is fed by logistics, carrier configuration, or promotions. It relates to `shipping_zones` and is consumed by checkout and `orders`.
- `settings`: central configuration store for store, inventory, checkout, and system flags. It is fed by seeds and admin edits. It relates indirectly to all modules that read configuration.

Marketing

- `coupons`: coupon rules with limits and validity windows. It is fed by marketing campaigns. It relates to orders and checkout logic.
- `promotions`: time-bound merchandising promotions. It is fed by marketing campaigns. It relates to `promotion_products` and `promotion_categories`.
- `promotion_products`: bridge between promotions and products. It is fed by campaign targeting. It relates `promotions` to `products`.
- `promotion_categories`: bridge between promotions and categories. It is fed by campaign targeting. It relates `promotions` to `categories`.
- `favorites`: saved products for a customer or profile. It is fed by storefront user actions. It relates to `customers`, `profiles`, `products`, and `product_variants`.
- `recently_viewed`: behavior table for product browsing history. It is fed by storefront events. It relates to `customers`, `profiles`, `products`, and `product_variants`.
- `newsletters`: subscription registry for email marketing. It is fed by public signup forms, checkout opt-in, and CRM imports. It relates to `customers` and `profiles`.

Visitors

- `visitors`: anonymous visitor registry created before authentication. It is fed by first visit tracking, session bootstrapping, and marketing attribution. It relates to `carts`, `favorites`, `recently_viewed`, `dashboard_events`, and later migrates into the authenticated profile/customer flow.

AI

- `chatbot_conversations`: conversation header with context and status. It is fed by chat sessions from the web app, future channels, or support tools. It relates to `customers` and `profiles`.
- `chatbot_messages`: immutable message log inside a conversation. It is fed by user messages, assistant responses, tool calls, and system prompts. It relates to `chatbot_conversations`.
- `ai_recommendations`: recommendation output generated from product, browsing, and purchase context. It is fed by model jobs, ranking services, or automation. It relates to `customers`, `profiles`, `products`, and `product_variants`.

Analytics

- `dashboard_events`: append-only event stream for views, cart actions, checkout, purchase, login, registration, searches, and clicks. It is fed by the storefront, ERP UI, bots, and automation jobs. It relates to `profiles`, `customers`, `orders`, `products`, `product_variants`, and `carts`.
- `kpi_daily`: daily KPI fact table for dashboards and BI. It is fed by scheduled aggregation jobs or ETL processes. It relates indirectly to all source tables through the metric dimensions.

Audit

- `audit_logs`: compliance-oriented record of data changes and important actions. It is fed by application triggers, server-side handlers, or admin workflows. It relates to `profiles` and the affected table/record metadata.
- `activity_logs`: human-readable operational timeline. It is fed by business actions, automations, and support events. It relates to `profiles` and the affected entity metadata.

Reporting objects

- `16_indexes.sql`: supplemental trigram and JSONB indexes for search, filtering, and analytics workloads.
- `17_views.sql`: reporting views that assemble catalog, inventory, orders, customers, and KPI summaries without duplicating data.

Flow of information

1. Catalog defines the sellable structure: brands, categories, products, variants, images, attributes, and prices.
2. Inventory keeps the current stock balance in `stock`, but the real source of truth is `inventory_movements`.
3. Visitors preserve anonymous behavior first; later, customers and profiles provide identity and cart/order ownership.
4. Checkout copies product and address information into immutable order snapshots.
5. Payments and refunds attach to the order lifecycle.
6. Marketing tables capture segmentation and campaign behavior.
7. AI tables store conversation and recommendation context.
8. Analytics and audit tables capture what happened, when it happened, and who did it.
9. Visitors keep anonymous behavior linked until registration and later migration.

Operational notes

- Do not edit immutable history tables directly; write new events or movements instead.
- Keep order and inventory history append-only.
- Use the `updated_at` trigger on mutable tables only.
- Maintain RLS policies in Supabase alongside application access rules.
- Extend the schema by adding new numbered files rather than mixing modules into existing files.

The summary above is intentionally compact: it is meant as a quick production reference, not as a replacement for the SQL comments inside each table definition.

Operational notes

- Do not edit immutable history tables directly; write new events or movements instead.
- Keep order and inventory history append-only.
- Use the `updated_at` trigger on mutable tables only.
- Maintain RLS policies in Supabase alongside application access rules.
- Extend the schema by adding new numbered files rather than mixing modules into existing files.

This schema is intentionally broad so the same database can support storefront, ERP, warehouse, analytics, AI, and future integrations without duplicating core business data.
