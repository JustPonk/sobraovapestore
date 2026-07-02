# Resumen de tablas de Sobrao

Este documento resume, en español y de forma breve, la función de cada tabla, cómo se alimenta y cómo se relaciona con el resto del modelo.

## Seguridad

### `profiles`
- Función: perfil de usuario de la aplicación, separado de la autenticación de Supabase.
- Se alimenta desde: registro, alta manual por ERP, actualización de datos de cuenta.
- Se relaciona con: `user_roles`, `customers`, `carts`, `orders`, `customer_notes`, `favorites`, `recently_viewed`, `chatbot_conversations`, `ai_recommendations`, `dashboard_events`, `audit_logs`.

### `roles`
- Función: catálogo de roles RBAC como administrador, empleado, cliente e invitado.
- Se alimenta desde: seeds y administración interna.
- Se relaciona con: `user_roles` y `role_permissions`.

### `user_roles`
- Función: tabla puente entre perfiles y roles.
- Se alimenta desde: asignación manual o automatizada por administración.
- Se relaciona con: `profiles` y `roles`.

### `permissions`
- Función: catálogo de permisos granulares, por ejemplo `orders.manage`.
- Se alimenta desde: seeds y mantenimiento administrativo.
- Se relaciona con: `role_permissions`.

### `role_permissions`
- Función: tabla puente entre roles y permisos.
- Se alimenta desde: seeds y administración de acceso.
- Se relaciona con: `roles` y `permissions`.

## Visitantes

### `visitors`
- Función: registro de visitantes anónimos antes de autenticarse.
- Se alimenta desde: primera visita, tracking de sesión, campañas y reingreso posterior.
- Se relaciona con: `carts`, `favorites`, `recently_viewed`, `dashboard_events` y, tras la migración, con `profiles` y `customers` mediante los datos ya copiados.
- Flujo: al entrar por primera vez se genera un `visitor_token` UUID que se guarda en cookie HttpOnly o mecanismo equivalente; después se reutiliza para identificar al visitante hasta que se registre.
- `last_activity_type`: guarda la última acción relevante del visitante con valores como `browse`, `favorite`, `cart`, `checkout`, `login` o `purchase`.

### Flujo del visitante
- Visitante
- ↓
- `visitor_id`
- ↓
- Navega
- ↓
- Carrito
- ↓
- Favoritos
- ↓
- Productos vistos
- ↓
- Registro
- ↓
- `profiles`
- ↓
- `customers`
- ↓
- Toda la información previa permanece disponible.

## Catálogo

### `categories`
- Función: taxonomía jerárquica para navegación y merchandising.
- Se alimenta desde: carga inicial y mantenimiento del catálogo.
- Se relaciona con: ella misma mediante `parent_id`, con `products` mediante `product_categories` y con `promotions` mediante `promotion_categories`.

### `brands`
- Función: marcas o fabricantes de los productos.
- Se alimenta desde: seed inicial y gestión del catálogo.
- Se relaciona con: `products`.

### `products`
- Función: maestro del producto, sin stock ni lógica de SKU vendible.
- Se alimenta desde: panel de catálogo, importaciones, ERP.
- Se relaciona con: `brands`, `product_categories`, `product_variants`, `product_images`, `product_attributes`, `product_attribute_values`, `product_prices`, `cart_items`, `order_items`, `favorites`, `recently_viewed`, `ai_recommendations`, `dashboard_events`.

### `product_categories`
- Función: tabla puente entre productos y categorías.
- Se alimenta desde: asignación del catálogo.
- Se relaciona con: `products` y `categories`.

### `product_variants`
- Función: variantes vendibles por SKU.
- Se alimenta desde: catálogo, importación de SKUs y ERP.
- Se relaciona con: `products`, `stock`, `inventory_movements`, `product_images`, `product_attribute_values`, `product_prices`, `cart_items`, `order_items`, `favorites`, `recently_viewed`, `ai_recommendations`.

### `product_images`
- Función: imágenes del producto o de una variante.
- Se alimenta desde: panel de medios o DAM.
- Se relaciona con: `products` y `product_variants`.

### `product_attributes`
- Función: definición de atributos como color, talla o capacidad.
- Se alimenta desde: configuración del catálogo.
- Se relaciona con: `product_attribute_values`.

### `product_attribute_values`
- Función: valores tipados de atributos para producto o variante.
- Se alimenta desde: formularios de catálogo, importaciones o sincronización ERP.
- Se relaciona con: `products`, `product_variants` y `product_attributes`.

### `product_prices`
- Función: historial temporal de precios por producto o variante.
- Se alimenta desde: pricing, promociones, ERP o cambios del catálogo.
- Se relaciona con: `products` y `product_variants`.

## Inventario

### `warehouses`
- Función: almacenes o ubicaciones de inventario.
- Se alimenta desde: configuración ERP y altas de sucursales.
- Se relaciona con: `stock`, `inventory_movements` y `purchase_orders`.

### `suppliers`
- Función: maestros de proveedores.
- Se alimenta desde: compras y alta administrativa.
- Se relaciona con: `purchase_orders`.

### `stock`
- Función: existencia actual por almacén y variante.
- Se alimenta desde: automáticamente por `inventory_movements`.
- Se relaciona con: `warehouses` y `product_variants`.

### `inventory_movements`
- Función: libro mayor inmutable de entradas, salidas, ajustes y transferencias.
- Se alimenta desde: ventas, recepciones, devoluciones, ajustes y ERP.
- Se relaciona con: `warehouses`, `product_variants` y el documento de origen si aplica.

### `purchase_orders`
- Función: encabezado de órdenes de compra a proveedor.
- Se alimenta desde: reposición manual o automática.
- Se relaciona con: `suppliers`, `warehouses`, `profiles` y `purchase_order_items`.

### `purchase_order_items`
- Función: líneas de la orden de compra.
- Se alimenta desde: captura de compras y recepción.
- Se relaciona con: `purchase_orders` y `product_variants`.

## Clientes

### `customers`
- Función: maestro del cliente, con o sin cuenta autenticada.
- Se alimenta desde: registro web, conversión de invitado, CRM o ERP.
- Se relaciona con: `profiles`, `customer_addresses`, `customer_notes`, `customer_tags`, `customer_tag_assignments`, `carts`, `orders`, `favorites`, `recently_viewed`, `newsletters`, `chatbot_conversations`, `ai_recommendations`, `dashboard_events`, `audit_logs` y la información migrada desde `visitors`.

### `customer_addresses`
- Función: libreta de direcciones del cliente.
- Se alimenta desde: checkout, autoservicio o CRM.
- Se relaciona con: `customers` y luego se copia como snapshot en `orders`.

### `customer_notes`
- Función: notas internas de CRM o soporte.
- Se alimenta desde: empleados y equipos de atención.
- Se relaciona con: `customers` y `profiles`.

### `customer_tags`
- Función: etiquetas reutilizables para segmentación.
- Se alimenta desde: marketing o CRM.
- Se relaciona con: `customer_tag_assignments`.

### `customer_tag_assignments`
- Función: tabla puente entre clientes y etiquetas.
- Se alimenta desde: segmentación manual o automatizada.
- Se relaciona con: `customers` y `customer_tags`.

## Carrito y pedidos

### `carts`
- Función: carrito temporal de compra.
- Se alimenta desde: navegación, sesión del usuario y acciones de carrito.
- Se relaciona con: `visitors`, `customers`, `profiles`, `cart_items` y luego con `orders`.
- Migración: cuando el visitante se registra, el carrito se fusiona con el carrito activo del cliente si ya existe; si no existe, el carrito del visitante pasa a ser el carrito del usuario.

### `cart_items`
- Función: líneas del carrito con precio capturado en el momento.
- Se alimenta desde: agregar al carrito, cambiar cantidad o aplicar ajustes.
- Se relaciona con: `carts`, `products` y `product_variants`.

### `orders`
- Función: encabezado inmutable del pedido con totales y snapshots de dirección.
- Se alimenta desde: conversión del carrito o venta manual del ERP.
- Se relaciona con: `carts`, `customers`, `profiles`, `order_items`, `payments`, `refunds`, `order_status_history`, `audit_logs`.

### `order_items`
- Función: líneas del pedido con snapshot de nombre, SKU, imagen y precio.
- Se alimenta desde: checkout o captura manual del pedido.
- Se relaciona con: `orders`, `products` y `product_variants`.

### `order_status_history`
- Función: historial de cambios de estado del pedido.
- Se alimenta desde: el propio cambio de estado del pedido.
- Se relaciona con: `orders` y `profiles`.

## Pagos

### `payment_methods`
- Función: catálogo de métodos de pago y su configuración.
- Se alimenta desde: seeds y configuración de pasarelas.
- Se relaciona con: `payments`.

### `payments`
- Función: intentos, autorizaciones, capturas y fallos de pago.
- Se alimenta desde: gateway de pago o confirmación manual.
- Se relaciona con: `orders` y `payment_methods`.

### `refunds`
- Función: registro de devoluciones de dinero.
- Se alimenta desde: soporte, ERP o gateway.
- Se relaciona con: `payments` y `orders`.

## Envíos y configuración

### `shipping_zones`
- Función: zonas geográficas de envío.
- Se alimenta desde: configuración logística.
- Se relaciona con: `shipping_zone_countries` y `shipping_rates`.

### `shipping_zone_countries`
- Función: países incluidos en cada zona.
- Se alimenta desde: configuración logística.
- Se relaciona con: `shipping_zones`.

### `shipping_rates`
- Función: tarifas y reglas de envío.
- Se alimenta desde: logística, transportistas o promociones.
- Se relaciona con: `shipping_zones` y se consume en checkout y pedidos.

### `settings`
- Función: configuración central del sistema.
- Se alimenta desde: seeds y administración.
- Se relaciona indirectamente con todos los módulos que leen parámetros del sistema.

## Marketing

### `coupons`
- Función: cupones con vigencia, límites y condiciones.
- Se alimenta desde: campañas de marketing.
- Se relaciona con: checkout y pedidos.

### `promotions`
- Función: promociones comerciales de tiempo limitado.
- Se alimenta desde: campañas y merchandising.
- Se relaciona con: `promotion_products` y `promotion_categories`.

### `promotion_products`
- Función: puente entre promociones y productos.
- Se alimenta desde: segmentación de campañas.
- Se relaciona con: `promotions` y `products`.

### `promotion_categories`
- Función: puente entre promociones y categorías.
- Se alimenta desde: segmentación de campañas.
- Se relaciona con: `promotions` y `categories`.

### `favorites`
- Función: productos guardados por clientes o perfiles.
- Se alimenta desde: acción de usuario en la tienda.
- Se relaciona con: `visitors`, `customers`, `profiles`, `products` y `product_variants`.
- Migración: si el usuario ya tiene ese favorito, el registro del visitante se marca como fusionado para no duplicar el producto.

### `recently_viewed`
- Función: historial de productos vistos.
- Se alimenta desde: navegación del frontend.
- Se relaciona con: `visitors`, `customers`, `profiles`, `products` y `product_variants`.
- Migración: si el producto ya existe para el usuario, se conserva el registro más reciente y el duplicado del visitante se archiva como fusionado.

### `newsletters`
- Función: suscripciones a newsletter.
- Se alimenta desde: formularios públicos, checkout o importación CRM.
- Se relaciona con: `customers` y `profiles`.

## IA

### `chatbot_conversations`
- Función: cabecera de una conversación con contexto y estado.
- Se alimenta desde: chat web, soporte o futuros canales.
- Se relaciona con: `customers` y `profiles`.

### `chatbot_messages`
- Función: log inmutable de mensajes.
- Se alimenta desde: usuario, asistente, sistema o herramientas.
- Se relaciona con: `chatbot_conversations`.

### `ai_recommendations`
- Función: recomendaciones generadas por modelos o reglas.
- Se alimenta desde: jobs de IA, ranking o automatizaciones.
- Se relaciona con: `customers`, `profiles`, `products` y `product_variants`.

## Analítica

### `dashboard_events`
- Función: stream de eventos de vista, carrito, checkout, compra, login, registro, búsquedas y clics.
- Se alimenta desde: frontend, ERP, bots y automatizaciones.
- Se relaciona con: `visitors`, `profiles`, `customers`, `orders`, `products`, `product_variants` y `carts`.
- Importante: los eventos históricos no se modifican; solo los nuevos eventos pueden registrar simultáneamente `visitor_id`, `profile_id` y `customer_id`.

### `kpi_daily`
- Función: tabla de KPIs diarios para dashboards y BI.
- Se alimenta desde: procesos de agregación o ETL.
- Se relaciona indirectamente con todos los módulos fuente de métricas.

## Auditoría

### `audit_logs`
- Función: bitácora de cambios y acciones críticas.
- Se alimenta desde: triggers, backend y procesos administrativos.
- Se relaciona con: `profiles` y con la tabla/registro afectado mediante metadatos.

### `activity_logs`
- Función: línea de tiempo operativa legible para negocio y soporte.
- Se alimenta desde: acciones de usuarios, automatizaciones y tareas del sistema.
- Se relaciona con: `profiles` y la entidad afectada.

## Objetos de soporte

### `16_indexes.sql`
- Función: índices suplementarios para búsqueda y lectura masiva.
- Se alimenta desde: definición SQL, no desde datos de negocio.
- Se relaciona con: varias tablas de catálogo, clientes, pedidos, marketing, IA y analítica.

### `17_views.sql`
- Función: vistas de reporte para catálogo, inventario, pedidos, clientes y KPIs.
- Se alimenta desde: las tablas operativas.
- Se relaciona con: prácticamente todo el núcleo de datos, pero sin duplicarlo.

## Flujo general de datos

1. El catálogo define productos, variantes, imágenes y precios.
2. El inventario registra movimientos y actualiza el stock actual.
3. El cliente navega, agrega al carrito y genera una orden.
4. El visitante anónimo conserva carrito, favoritos, historial y eventos mediante `visitor_id`.
5. Cuando se registra, se crea `profiles` y luego `customers`, y los datos previos se migran sin perder el `visitor_id`.
6. La orden conserva snapshots para que el historial no se rompa aunque cambie el catálogo.
7. Los pagos y reembolsos se enlazan al pedido.
8. Marketing captura segmentación y comportamiento.
9. IA guarda conversaciones y recomendaciones.
10. Analítica y auditoría registran eventos y cambios para reporting y control.

## Nota operativa

Este archivo es un resumen ejecutivo. La definición exacta de restricciones, índices, llaves foráneas y comentarios SQL sigue estando en cada archivo `.sql` del módulo correspondiente.