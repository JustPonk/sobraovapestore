# Plan: Rediseño Carrito + Auth Storefront + Límite 2 Direcciones + Toggle Delivery InDrive

## Repository Research

### 1. Estructura actual del carrito (diagnóstico bug "-")
- `sobraovapestore/app/locale/store/components/CartView.tsx`: componente principal `/carrito`. Layout actual: 1 columna `max-w-[720px]` con 2 bloques apilados: `items` arriba, `Resumen del pedido (subtotal/descuento/IGV/envío/total + botón continuar)` abajo.
- Bug confirmado **root cause del botón "menos"**:
  1. `cartStorage.ts` solo tiene 2 helpers: `getStoredCart()` y `upsertCartItem()`; **no tiene helpers para updateQty / deleteItem**.
  2. `CartView.onQty()` llama a `updateCartLineQty()` (server) y actualiza React state `setCart` ← esto sí reduce visualmente en la pestaña `/carrito`.
  3. PERO `CartPreview.tsx` (componente mini-carrito que usa `getStoredCart()` localStorage) y el `syncStoredCartAndFetchLatest` del **page load siguiente** usan la copia localStorage obsoleta → al refrescar la página `syncLocalCartToDb` vuelve a insertar la quantity **vieja** original.
  4. Síntoma percibido por el user: "le doy al menos, se renderiza (React state OK), pero no disminuye al recargar o desde CartPreview".
- Solución: ampliar `cartStorage.ts` con `updateStoredItemQty(variantId, nextQty)` y `removeStoredItem(variantId)` y llamarlos **también** desde `onQty` y `onRemove` del CartView (además de la server action). Event sync `sobrao-cart-updated` ya existe.

### 2. Auth storefront: estado actual
- `sobraovapestore/app/components/navbar/navbar.tsx#L32-L33`: placeholder `const [isLoggedIn] = useState(false)` sin wire up. Links hardcodeados: `#login`, `#register`, `#orders` (no existen rutas).
- `utils/supabase/client.ts` ya exporta `createBrowserClient()` listo (usado en success step CheckoutFlow).
- `utils/supabase/server.ts` + `config.ts` tienen `requireEnv` segura y `getCurrentScope()` que detecta `supabase.auth.getUser()`.
- Rutas auth necesarias:
  - `/iniciar-sesion` page (signInWithPassword email/password)
  - `/registro` page (signUp con confirmación mail Supabase)
  - `/api/auth/callback` route opcional (para PKCE email confirmation)
  - `/mi-cuenta` opcional no — fuera de scope; los links en Navbar apuntan a las 2 nuevas rutas + logout onClick inline.

### 3. Direcciones límite 2 por usuario
- Tabla `public.user_addresses` migración 3: `user_id uuid null` (migración 29 ya lo hizo nullable).
- Actualmente no hay server action para crear dirección reusable (CheckoutFlow siempre inserta snapshot cada pedido con `address_mode='new'`).
- **Simplificación**: como límite es por persona logueada y no se usa un address book persistente de momento, la validación se aplica:
  1. Server-side antes de INSERT `user_addresses` cuando `user_id != null`: count + 1 <= 2, else error.
  2. CheckoutFlow addressMode 'new' ya válida en UI: si `addresses.length >= 2` (addresses se cargan via server), deshabilita el modo "Nueva dirección" y muestra mensaje "Ya tienes 2 direcciones guardadas. Usa una o elimina una."
- Importante: user no tiene UI para borrar direcciones aún. Agregamos 1 server action `deleteAddress(addressId)` y 1 ícono 🗑️ al lado de cada dirección existente.

### 4. Cálculo delivery toggle (carrito)
- Actual: Envío se calcula en `calcTotals` de actions.ts con `shipping_total = 0` siempre. `shipping_methods` tabla existe (migración 7) pero no seed data.
- Requisito user: Toggle delivery "Activar delivery" en el carrito. Si ON:
  1. **Toma la dirección default del user logueado, o la 1ra dirección del checkout anterior** (mejor: input simple dentro del panel cuando no hay dirección — acepta ubigeo mínimo: departamento / provincia / distrito, opcionalmente dirección para mejor aproximación).
  2. **Calcula desde almacén**: hardcode warehouse en constants (config.ts) como `{ department: 'Lima', province: 'Lima', district: 'San Isidro', label: 'Almacén Sobrao Vape — Av. Javier Prado Oeste, San Isidro, Lima' }`.
  3. **Tabla tarifaria aproximada regla simple**:
     - MISMO DISTRITO que almacén → S/. 10
     - PROVINCIA LIMA (Lima Metropolitana: province='Lima' y cualquier distrito != almacén) → S/. 15
     - LIMA PROVINCIAS (department='Lima' province != 'Lima') → S/. 22
     - NACIONAL resto de departamentos → S/. 28
     - Estos valores se almacenan en una constants exportada para que las puedas cambiar fácil.
  4. **Recomendación InDrive Pedidos**: banner sticky en el panel de envío "💡 Recomendamos usar InDrive Pedidos — ahorras en promedio S/. 4-6 y eliges el momento exacto de retiro. Enlace: https://indrive.com/es-pe/pedidos" con `target="_blank"`.
  5. `shipping_total` nuevo cálculo se aplica **tanto en CartView (client preview)** como re-calculado server al llegar al PlaceOrder (usa lo mismo calcTotals con shipping method id o amount manual).

### 5. UI objetivo: sin scroll en desktop
- Layout actual problema: 1 columna items+resumen causa scroll si hay 3+ productos.
- Nuevo layout target:
  - **Desktop (>= lg)**: 2 columnas 60% / 40% `lg:grid lg:grid-cols-12 gap-6`
    - Col izquierda (`lg:col-span-7`): lista productos compacta
    - Col derecha (`lg:col-span-5` sticky top-32): resumen compacto + toggle delivery + totales + CTA checkout
    - Height controlado `min-h-[calc(100vh-10rem)] sin overflow vertical items: max-h-[60vh] overflow-y-auto en productos si hay muchos`
  - **Mobile**: mantiene stack 1 col, items compacto arriba, resumen abajo (igual que ahora pero mejor paddings)
- **Sin títulos grandes**: user prohibe Thunder uppercase gigantes; todos los títulos usan Satoshi negro `text-base tracking-widest` igual que "Resumen del pedido" existente.

## Files and Modules (por orden implementación)

| Archivo | Cambio esperado |
|---------|-----------------|
| `sobraovapestore/app/locale/store/cartStorage.ts` | + helpers `updateStoredItemQty(variantId, qty)`, `removeStoredItem(variantId)`; return new cart + dispatch `sobrao-cart-updated`. |
| `sobraovapestore/app/locale/store/components/CartView.tsx` | Rewrite layout 2 col (lg) / 1 col (md); lista productos compacta; panel resumen sticky; toggle delivery; bug fix onQty + onRemove sincronizan localStorage. |
| `sobraovapestore/utils/supabase/config.ts` | + const `WAREHOUSE_ADDRESS`; + function `getWarehouseAddress()`; + `DELIVERY_RULES_TABLE`. |
| `sobraovapestore/app/actions.ts` | + `applyDelivery(addressDraft, totals)` helper; + `getAddressesForCurrentUser()`; + `createAddress()` with COUNT <= 2 validation; + `deleteAddress()`; + `validateAddressLimit()`; update `placeOrderWithYape` uses delivery method rule totals. |
| `sobraovapestore/app/checkout/CheckoutFlow.tsx` | Leer `addresses.length` al render; bloquear modo 'new' si >=2 con mensaje; ícono 🗑️ al lado cada dirección llama `deleteAddress`. |
| `sobraovapestore/app/components/navbar/navbar.tsx` | Reemplazar placeholder state por `useEffect` + `createBrowserClient().auth.onAuthStateChange()`; links reales: Login → `/iniciar-sesion`, Registrarse → `/registro`; Mis compras → `/tienda` temp; Logout inline `signOut()`. |
| `sobraovapestore/app/iniciar-sesion/page.tsx` | Nueva ruta: email+pass, link a registro, error handling |
| `sobraovapestore/app/registro/page.tsx` | Nueva ruta: email+password+full_name+checkboxes terms/privacy, signUp redirect |
| `sobraovapestore/app/api/auth/callback/route.ts` | Nueva ruta Next supabase PKCE callback opcional (supabase docs) |
| `sobraovapestore/app/carrito/page.tsx` | Si hace falta, ajustes menores para layout wrapper (actual `storefrontFrameClass` max 1920 OK). |

## Implementation Steps (dependency order)

1. **Fix bug disminuir producto** — ampliar `cartStorage.ts` 2 helpers + actualizar handlers `onQty / onRemove` de CartView para llamar BOTH: server action Y storage helper.
2. **Rediseño UI CartView** — refactor layout 2 columnas sticky; productos compactos `grid grid-cols-[auto_1fr_auto]` (img, nombre+sku+atributos, qty+subtotal); Resumen card sticky con switch delivery y totales compacto.
3. **Config dirección almacén y rules tarifa delivery** — `config.ts` constantes `WAREHOUSE_ADDRESS` (San Isidro, Lima) + `DELIVERY_RATES` tabla con función `calculateShipping(from, toDraft)` pura.
4. **Server actions direcciones + delivery toggle** — crear `getAddressesForCurrentUser`, `createAddress(userId, payload)` con validación COUNT <= 2, `deleteAddress(addressId, userId)`, y helper `resolveShipping(..)` que retorna shipping_total + label + InDrive banner; el toggle delivery de CartView se comunica con session cart via cookie localStorage o via server action `applyShippingToCart(shippingMethodIdOrDraft)` (mejor: server action updatea carts.shipping_method_id / shipping_draft JSONB para que sea persistente entre paginas). Requiere migration pequeña ALTER carts ADD COLUMN IF NOT EXISTS shipping_draft jsonb + shipping_total_applied numeric.
5. **Limite 2 direcciones en CheckoutFlow** — bloquear pestaña "Nueva dirección" si addresses.length >=2 y agregar botón borrar por cada dirección card.
6. **Auth storefront: Navbar session-state** — reemplazar `useState(false)` por hook de sesión real; logout inline `signOut()` y `router.refresh()`.
7. **Páginas Login / Registro** — crear `/iniciar-sesion` y `/registro` con misma paleta + navbar/footer; sin títulos grandes; inputs estilo Satoshi.
8. **(Opcional) PKCE Callback route `/api/auth/callback`** — según se necesite para redirección email confirm Supabase.
9. **Validación**: GetDiagnostics + tsc --noEmit ambos workspaces. Prueba manual flujo E2E: guest sin cuenta → disminuir qty → no rollback al refrescar; user con 2 direcciones → bloqueado crear 3ra; login → navbar logout; delivery toggle → monto cambia.

## Dependencies and Considerations
- Supabase Auth require `SITE_URL` y `Redirect URLs` configuradas en Dashboard Auth → URL Configuration para `/iniciar-sesion` y `/registro`. Mencionar al user.
- El toggle delivery **no usa API de maps** por ahora (sin API key): user pidió "aproximado" — tabla estática. Si en el futuro quieren distancias de carretera podremos integrar Google Routes o OpenRouteService sin cambiar UI.
- No agregar librerías nuevas. Sin react-hook-form; usar formularios simples `onSubmit + e.preventDefault()`.
- CartPreview usa localStorage. Seguirá funcionando si en step 1 actualizamos storage en onQty/onRemove.
- Migración pequeña carts.shipping_draft/shipping_total_applied: usar patrón idempotente igual que la 30.
- RECAPTCHA en login/register: no requiere; login/register ya tiene rate limit nativo de Supabase.
- Navbar actual tiene links que abren #login. Reemplazarlos por /iniciar-sesion, /registro. User Logout → inline handler, no crear página de logout.

## Validation
1. `GetDiagnostics` global ambos workspaces → 0.
2. `npx tsc --noEmit` sobraovapestore → 0.
3. `npx tsc --noEmit` sistemasobrao → 0 (no deberíamos tocar admin, pero confirmar).
4. Flujo bug fix disminuir:
   - Agregar 2 unidades producto X en carrito.
   - Click "-" → React muestra 1.
   - Refrescar la página /carrito → cantidad Sigue siendo 1 (no regresa a 2).
   - Abrir mini-cart CartPreview desde tienda → coincide 1.
5. Flujo limite 2 direcciones:
   - Con user logueado en checkout: crear 2 direcciones nuevas.
   - Al intentar 3ra: botón "Nueva dirección" deshabilitado, mensaje al lado.
   - Eliminar una → se vuelve a habilitar.
6. Flujo delivery toggle:
   - Activar delivery, ingresar distrito Miraflores (Lima) → 15 PEN aplica a total.
   - Distrito San Isidro → 10 PEN.
   - Trujillo → 28 PEN.
   - Banner recomendación InDrive visible siempre que delivery ON.
7. Flujo Auth:
   - Ir /registro → crear cuenta → Supabase Auth Users aparece nuevo email pending confirmation.
   - Ir /iniciar-sesion → loguear → Navbar dropdown cambia a Mis compras / Log out.
   - Click Log out → cerrar sesión, Navbar vuelve a Login / Registrarse.
8. Desktop layout check: 2 productos → viewport 1440px → no scroll vertical; 10 productos → items scrollea internamente; resumen se mantiene sticky.

## Risks
- **Riesgo 1: Desync localStorage ↔ DB si la server action falla**.
  - Manejo: Llama storage helpers **solo después** de confirmar `res.ok === true` desde server; si falla, no tocas localStorage.
- **Riesgo 2: Migración ALTER carts columns shipping_draft falla si ya existe (idempotent)**.
  - Manejo: usar bloque `DO $$ BEGIN ... ADD COLUMN IF NOT EXISTS ... EXCEPTION WHEN duplicate_column THEN NULL END $$;` igual que migración 30.
- **Riesgo 3: Supabase email redirect URLs no configuradas → user no confirma correo**.
  - Manejo: Al final del message user agregamos checklist "Configurar en Supabase Dashboard → Auth → URL Configuration: SITE_URL = storefront origin + Additional Redirect URLs: /iniciar-sesion, /registro".
- **Riesgo 4: Direction limit 2: modo invitado vs user logueado (ambiguo)**.
  - Manejo: user pide "por persona" → solo aplicar cuando `getCurrentScope().mode === 'user'`; invitados no tienen address book persistente, el límite no aplica (sus inserts son snapshots por pedido, sin reuse).
- **Riesgo 5: Login/Register pages con captcha (user no pidió)**.
  - Manejo: skip captcha en rutas auth por ahora; si en un futuro hay spam agresivo se agrega reCAPTCHA v3 igual que checkout.
- **Riesgo 6: Cálculo delivery: `shipping_total` no se sincroniza entre CartView y CheckoutFlow → paga monto distinto**.
  - Manejo: ambos componentes importan la MISMA función pura `calculateShippingEstimate()` desde `config.ts`; además server side recalcular antes de placeOrder.
