# Instalação das telas Next.js

- Mesclar as páginas de `apps/backoffice/src/app/(erp)/` dentro do projeto Next.js real do BRAVO_II, com sessão do Core obrigatória. Não sobrescrever o layout/global.css atual.
- Importar `apps/backoffice/src/components/bravo-p06.css` no layout protegido, uma vez. CSS utiliza classes `b6*` para evitar conflitos.
- Configurar rewrite de `/v1/:path*` para o NestJS **no mesmo domínio**; manter cookies HttpOnly, SameSite, proteção CSRF e CORS controlado pelo Core.
- `apps/backoffice/src/lib/bravo-api.ts` usa somente fetch same-origin com cookie de sessão; nunca usa token ou role em localStorage.
- Os formulários não possuem dados pré-preenchidos de clientes/produtores/eventos. Valores e listas vêm exclusivamente de API. Exceção: testes isolados usam fixture sintética.
- Todo menu marcado PLANEJADO/PARCIAL no JSON `integracao/menus-p06.json` deve ficar DESABILITADO até haver páginas e testes correspondentes.
- Segurança: esconder botão no frontend não substitui autorização; Nest precisa checar perfil, alçada e event scope no servidor.
- Antes de homologação, implementar estado de validação por campo, busca/paginação, upload autenticado de documentos e arte, verificação de identidade, avisos de uso de dados, acessibilidade e testes de e2e.
- Não há Next.js `package.json` aqui, pois esse subdiretório é um **patch para Core**, não um aplicativo independente. Sem o Pacote 05 não se consegue compilá-lo.
