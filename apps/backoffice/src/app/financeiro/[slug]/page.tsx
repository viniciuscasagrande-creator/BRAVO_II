import React from 'react';
import { FinanceiroSubareaClient } from './financeiro-subarea-client';

export function generateStaticParams(): Array<{ slug: string }> {
  const groupSlugs = ['f01-f28', 'f29-f50', 'f51-f70', 'f71-f88', 'f89-f104'];
  const itemSlugs: string[] = [];
  for (let i = 1; i <= 104; i++) {
    itemSlugs.push(`f${String(i).padStart(2, '0')}`);
    if (i < 10) {
      itemSlugs.push(`f${i}`);
    }
  }
  return [...groupSlugs, ...itemSlugs].map((slug) => ({ slug }));
}

export default async function FinanceiroCatalogFunctionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <FinanceiroSubareaClient slug={slug} />;
}
