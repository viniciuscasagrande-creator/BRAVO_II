'use client';
import React from 'react';

export function Head({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="b6-header">
      <div>
        <small>BRAVO_II · Gestão Operacional</small>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="b6-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function Notice({ text, error }: { text: string; error?: boolean }) {
  return text ? (
    <p role={error ? 'alert' : 'status'} className={error ? 'b6-error' : 'b6-notice'}>
      {text}
    </p>
  ) : null;
}

export function Field({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <label className="b6-field">
      <span>{name}</span>
      {children}
    </label>
  );
}

export function Empty({ message }: { message: string }) {
  return <div className="b6-empty">{message}</div>;
}

export const brl = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export const dateBR = (v: string) => new Date(v).toLocaleString('pt-BR');
