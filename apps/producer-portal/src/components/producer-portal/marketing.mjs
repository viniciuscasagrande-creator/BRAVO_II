export function campaignLink(destination, source, medium, campaign, eventId) {
  const url = new URL(destination);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Informe um endereço HTTPS sem credenciais.');
  for (const [key, value] of Object.entries({utm_source:source, utm_medium:medium, utm_campaign:campaign})) {
    if (!value.trim() || value.length > 120) throw new Error('Preencha origem, meio e campanha com até 120 caracteres.');
    url.searchParams.set(key,value.trim());
  }
  url.searchParams.set('utm_content',eventId);
  return url.toString();
}
