import path from 'node:path';
import {fileURLToPath} from 'node:url';
// O BFF em /v1 substitui rewrites de browser para backend externo.
if(process.env.VERCEL==='1'&&process.env.VERCEL_ENV!=='preview'){
  throw new Error('BRAVO_II: publicação Production bloqueada; usar apenas Vercel Preview');
}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export default {
  outputFileTracingRoot:root,
  transpilePackages:[
    '@bravo-ii/contracts',
    '@bravo-ii/core-policy',
    '@bravo-ii/domain-p06',
    '@bravo-ii/sdk',
    '@bravo-ii/ui',
  ],
  poweredByHeader:false,
  async headers(){return [{source:'/:path*',headers:[
    {key:'X-Frame-Options',value:'DENY'},
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
    {key:'Cache-Control',value:'private, no-store, max-age=0'}
  ]}];}
};
