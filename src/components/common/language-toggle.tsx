import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export function LanguageToggle() {
  const { language, setLanguage } = useTranslation();
  const nextLanguage = language === 'id' ? 'en' : 'id';
  const label = language === 'id' ? 'Indonesia' : 'English';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(nextLanguage)}
      title={`Language: ${label}`}
      aria-label={`Switch language to ${nextLanguage === 'id' ? 'Indonesia' : 'English'}`}
      className="h-8 gap-1.5 px-2 sm:px-3"
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-semibold uppercase">{language}</span>
    </Button>
  );
}
