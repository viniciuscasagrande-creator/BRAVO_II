// Contrato público do portal; sem entidades ou regras internas do backend.
export interface EventSummaryViewDto {id:string;title:string;status:string;startsAt:string;venueName:string;city:string;stateUf:string;}
export interface EventBuilderFullViewDto extends EventSummaryViewDto {
 sessions:{id:string;title:string;startsAt:string}[];
 sectors:{id:string;name:string}[];
 priceLots:{id:string;modalityName:string;lotNumber:number;nominalPriceCents:number;maxQuantity:number}[];
}
