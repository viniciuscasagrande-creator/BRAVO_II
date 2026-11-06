/** Backoffice e API compartilham a origem no navegador. Banco e API não são expostos no cliente. */
const apiUrl=process.env.BRAVO_API_URL||'http://127.0.0.1:4100';
if(!/^https?:\/\//.test(apiUrl))throw new Error('BRAVO_API_URL inválida');
export default {
  async rewrites(){return [{source:'/v1/:path*',destination:`${apiUrl}/v1/:path*`}];},
  poweredByHeader:false,
};
