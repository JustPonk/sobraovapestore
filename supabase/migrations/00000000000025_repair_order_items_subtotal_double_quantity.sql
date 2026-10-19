-- Fix one-shot: recalcular order_items.subtotal para las filas grabadas con bug de doble quantity
-- (actions.ts STEP3 insertaba subtotal = quantity * lineSubtotal cuando lineSubtotal ya era
--  la suma subtotal de toda la línea). Corrige además cualquier desviación histórica.
--
-- Semántica correcta: unit_price PRECIO POR UNIDAD (incluye IGV). Entonces:
--   subtotal (sin IGV, por línea) = round( (quantity * unit_price) / 1.18 , 2)
--   igv_amount (por línea)          = round( (quantity * unit_price) - subtotal , 2)
-- Se recalculan ambos en caso de haber desvíos, para igualar a la cabecera orders.

update public.order_items
set
  subtotal = round( ((quantity::numeric * unit_price::numeric) / 1.18), 2 ),
  igv_amount = round( ((quantity::numeric * unit_price::numeric) - round( ((quantity::numeric * unit_price::numeric) / 1.18), 2 )), 2 )
where
  round( (quantity::numeric * unit_price::numeric) / 1.18 , 2) is distinct from subtotal
  or round( (quantity::numeric * unit_price::numeric) - round( ((quantity::numeric * unit_price::numeric) / 1.18), 2 ), 2) is distinct from igv_amount;
