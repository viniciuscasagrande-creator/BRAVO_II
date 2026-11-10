import path from 'node:path';
import {fileURLToPath} from 'node:url';
export default {
  outputFileTracingRoot:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),
  poweredByHeader:false,
  experimental:{cpus:2,workerThreads:false},
  async headers(){return [{source:'/:path*',headers:[{key:'X-Frame-Options',value:'DENY'},{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Cache-Control',value:'private, no-store'}]}];}
};
