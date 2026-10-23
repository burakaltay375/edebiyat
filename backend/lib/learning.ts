export const intervals=[1,3,7,14,30];
export function schedule(previousLevel:number|undefined,score:number,isReview:boolean,now=new Date()){
 const level=previousLevel===undefined?0:score<60?0:isReview&&score>=80?Math.min(4,previousLevel+1):previousLevel;
 const days=intervals[level]; const due=new Date(now);due.setUTCDate(due.getUTCDate()+days);
 return {level,interval:days,nextReview:due.toISOString()};
}
export function mastery(quiz:number,recall:number|null,explanation:number|null,previous:number|null,isReview:boolean){
 const samples:[[number|null,number],[number|null,number],[number|null,number]]=[[quiz,.5],[recall,.2],[explanation,.3]];
 let weight=0,total=0;for(const [value,w] of samples){if(value!==null){weight+=w;total+=value*w}}
 const current=total/weight;return Math.round(previous===null?current:previous*(isReview?.3:.2)+current*(isReview?.7:.8));
}
export function normalize(s:string){return s.toLocaleLowerCase("tr-TR").normalize("NFKC").trim().replace(/[.,!?;:]/g,"").replace(/\s+/g," ")}
export function gradeAnswer(answer:string,correct:string){const accepted=JSON.parse(correct) as string[];return accepted.some(v=>normalize(v)===normalize(answer));}
