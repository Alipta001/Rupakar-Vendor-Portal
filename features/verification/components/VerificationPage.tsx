'use client'

import { Check, ChevronRight, FileCheck2, Settings, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { View } from '@/features/seller/types/view.types'

export function VerificationPage({ setView }: { setView: (view: View) => void }) {
  const checks = ['Identity verification', 'Business details', 'Bank account', 'Tax information']
  return <><PageHeader eyebrow="Trust & safety" title="Seller verification" description="Keep your business details current so customers can shop with confidence." action={<button className="secondary-button" onClick={() => setView('settings')}><Settings /> Account settings</button>} /><div className="verification-layout"><section className="panel verification-hero"><div className="verified-seal"><ShieldCheck /></div><div><StatusBadge tone="success">Verified seller</StatusBadge><h2>Atelier Bengal is verified</h2><p>Your identity and business details were approved on 18 September 2026. Your store is eligible to sell and receive payouts.</p></div></section><section className="panel verification-checklist"><div className="panel-heading"><div><h2>Verification checklist</h2><p>All required checks are complete.</p></div><span className="progress-pill">4 of 4 complete</span></div><div className="check-list">{checks.map((check) => <div key={check}><Check className="check-done" /><span><b>{check}</b><small>Verified and up to date</small></span><StatusBadge tone="success">Complete</StatusBadge></div>)}</div></section><section className="panel verification-note"><div className="note-icon"><FileCheck2 /></div><div><h2>Need to update something?</h2><p>Changing your legal name, bank account, or tax details may start a new review.</p><button className="secondary-button" onClick={() => setView('support')}>Contact seller support <ChevronRight /></button></div></section></div></>
}
