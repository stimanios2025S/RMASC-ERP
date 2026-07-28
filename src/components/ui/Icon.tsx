// ─── RMASC FACTORY — Professional SVG Icon Library ─────────────────────
// Zero dependencies, pure SVG paths. Replace all emojis in the app.
// Each icon is a carefully crafted 24x24 SVG with 1.5px stroke.

interface IconProps {
  name: string
  className?: string
}

const S = { strokeWidth: 1.5 as const, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export default function Icon({ name, className = 'w-5 h-5' }: IconProps) {
  const baseProps = { className, ...S }
  switch (name) {
    // ── Navigation ─────────────────────────────────────────────────────
    case 'LayoutDashboard': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
    case 'ListTodo': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/></svg>
    case 'Settings': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
    case 'HelpCircle': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    case 'LogOut': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
    case 'Search': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    case 'Plus': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    case 'Check': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
    case 'CheckSquare': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    case 'X': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>

    // ── Money & Business ────────────────────────────────────────────────
    case 'DollarSign': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    case 'BarChart3': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><line x1="4" y1="20" x2="4" y2="10"/><line x1="9" y1="20" x2="9" y2="6"/><line x1="14" y1="20" x2="14" y2="12"/><line x1="19" y1="20" x2="19" y2="8"/></svg>
    case 'FileText': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
    case 'FileCheck': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>
    case 'FolderOpen': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="2" y1="15" x2="22" y2="15"/></svg>
    case 'Package': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M16.5 9.4 7.55 4.24a1 1 0 0 0-1.1 0L3 6.5"/><polyline points="21 16 12 21 3 16 3 8 12 3 21 8 21 12"/><line x1="12" y1="21" x2="12" y2="11.5"/></svg>
    case 'TrendingUp': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
    case 'Receipt': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>

    // ── Industrial / Manufacturing ───────────────────────────────────────
    case 'Factory': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M2 20V8a2 2 0 0 1 2-2h2v12"/><path d="M6 20V6a2 2 0 0 1 2-2h2v16"/><path d="M10 20V4a2 2 0 0 1 2-2h2v18"/><path d="M14 20v-8a2 2 0 0 1 2-2h4v10"/><path d="M2 20h20"/></svg>
    case 'Warehouse': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="6" x="6" y="10"/></svg>
    case 'Wrench': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    case 'HardHat': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M2 18v1c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-1"/><path d="M6 14V6a6 6 0 0 1 12 0v8"/><rect x="2" y="14" width="20" height="4" rx="2"/></svg>
    case 'Tool': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
    case 'Truck': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h3l3 3v5h-6V8Z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
    case 'ClipboardCheck': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="9 14 11 16 15 12"/></svg>
    case 'Ruler': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M16 2v20M4 12h12M4 8h8M4 16h10M2 6v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
    case 'Zap': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    case 'Activity': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>

    // ── Users & Access ──────────────────────────────────────────────────
    case 'Users': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    case 'UserCheck': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 9 19 11 22 6"/></svg>
    case 'Shield': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>

    // ── Notifications & Alerts ───────────────────────────────────────────
    case 'Bell': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
    case 'AlertCircle': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    case 'InfoIcon': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>

    // ── Media & Files ───────────────────────────────────────────────────
    case 'Download': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    case 'Upload': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
    case 'PDF': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"/><polyline points="14 2 14 8 20 8"/><path d="M8 15h8"/><path d="M8 11h5"/><path d="M8 19h3"/></svg>
    case 'Printer': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    case 'Image': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>

    // ── Arrows & Navigation ──────────────────────────────────────────────
    case 'ArrowUp': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
    case 'ArrowLeft': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
    case 'ArrowRight': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    case 'ChevronLeft': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><polyline points="15 18 9 12 15 6"/></svg>
    case 'ChevronRight': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><polyline points="9 18 15 12 9 6"/></svg>
    case 'ChevronDown': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><polyline points="6 9 12 15 18 9"/></svg>
    case 'ChevronUp': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><polyline points="18 15 12 9 6 15"/></svg>
    case 'ExternalLink': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>

    // ── Misc ────────────────────────────────────────────────────────────
    case 'Code2': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
    case 'Calendar': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
    case 'Clock': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    case 'Globe': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
    case 'Mail': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
    case 'Phone': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
    case 'MapPin': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
    case 'Layers': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>
    case 'Compass': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
    case 'GitMerge': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>
    case 'Play': return <svg {...baseProps} viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
    case 'Pause': return <svg {...baseProps} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
    case 'Stop': return <svg {...baseProps} viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
    case 'MoreHorizontal': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
    case 'Sun': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    case 'Moon': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    case 'RefreshCw': return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>

    default: return <svg {...baseProps} viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  }
}
