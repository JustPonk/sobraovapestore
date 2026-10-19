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
	title: 'Política de Privacidad | Sobrao Vape Store',
	description:
		'Política de Privacidad y protección de datos personales conforme Ley 29733 del Perú. Qué datos guardamos, para qué, cuánto tiempo y tus derechos ARSUL.',
}

const HIGHLIGHT_CARD =
	'rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_10px_40px_-12px_rgba(31,42,155,0.15)] backdrop-blur-sm sm:p-8'

const H2 =
	'mt-10 mb-4 text-2xl font-black uppercase tracking-[0.02em] text-[#1f2a9b] sm:text-3xl'

const H3 = 'mt-6 mb-2 text-lg font-bold text-slate-900'

const P = 'mb-3 text-slate-700 leading-relaxed'

const UL = 'mb-4 list-disc space-y-2 pl-6 text-slate-700'
const LI = 'leading-relaxed'

export default function PrivacyPage() {
	return (
		<div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(143,104,255,0.16),transparent_28%),linear-gradient(180deg,#f9f8ff_0%,#f5f3ff_40%,#ffffff_100%)] text-slate-900">
			<div className="fixed inset-x-0 top-0 z-[60]">
				<Navbar />
			</div>

			<main className="pt-28 sm:pt-32">
				<section className={`${storefrontFrameClass} space-y-8 py-10 sm:space-y-10 sm:py-14`}>
					<div className={storefrontSectionTitleWrapClass}>
						<p className={storefrontSectionEyebrowClass}>Información legal</p>
						<h1 className={storefrontSectionTitleClass}>★ Política de Privacidad ★</h1>
						<p className="max-w-3xl text-base text-slate-600 sm:text-lg">
							Cumplimiento Ley N.º 29733, Ley de Protección de Datos Personales (LOPD) ·
							Reglamento aprobado por Decreto Supremo N.º 003-2013-JUS · Última actualización:{' '}
							{new Date().toLocaleDateString('es-PE', {
								day: '2-digit',
								month: 'long',
								year: 'numeric',
							})}
						</p>
					</div>

					<div className={`${HIGHLIGHT_CARD} space-y-6`}>
						<p className="rounded-2xl bg-[#1f2a9b]/5 p-5 text-[#1f2a9b] border border-[#1f2a9b]/10 font-medium leading-relaxed">
							En Sobrao Vape Store tu privacidad es prioridad. Nunca enviamos spam, nunca
							vendemos tus datos y solo usamos la información estrictamente necesaria para
							procesar tu compra y enviarte las actualizaciones de tu pedido (como acordamos
							en el checkout).
						</p>

						<h2 className={H2}>1. Titular del tratamiento de datos</h2>
						<p className={P}>
							El <strong>Titular del Tratamiento de Datos Personales</strong> es{' '}
							<strong>Sobrao Vape Store</strong>. Toda solicitud sobre tus datos debe ser
							dirigida a través de los canales oficiales: WhatsApp oficial, correo de
							contacto registrado o mensaje interno en la plataforma.
						</p>

						<h2 className={H2}>2. Principios generales aplicables</h2>
						<ul className={UL}>
							<li className={LI}>
								<strong>Licitud, equidad y transparencia:</strong> tratamos tus datos solo con
								base legal válida y te informamos previamente de cada tratamiento.
							</li>
							<li className={LI}>
								<strong>Finalidad limitada:</strong> tus datos se usan solo para las
								finalidades que te informamos, no para otros usos incompatibles.
							</li>
							<li className={LI}>
								<strong>Minimización de datos:</strong> solo recolectamos lo estrictamente
								necesario para procesar tu pedido.
							</li>
							<li className={LI}>
								<strong>Exactitud:</strong> mantenemos tus datos actualizados y te damos
								acceso para corregirlos.
							</li>
							<li className={LI}>
								<strong>Limitación del plazo:</strong> conservamos los datos solo el tiempo
								legalmente requerido.
							</li>
							<li className={LI}>
								<strong>Integridad y confidencialidad:</strong> medidas técnicas y
								organizativas para proteger tus datos contra accesos no autorizados.
							</li>
							<li className={LI}>
								<strong>Responsabilidad:</strong> mantenemos registro de actividades de
								tratamiento y demostramos cumplimiento ante la autoridad competente.
							</li>
						</ul>

						<h2 className={H2}>3. Datos que recolectamos y por qué</h2>

						<h3 className={H3}>3.1 Datos que nos proporcionas voluntariamente</h3>
						<ul className={UL}>
							<li className={LI}>
								<div>
									<span className="font-bold text-[#1f2a9b]">Registro de cuenta:</span> nombre
									completo, correo electrónico, contraseña en formato hash irreversible.
								</div>
								<div className="text-sm text-slate-500 mt-1">
									📌 Finalidad: identificarte como cliente, guardar tus direcciones, mostrar
									historial de pedidos y permitirte ver el estado del envío.
								</div>
							</li>
							<li className={LI}>
								<div>
									<span className="font-bold text-[#1f2a9b]">Checkout pedido invitado o con
									cuenta:</span> nombre del destinatario, teléfono de contacto, correo
									electrónico, dirección exacta (calle, número, intersección, referencia,
									distrito, provincia, departamento).
								</div>
								<div className="text-sm text-slate-500 mt-1">
									📌 Finalidad: preparar y despachar el pedido al courier correcto, contactarte
									para avisarte <strong>aprobación/rechazo de pago Yape</strong>,{' '}
									<strong>salida de pedido para reparto</strong> y{' '}
									<strong>confirmación de entrega</strong>.
								</div>
							</li>
							<li className={LI}>
								<div>
									<span className="font-bold text-[#1f2a9b]">Comprobante de pago Yape:</span>{' '}
									número de operación y captura del comprobante.
								</div>
								<div className="text-sm text-slate-500 mt-1">
									📌 Finalidad: verificación manual de la transacción antes del despacho.
								</div>
							</li>
						</ul>

						<h3 className={H3}>3.2 Datos recolectados automáticamente con tu consentimiento</h3>
						<ul className={UL}>
							<li className={LI}>
								<div>
									<span className="font-bold text-[#1f2a9b]">Marca de tiempo de
									consentimiento:</span> <code>terms_accepted_at</code> y{' '}
									<code>privacy_accepted_at</code> (momento exacto UTC en que aceptaste los
									términos).
								</div>
								<div className="text-sm text-slate-500 mt-1">
									📌 Finalidad: prueba legal fehaciente del consentimiento inequívoco e
									activo ante eventuales reclamos administrativos (INDECOPI).
								</div>
							</li>
							<li className={LI}>
								<div>
									<span className="font-bold text-[#1f2a9b]">Dirección IP y User-Agent:</span>{' '}
									dirección IP pública del dispositivo y descripción de navegador / sistema
									operativo.
								</div>
								<div className="text-sm text-slate-500 mt-1">
									📌 Finalidad: prevención de fraude, anti-bot, límite de tasa de pedidos por
									IP y auditoría de seguridad.
								</div>
							</li>
						</ul>

						<h3 className={H3}>3.3 Datos de sesión invitado</h3>
						<p className={P}>
							Si compras sin cuenta registrada (modo invitado), guardamos un identificador
							aleatorio en una cookie de sesión segura (<code>HttpOnly</code>,{' '}
							<code>Secure</code>, <code>SameSite=Lax</code>) para asociar tu carrito con
							tu pedido. <strong>NO creamos usuarios en el sistema de autenticación sin tu
							consentimiento explícito</strong>. Tu correo solo queda guardado como dato de
							contacto dentro del historial del pedido.
						</p>

						<h2 className={H2}>4. Bases legales del tratamiento</h2>
						<p className={P}>
							Cada tratamiento de datos se realiza sobre una base legal válida conforme al
							artículo 8 de la Ley 29733:
						</p>
						<ul className={UL}>
							<li className={LI}>
								<strong>Consentimiento expreso del titular (art. 18.1 LOPD):</strong>{' '}
								marcación del checkbox «Acepto la Política de Privacidad» NO pre-marcado.
							</li>
							<li className={LI}>
								<strong>Ejecución de contrato (art. 18.2 LOPD):</strong> tratamiento necesario
								para la compraventa, cobro y despacho del pedido.
							</li>
							<li className={LI}>
								<strong>Cumplimiento obligación legal (art. 18.3 LOPD):</strong> conservación
								de registros contables, tributarios y Libro de Reclamaciones.
							</li>
							<li className={LI}>
								<strong>Interés legítimo (art. 18.5 LOPD):</strong> seguridad anti-fraude en
								pagos manuales Yape y prevención de abusos de reservas.
							</li>
						</ul>

						<h2 className={H2}>5. ¿Con quién compartimos tus datos?</h2>
						<p className={P}>
							Solo compartimos datos con <strong>encargados de tratamiento</strong> estrictamente
							necesarios y bajo contrato de confidencialidad conforme al artículo 10 LOPD:
						</p>
						<ul className={UL}>
							<li className={LI}>
								<strong>Courier / transportista:</strong> nombre destinatario, teléfono y
								dirección de entrega EXCLUSIVAMENTE para el despacho físico.
							</li>
							<li className={LI}>
								<strong>Proveedor infraestructura cloud (Supabase):</strong> alojamiento
								seguro de base de datos con cifrado en reposo.
							</li>
							<li className={LI}>
								<strong>Servicio de almacenamiento de imágenes (Storage):</strong> solo
								comprobantes Yape adjuntos, acotados temporalmente.
							</li>
							<li className={LI}>
								<strong>Proveedor anti-bot (Google reCAPTCHA Enterprise):</strong> token de
								verificación anónima y dirección IP para evaluación de riesgo score-based,
								según política de privacidad de Google LLC.
							</li>
						</ul>
						<p className={P}>
							<strong>NO vendemos, alquilamos ni compartimos listas de clientes con terceros
							comerciales de ningún tipo.</strong>
						</p>

						<h2 className={H2}>6. Transferencia internacional de datos</h2>
						<p className={P}>
							Algunos de nuestros encargados de tratamiento (Supabase Inc., Google LLC)
							pueden procesar datos en centros de datos ubicados fuera de Perú. Estas
							transferencias se realizan <strong>exclusivamente</strong> con países que
							cuentan con nivel adecuado de protección o con las garantías apropiadas
							(Cláusulas Estándar de Contrato aprobadas por MINJUSDH / Comisión Europea
							según corresponda).
						</p>

						<h2 className={H2}>7. Plazos de conservación</h2>
						<ul className={UL}>
							<li className={LI}>
								<strong>Pedidos y datos de contacto ligados:</strong> mínimo{' '}
								<strong>5 años</strong> a contar desde la fecha de entrega (prescripción
								acciones contractuales civiles) o más si hay obligación tributaria o
								documental vigente.
							</li>
							<li className={LI}>
								<strong>Marca de consentimiento legal (terms + privacy accepted):</strong>
								mínimo <strong>5 años</strong> desde la operación (defensa administrativa).
							</li>
							<li className={LI}>
								<strong>Comprobantes de pago / facturación:</strong> conforme plazo legal
								tributario peruano.
							</li>
							<li className={LI}>
								<strong>Cuenta de usuario registrada:</strong> mientras la cuenta esté activa;
								después del ejercicio de supresión, bloqueamos durante 30 días y luego
								eliminamos irreversiblemente, salvo datos de obligatorio resguardo legal.
							</li>
						</ul>

						<h2 className={H2}>8. Seguridad técnica y organizativa</h2>
						<p className={P}>
							Aplicamos medidas conformes a la normativa para evitar la pérdida, mal uso,
							alteración o acceso no autorizado:
						</p>
						<ul className={UL}>
							<li className={LI}>Conexión cifrada SSL/TLS en todo el sitio web.</li>
							<li className={LI}>
								Contraseñas almacenadas con algoritmos de derivación de clave fuertes (hash
								salados + factor de costo elevado), nunca en texto plano.
							</li>
							<li className={LI}>
								Autenticación de dos pasos (2FA) habilitada en cuenta administrativa.
							</li>
							<li className={LI}>
								Acceso a base de datos por medio de RLS (Row-Level Security) de Supabase:
								cada usuario solo puede leer sus propios pedidos y direcciones.
							</li>
							<li className={LI}>
								Rate limit + reCAPTCHA Enterprise v3 para mitigar bots en checkout y envío
								de comprobantes.
							</li>
							<li className={LI}>
								Personal autorizado con capacitación anual sobre protección de datos.
							</li>
						</ul>

						<h2 className={H2}>9. Tus derechos ARSUL (y un derecho extra)</h2>
						<p className={P}>
							Como titular de datos personales, puedes ejercer en cualquier momento los
							derechos reconocidos por la Ley 29733, respondiendo siempre{' '}
							<strong>sin costo y en máximo 15 días hábiles</strong>:
						</p>
						<dl className="grid gap-4 sm:grid-cols-2 mb-6">
							<div className="rounded-2xl bg-white/70 p-5 border border-slate-100">
								<dt className="font-black text-[#1f2a9b] uppercase tracking-wide mb-2">
									(A) Acceso
								</dt>
								<dd className="text-sm text-slate-700 leading-relaxed">
									Solicitar copia de todos los datos personales que tenemos almacenados sobre
									ti, así como las finalidades y destinatarios.
								</dd>
							</div>
							<div className="rounded-2xl bg-white/70 p-5 border border-slate-100">
								<dt className="font-black text-[#1f2a9b] uppercase tracking-wide mb-2">
									(R) Rectificación
								</dt>
								<dd className="text-sm text-slate-700 leading-relaxed">
									Corregir datos inexactos, incompletos o desactualizados (teléfono,
									dirección, correo).
								</dd>
							</div>
							<div className="rounded-2xl bg-white/70 p-5 border border-slate-100">
								<dt className="font-black text-[#1f2a9b] uppercase tracking-wide mb-2">
									(S) Supresión (Derecho al Olvido)
								</dt>
								<dd className="text-sm text-slate-700 leading-relaxed">
									Solicitar eliminación de tus datos cuando ya no sean necesarios para la
									finalidad original, salvo resguardo de obligación legal.
								</dd>
							</div>
							<div className="rounded-2xl bg-white/70 p-5 border border-slate-100">
								<dt className="font-black text-[#1f2a9b] uppercase tracking-wide mb-2">
									(U) Oposición
								</dt>
								<dd className="text-sm text-slate-700 leading-relaxed">
									Oponerte a tratamientos basados en interés legítimo cuando existan motivos
									personales fundados.
								</dd>
							</div>
							<div className="rounded-2xl bg-white/70 p-5 border border-slate-100">
								<dt className="font-black text-[#1f2a9b] uppercase tracking-wide mb-2">
									(L) Limitación del tratamiento
								</dt>
								<dd className="text-sm text-slate-700 leading-relaxed">
									Solicitar que suspendamos el tratamiento mientras resolvemos una
									reclamación o impugnación sobre exactitud / licitud.
								</dd>
							</div>
							<div className="rounded-2xl bg-white/70 p-5 border border-slate-100">
								<dt className="font-black text-[#1f2a9b] uppercase tracking-wide mb-2">
									Portabilidad de datos
								</dt>
								<dd className="text-sm text-slate-700 leading-relaxed">
									Recibir tus datos personales en formato estructurado, de uso común y lectura
									mecánica (JSON / CSV), o transmitirlos directamente a otro responsable si
									técnicamente es viable.
								</dd>
							</div>
							<div className="rounded-2xl bg-white/70 p-5 border border-slate-100 sm:col-span-2">
								<dt className="font-black text-[#1f2a9b] uppercase tracking-wide mb-2">
									Retiro del consentimiento
								</dt>
								<dd className="text-sm text-slate-700 leading-relaxed">
									Si en algún momento te opones a seguir recibiendo comunicaciones de estado
									de envío por correo electrónico, puedes manifestarlo libremente; el retiro
									no afecta la licitud de tratamientos anteriores ya ejecutados.
								</dd>
							</div>
						</dl>

						<h3 className={H3}>9.1 ¿Cómo ejercer tus derechos?</h3>
						<ol className="list-decimal space-y-2 pl-6 text-slate-700 mb-4">
							<li className={LI}>
								Contáctanos vía WhatsApp oficial o correo registrado con asunto{' '}
								<strong>«Ejercicio de derechos ARSUL»</strong>.
							</li>
							<li className={LI}>
								Adjunta copia simple de DNI, pasaporte o carné de extranjería para verificar
								la titularidad.
							</li>
							<li className={LI}>
								Especifica claramente qué derecho quieres ejercer y detalla el alcance de la
								solicitud.
							</li>
							<li className={LI}>
								Responderemos por escrito en máximo 15 días hábiles, con opción de prórroga
								justificada de otros 15 días según el artículo 31 LOPD.
							</li>
						</ol>
						<p className={P}>
							Si consideras que no hemos atendido tu solicitud adecuadamente, puedes
							interponer reclamo o denuncia ante la <strong>Autoridad Nacional de Protección
							de Datos Personales del Ministerio de Justicia y Derechos Humanos</strong>.
						</p>

						<h2 className={H2}>10. Cookies y tecnologías similares</h2>
						<p className={P}>
							Usamos únicamente cookies estrictamente necesarias para el funcionamiento de
							la tienda (carrito, sesión invitado, autorización de cuenta). No utilizamos
							cookies de publicidad comportamental, ni píxeles de remarketing sin tu
							consentimiento expreso previo.
						</p>

						<h2 className={H2}>11. Menores de edad</h2>
						<p className={P}>
							Nuestros servicios NO están dirigidos a menores de 18 años. Si detectamos
							que una cuenta fue registrada por un menor sin consentimiento del
							representante legal, procederemos a su inmediata cancelación y supresión de
							datos.
						</p>

						<h2 className={H2}>12. Incumplimiento y notificación de brechas</h2>
						<p className={P}>
							En caso de producirse cualquier incidente de seguridad que pueda afectar tus
							datos, procederemos a: (a) contener el incidente; (b) evaluar el riesgo para
							los derechos y libertades de los titulares; (c) notificarlo a la Autoridad
							Nacional de Protección de Datos en máximo 72 horas cuando exista riesgo alto;
							(d) comunicarte directamente el hecho con las recomendaciones de mitigación si
							es probable un impacto adverso alto.
						</p>

						<h2 className={H2}>13. Actualizaciones de esta política</h2>
						<p className={P}>
							Podemos actualizar esta Política de Privacidad en cualquier momento por
							cumplimiento normativo o cambios operativos. La versión vigente es siempre la
							publicada en esta página, indicada con fecha de última actualización. Si los
							cambios son materiales y afectan tus derechos, te avisaremos por correo o
							aviso destacado en la web antes de su entrada en vigor.
						</p>

						<div className="mt-10 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-[#1f2a9b]/10 to-amber-400/10 p-6 text-[#1f2a9b] border border-white/70">
							<p className="font-black mb-2 text-lg">🔒 Resumen en 1 minuto</p>
							<ul className="list-disc pl-6 space-y-1 text-sm">
								<li>🤫 No spam, no venta de datos, solo lo necesario.</li>
								<li>📧 Tu correo lo usamos SÓLO para: pago aprobado/rechazado · pedido en
									reparto · pedido entregado.</li>
								<li>👮 Registro exacto de tu consentimiento + IP + UA para defensa legal (INDECOPI).</li>
								<li>🛡️ TLS + RLS + contraseñas hash + 2FA admin.</li>
								<li>⚖️ Tus derechos ARSUL siempre, sin costo, respuesta en 15 días.</li>
							</ul>
						</div>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	)
}
