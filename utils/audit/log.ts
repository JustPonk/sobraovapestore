import 'server-only'

import { createAdminClient } from '@/utils/supabase/admin'

export interface AuditEntryInput {
	userId: string | null
	action: 'create' | 'update' | 'delete'
	resourceType: string
	resourceId?: string | null
	diff?: {
		old?: Record<string, unknown> | null
		new?: Record<string, unknown> | null
	} | null
	note?: string | null
}

export async function logAudit(entry: AuditEntryInput): Promise<void> {
	try {
		const supabase = createAdminClient()

		await supabase.from('audit_logs').insert({
			user_id: entry.userId,
			action: entry.action,
			table_name: entry.resourceType,
			record_id: entry.resourceId ?? null,
			old_data: entry.diff?.old ?? null,
			new_data: entry.diff?.new ?? null,
		})
	} catch {
		// Audit is best-effort, never block the primary flow.
	}
}
