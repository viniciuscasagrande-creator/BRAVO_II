import { originAllowed } from '@bravo-ii/core-policy';
/** Origens exatas dos dois frontends, sem curingas nem domínio escolhido pelo cliente. */
export function allowedAppOrigin(origin:string|undefined, internalOrigin=process.env.APP_ORIGIN):boolean {
  return originAllowed(origin, internalOrigin || 'http://localhost:3000') ||
    (!!process.env.PRODUCER_PORTAL_ORIGIN && originAllowed(origin,process.env.PRODUCER_PORTAL_ORIGIN));
}
