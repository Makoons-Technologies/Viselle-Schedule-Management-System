import { marketingSeo } from '@/content/marketing-seo';
import privacyMarkdown from '@/content/privacy.md?raw';
import { LegalDocumentPage } from '@/pages/public/LegalDocumentPage';

export function PrivacyPage() {
  return <LegalDocumentPage seo={marketingSeo.privacy} crumb="Privacy Policy" markdown={privacyMarkdown} />;
}
