import { SellerShell } from '@/features/seller/components/SellerShell'
import { SellerAuthGate } from '@/providers/auth-provider'

export default function SellerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SellerAuthGate><SellerShell>{children}</SellerShell></SellerAuthGate>
}
