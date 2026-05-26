import type { ReactNode } from 'react';

const legalReferences = [
  {
    href: 'https://www.peraturan.go.id/id/uu-no-27-tahun-2022',
    label: 'UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi',
  },
  {
    href: 'https://www.peraturan.go.id/id/pp-no-71-tahun-2019',
    label: 'PP No. 71 Tahun 2019 tentang Penyelenggaraan Sistem dan Transaksi Elektronik',
  },
  {
    href: 'https://www.peraturan.go.id/id/uu-no-1-tahun-2024',
    label: 'UU No. 1 Tahun 2024 tentang Perubahan Kedua UU Informasi dan Transaksi Elektronik',
  },
];

type LegalReferencesProps = {
  children: ReactNode;
};

export function LegalReferences({ children }: LegalReferencesProps) {
  return (
    <article className="rounded-lg border border-border bg-surface-1 p-5">
      <h2 className="text-base font-semibold">Dasar hukum yang relevan</h2>
      <p className="mt-2 text-sm leading-7 text-muted-foreground">{children}</p>
      <div className="mt-4 grid gap-3 text-sm">
        {legalReferences.map((reference) => (
          <a
            key={reference.href}
            className="text-primary hover:underline"
            href={reference.href}
            target="_blank"
            rel="noreferrer"
          >
            {reference.label}
          </a>
        ))}
      </div>
    </article>
  );
}
