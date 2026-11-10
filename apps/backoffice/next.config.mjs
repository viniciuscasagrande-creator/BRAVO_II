import path from 'node:path';
import {fileURLToPath} from 'node:url';
// O BFF em /v1 substitui rewrites de browser para backend externo.
if(process.env.VERCEL==='1'&&process.env.VERCEL_ENV!=='preview'&&process.env.BRAVO_ENV!=='HOMOLOGACAO'&&process.env.VERCEL_ENV==='production'&&process.env.ENABLE_EXTERNAL_PUBLICATION==='true'){
  throw new Error('BRAVO_II: publicação Production bloqueada; usar apenas Vercel Preview');
}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export default {
  outputFileTracingRoot:root,
  experimental:{cpus:2,workerThreads:false},
  transpilePackages:[
    '@bravo-ii/contracts',
    '@bravo-ii/core-policy',
    '@bravo-ii/domain-p06',
    '@bravo-ii/sdk',
    '@bravo-ii/ui',
  ],
  poweredByHeader:false,
  async headers(){
    return [
      {
        source:'/((?!_next/static|_next/image|favicon.ico).*)',
        headers:[
          {key:'X-Frame-Options',value:'DENY'},
          {key:'X-Content-Type-Options',value:'nosniff'},
          {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
          {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
          {key:'Cache-Control',value:'private, no-store, max-age=0'},
        ],
      },
      {
        source:'/_next/static/:path*',
        headers:[
          {key:'X-Content-Type-Options',value:'nosniff'},
          {key:'Cache-Control',value:'public, max-age=31536000, immutable'},
        ],
      },
    ];
  },
};
