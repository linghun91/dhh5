import {message} from '../data/messages.js';

export const fail = (key,values) => ({ok:false,message:message(key,values)});
export const positive = value => Number.isSafeInteger(value) && value > 0;
export const success = (state,key,values,tone='good') => {
  const text=message(key,values);
  addLog(state,text,tone);
  return {ok:true,message:text};
};
export function addLog(state,text,tone='info') {
  state.logs.push({day:state.day,text,tone});
  if (state.logs.length>80) state.logs.splice(0,state.logs.length-80);
}
export function random(state) {
  state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;
  return state.seed/4294967296;
}
export function gainExperience(state,amount) {
  for (const crew of state.crew) crew.xp+=amount;
}
export const cargoUsed = state => Object.values(state.cargo).reduce((sum,item)=>sum+item.quantity,0);
export const supplyUsed = state => Object.values(state.supplies).reduce((sum,value)=>sum+value,0);
