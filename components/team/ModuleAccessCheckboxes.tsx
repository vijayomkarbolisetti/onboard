'use client'

import { MODULE_DEFS, type ModuleId, type ModulePermission } from '@/lib/modulePermissions'
import { cn } from '@/lib/utils'

type Props = {
  access: Record<ModuleId, ModulePermission>
  onChange: (next: Record<ModuleId, ModulePermission>) => void
  disabled?: boolean
  className?: string
}

export function ModuleAccessCheckboxes({ access, onChange, disabled, className }: Props) {
  const toggle = (id: ModuleId, field: 'view' | 'write') => {
    const current = access[id] ?? { view: false, write: false }
    if (field === 'view') {
      const view = !current.view
      onChange({
        ...access,
        [id]: { view, write: view ? current.write : false },
      })
      return
    }
    const write = !current.write
    onChange({
      ...access,
      [id]: { view: write ? true : current.view, write: id === 'team' ? false : write },
    })
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border border-theme', className)}>
      <table className="w-full text-left text-xs">
        <thead className="bg-theme-elevated text-theme-muted">
          <tr>
            <th className="px-3 py-2 font-semibold">Module</th>
            <th className="px-3 py-2 font-semibold">View</th>
            <th className="px-3 py-2 font-semibold">Upload / Edit</th>
          </tr>
        </thead>
        <tbody>
          {MODULE_DEFS.map((mod) => {
            const perm = access[mod.id] ?? { view: false, write: false }
            const writeDisabled = disabled || mod.id === 'team'
            return (
              <tr key={mod.id} className="border-t border-theme">
                <td className="px-3 py-2 text-theme-fg">{mod.label}</td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={perm.view}
                    disabled={disabled}
                    onChange={() => toggle(mod.id, 'view')}
                    className="h-4 w-4 accent-aqua"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={perm.write}
                    disabled={writeDisabled}
                    onChange={() => toggle(mod.id, 'write')}
                    className={cn('h-4 w-4 accent-aqua', writeDisabled && 'opacity-40')}
                    title={
                      mod.id === 'team'
                        ? 'Team management is admin-only'
                        : 'Create, edit, delete, import, upload'
                    }
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
