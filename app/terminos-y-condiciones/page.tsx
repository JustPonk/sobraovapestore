import type { Metadata } from 'next'

import Footer from '@/app/components/footer/footer'
import Navbar from '@/app/components/navbar/navbar'
import {
	storefrontFrameClass,
	storefrontSectionEyebrowClass,
	storefrontSectionTitleClass,
	storefrontSectionTitleWrapClass,
} from '@/app/locale/store/storeStyles'

export const metadata: Metadata = {
	title: 'Términos y Condiciones | Sobrao Vape Store',
	description:
		'Términos y condiciones generales de compra, envío, cambios, devoluciones y métodos de pago en Sobrao Vape Store.',
}

const HIGHLIGHT_CARD =
	'rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_-12px_rgba(31,42,155,0.15)] backdrop-blur-sm sm:p-8'

const H2 =
	'mt-10 mb-4 text-2xl font-black uppercase tracking-[0.02em] text-[#1f2a9b] sm:text-3xl'

const H3 = 'mt-6 mb-2 text-lg font-bold text-slate-900'

const P = 'mb-3 text-slate-700 leading-relaxed'

const UL = 'mb-4 list-disc space-y-2 pl-6 text-slate-700'
const LI = 'leading-relaxed'

export default function TermsPage() {
	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(143,104,255,0.16),transparent_28%),linear-gradient(180deg,#f9f8ff_0%,#f5f3ff_40%,#ffffff_100%)] text-slate-900">
			<div className="fixed inset-x-0 top-0 z-[60]">
				<Navbar />
			</div>

			<main className="pt-28 sm:pt-32">
				<section className={`${storefrontFrameClass} space-y-8 py-10 sm:space-y-10 sm:py-14`}>
					<div className={storefrontSectionTitleWrapClass}>
						<p className={storefrontSectionEyebrowClass}>Información legal</p>
						<h1 className={storefrontSectionTitleClass}>★ Términos y Condiciones ★</h1>
						<p className="max-w-3xl text-base text-slate-600 sm:text-lg">
							Última actualización: {new Date().toLocaleDateString('es-PE', {
								day: '2-digit',
								month: 'long',
								year: 'numeric',
							})}
						</p>
					</div>

					<div className={`${HIGHLIGHT_CARD} space-y-6`}>
						<p className="rounded-2xl bg-[#1f2a9b]/5 p-5 text-[#1f2a9b] border border-[#1f2a9b]/10 font-medium leading-relaxed">
							Al marcar la casilla de aceptación durante el proceso de compra, confirmas que
							has leído, comprendido y aceptas íntegramente los presentes Términos y
							Condiciones, así como la Política de Privacidad de Sobrao Vape Store.
						</p>

						<h2 className={H2}>1. Identidad del proveedor</h2>
						<p className={P}>
							<strong>Sobrao Vape Store</strong> (en adelante, <em>«nosotros»</em> o{' '}
							<em>«la tienda»</em>) es una tienda especializada en productos para vapeo
							adultos. Operamos a través de la plataforma web y canales oficiales de atención.
							Para cualquier consulta, contáctanos a través de WhatsApp, correo electrónico o
							nuestras redes sociales oficiales.
						</p>

						<h2 className={H2}>2. Condición de usuario mayor de edad</h2>
						<p className={P}>
							<strong>ADVERTENCIA EXCLUSIVA PARA MAYORES DE EDAD:</strong> Los productos de
							esta tienda están destinados ÚNICAMENTE a personas mayores de 18 años o la
							mayoría de edad aplicable en tu jurisdicción. Al realizar una compra declaras
							bajo juramento que cumples con este requisito.
						</p>
						<p className={P}>
							Nos reservamos el derecho de solicitar documento de identidad que acredite la
							edad del comprador antes de confirmar el despacho, así como de cancelar el
							pedido si no es posible verificarla.
						</p>

						<h2 className={H2}>3. Productos, precios y disponibilidad</h2>
						<ul className={UL}>
							<li className={LI}>
								Todos los precios mostrados en la tienda están expresados en{' '}
								<strong>Soles Peruanos (PEN)</strong> e incluyen todos los impuestos
								aplicables, salvo indicación expresa en contrario.
							</li>
							<li className={LI}>
								Los costos de envío son calculados y mostrados antes de finalizar la compra
								según distrito, provincia o departamento de entrega.
							</li>
							<li className={LI}>
								La disponibilidad de stock se actualiza en tiempo real; sin embargo, en casos
								excepcionales de desajuste de inventario, te notificaremos y ofreceremos
								cambio por variante equivalente, devolución íntegra o crédito a favor.
							</li>
							<li className={LI}>
								Nos reservamos el derecho de modificar precios, promociones y especificaciones
								de productos sin previo aviso, siempre que no afecte pedidos ya confirmados.
							</li>
						</ul>

						<h2 className={H2}>4. Proceso de compra y método de pago (Yape)</h2>
						<p className={P}>
							Actualmente aceptamos como método de pago principal <strong>Yape</strong>. El
							proceso de compra es el siguiente:
						</p>
						<ol className="list-decimal space-y-2 pl-6 text-slate-700 mb-4">
							<li className={LI}>Seleccionas productos y avanzas al checkout.</li>
							<li className={LI}>
								Ingresas tus datos de contacto, dirección de envío y aceptas los términos.
							</li>
							<li className={LI}>
								Generas el pedido: el sistema reserva el stock y muestra la cuenta Yape para
								que realices la transferencia.
							</li>
							<li className={LI}>
								Adjunta tu comprobante de pago Yape con el número de operación correcto.
							</li>
							<li className={LI}>
								Nuestro equipo <strong>verifica manualmente</strong> el comprobante y aprueba
								o rechaza el pago, usualmente en pocos minutos durante horario de atención.
							</li>
						</ol>

						<h3 className={H3}>4.1 Pago rechazado o no verificado</h3>
						<ul className={UL}>
							<li className={LI}>
								Si el comprobante no corresponde al monto, número de operación es ilegible,
								duplicado o pertenece a otra operación, el pago será marcado como{' '}
								<strong>rechazado</strong> y te contactaremos para subsanarlo.
							</li>
							<li className={LI}>
								Si después de <strong>24 horas hábiles</strong> no recibimos comprobante
								válido, el pedido será cancelado automáticamente y el stock reservado
								liberado.
							</li>
							<li className={LI}>
								No liberamos stock ni realizamos despacho sin aprobación escrita del pago
								por parte de nuestro equipo.
							</li>
						</ul>

						<h2 className={H2}>5. Envíos y entregas</h2>
						<ul className={UL}>
							<li className={LI}>
								Realizamos envíos a nivel nacional (Perú) a través de courier autorizado.
							</li>
							<li className={LI}>
								Los <strong>tiempos de entrega estimados</strong> son orientativos y se
								cuentan a partir del despacho: Lima Metropolitana 24-72 h hábiles; Provincias
								3-7 días hábiles.
							</li>
							<li className={LI}>
								Los retrasos imputables al courier, movilizaciones, paros, desastres
								naturales u otras causas de fuerza mayor no son responsabilidad de la
								tienda; en esos casos hacemos seguimiento activo y mantenemos comunicación
								con el cliente.
							</li>
							<li className={LI}>
								<strong>Dirección errada:</strong> es responsabilidad del comprador verificar
								la dirección antes de confirmar. Si el courier retorna el paquete por
								dirección incorrecta o destinatario no encontrado, el costo de re-envío corre
								por cuenta del cliente.
							</li>
							<li className={LI}>
								Al momento de la recepción, <strong>revisa el paquete IN SITU frente al
								repartidor</strong>. Si el embalaje presenta golpes, rasgaduras o apertura
								evidente, marca «recepción observada» o rechaza la entrega. Después de la
								firma no se aceptan reclamos por daños de transporte.
							</li>
						</ul>

						<h2 className={H2}>6. Cambios, devoluciones y garantía</h2>
						<h3 className={H3}>6.1 Derecho de desistimiento (Código de Defensa del Consumidor)</h3>
						<p className={P}>
							Tienes derecho a desistir de la compra dentro de los <strong>7 días
							naturales</strong> siguientes a la recepción, siempre que el producto se
							encuentre en perfecto estado, sin uso, con empaque original y sellos de
							fábrica intactos. El costo de retorno corre por cuenta del cliente.
						</p>

						<h3 className={H3}>6.2 Productos defectuosos</h3>
						<p className={P}>
							Si recibes un producto con falla de fábrica notifícanos dentro de las{' '}
							<strong>primeras 48 horas hábiles</strong> posteriores a la recepción con
							fotos, video del defecto y número de pedido. Evaluamos el caso y procedemos
							según corresponda: reemplazo, cambio por valor equivalente o devolución íntegra
							incluyendo costo de envío de retorno.
						</p>

						<h3 className={H3}>6.3 Exclusiones</h3>
						<p className={P}>
							NO se aceptan cambios ni devoluciones en los siguientes supuestos por ser
							productos de consumo personal sellados: líquidos (e-juices), pods sellados,
							resistencias (coils), algodones y accesorios desechables una vez abiertos,
							salvo falla de fábrica comprobada.
						</p>

						<h2 className={H2}>7. Cancelaciones</h2>
						<ul className={UL}>
							<li className={LI}>
								Puedes solicitar la cancelación de tu pedido <strong>antes de que haya sido
								despachado</strong> sin penalización.
							</li>
							<li className={LI}>
								Si el pago ya fue aprobado, el reembolso se procesa en un plazo de hasta{' '}
								<strong>10 días hábiles</strong> a través del mismo medio de pago.
							</li>
							<li className={LI}>
								Nos reservamos el derecho de cancelar pedidos con indicios de fraude, uso de
								datos falsos o violación de estos términos.
							</li>
						</ul>

						<h2 className={H2}>8. Propiedad intelectual</h2>
						<p className={P}>
							Todos los logos, nombres comerciales, fotografías de productos, descripciones,
							diseños y demás contenidos del sitio web son propiedad exclusiva de Sobrao
							Vape Store o de sus licenciantes. Queda estrictamente prohibida su reproducción
							total o parcial sin autorización escrita previa.
						</p>

						<h2 className={H2}>9. Atención al cliente y reclamaciones</h2>
						<p className={P}>
							Canales oficiales de atención: WhatsApp oficial visible en la web, correo de
							contacto registrado, redes sociales oficiales y mensaje interno tras haber
							iniciado sesión en la plataforma. Libro de Reclamaciones virtual disponible a
							solicitud del cliente según normativa vigente.
						</p>

						<h2 className={H2}>10. Modificación de los términos</h2>
						<p className={P}>
							Nos reservamos el derecho de actualizar estos Términos y Condiciones en
							cualquier momento. Cualquier modificación entrará en vigor desde su publicación
							en esta página. Las compras realizadas con anterioridad se rigen por la versión
							vigente al momento de la confirmación del pedido.
						</p>

						<h2 className={H2}>11. Jurisdicción y ley aplicable</h2>
						<p className={P}>
							Estos Términos y Condiciones se rigen por las leyes de la República del Perú.
							Cualquier controversia que no pueda ser resuelta de manera amistosa será
							sometida a las autoridades competentes del domicilio del proveedor, sin
							perjuicio de las disposiciones imperativas del Código de Defensa del
							Consumidor.
						</p>

						<div className="mt-10 rounded-2xl bg-gradient-to-r from-[#1f2a9b]/10 via-amber-400/10 to-emerald-500/10 p-6 text-[#1f2a9b] border border-white/70">
							<p className="font-black mb-2 text-lg">📌 Resumen rápido para tu compra</p>
							<ul className="list-disc pl-6 space-y-1 text-sm">
								<li>✅ +18 años solo · Pago Yape verificación manual</li>
								<li>✅ Stock reservado al generar pedido · Cancelación si no pagas en 24h</li>
								<li>✅ Revisa paquete frente al repartidor antes de firmar</li>
								<li>✅ 7 días para desistimiento · 48h reportar fallas de fábrica</li>
							</ul>
						</div>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	)
}
