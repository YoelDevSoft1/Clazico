import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/legal-page';
import { privacyPolicyContent } from '@/lib/legal-content';

export const metadata: Metadata = {
  title: 'Políticas de Privacidad',
  description:
    'Políticas de privacidad de Clazico Store para compras, pagos, entregas, garantías y soporte en Venezuela.',
};

export default function PrivacyPolicyPage() {
  return <LegalPage content={privacyPolicyContent} />;
}

