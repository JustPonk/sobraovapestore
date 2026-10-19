ALTER TABLE IF EXISTS public.carts
    ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'PEN';

INSERT INTO public.warehouses (name, address, is_active)
SELECT 'Almacén Principal', 'Almacén general de Sobrao Vape Store', true
WHERE NOT EXISTS (SELECT 1 FROM public.warehouses LIMIT 1);

DO $$
DECLARE
    v_warehouse_id uuid;
    v_variant record;
BEGIN
    SELECT id INTO STRICT v_warehouse_id FROM public.warehouses ORDER BY created_at ASC LIMIT 1;

    FOR v_variant IN
        SELECT pv.id AS variant_id
        FROM public.product_variants pv
        WHERE pv.is_active = true
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM public.inventory
            WHERE variant_id = v_variant.variant_id
              AND warehouse_id = v_warehouse_id
        ) THEN
            INSERT INTO public.inventory (variant_id, warehouse_id, quantity, reserved_quantity)
            VALUES (v_variant.variant_id, v_warehouse_id, 10, 0);
        ELSE
            UPDATE public.inventory
            SET quantity = GREATEST(quantity, 10),
                reserved_quantity = LEAST(reserved_quantity, GREATEST(quantity, 10)),
                updated_at = now()
            WHERE variant_id = v_variant.variant_id
              AND warehouse_id = v_warehouse_id
              AND (quantity < 1 OR reserved_quantity > quantity);
        END IF;
    END LOOP;
END $$;
