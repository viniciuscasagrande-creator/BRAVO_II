import React from 'react';
import { RhSubareaClient } from './rh-subarea-client';

export function generateStaticParams(): Array<{ slug: string }> {
  const groupSlugs = ['r01-r09', 'r10-r19', 'r20-r28', 'r29-r36', 'r37-r45'];
  const itemSlugs: string[] = [];
  for (let i = 1; i <= 45; i++) {
    itemSlugs.push(`r${String(i).padStart(2, '0')}`);
    if (i < 10) {
      itemSlugs.push(`r${i}`);
    }
  }
  return [...groupSlugs, ...itemSlugs].map((slug) => ({ slug }));
}

export default async function RhCatalogFunctionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RhSubareaClient slug={slug} />;
}
