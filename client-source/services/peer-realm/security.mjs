// Legacy compatibility derived from PvPGN bnethash.cpp (GPL-2.0-or-later).
// Copyright (C) 1999 Descolada; 1999,2000 Ross Combs.
export function legacyHash(text) {
  const data = new TextEncoder().encode(text), h = [0x67452301,0xefcdab89,0x98badcfe,0x10325476,0xc3d2e1f0];
  const rol = (v,n) => ((v << (n&31)) | (v >>> (32-(n&31)))) >>> 0;
  for (let offset=0; offset<data.length; offset+=64) {
    const block=new Uint8Array(64);block.set(data.subarray(offset,offset+64));const view=new DataView(block.buffer),w=[];
    for(let i=0;i<16;i++)w[i]=view.getUint32(i*4,true);
    for(let i=16;i<80;i++)w[i]=rol(1,w[i-16]^w[i-8]^w[i-14]^w[i-3]);
    let [a,b,c,d,e]=h;
    for(let i=0;i<80;i++){
      const f=i<20?((b&c)|(~b&d)):i<40?(b^c^d):i<60?((b&c)|(b&d)|(c&d)):(b^c^d);
      const k=i<20?0x5a827999:i<40?0x6ed9eba1:i<60?0x8f1bbcdc:0xca62c1d6;
      [a,b,c,d,e]=[(rol(a,5)+(f>>>0)+e+w[i]+k)>>>0,a,rol(b,30),c,d];
    }
    [a,b,c,d,e].forEach((v,i)=>h[i]=(h[i]+v)>>>0);
  }
  const result=new Uint8Array(20),view=new DataView(result.buffer);h.forEach((v,i)=>view.setUint32(i*4,v,true));return result;
}
export const hex = data => Array.from(new Uint8Array(data),v=>v.toString(16).padStart(2,'0')).join('');
export const random = (size=32) => {
  const bytes=crypto.getRandomValues(new Uint8Array(size));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
};
export const digest = async value => hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
export function equal(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let result=0;for(let i=0;i<a.length;i++)result|=a.charCodeAt(i)^b.charCodeAt(i);return result===0;}
export async function passwordKey(password,salt,scheme='pbkdf2') {
  const raw=scheme==='legacy-pbkdf2'?legacyHash(password.toLowerCase()):new TextEncoder().encode(password);
  const key=await crypto.subtle.importKey('raw',raw,'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256));
}
export const validUser = value => typeof value==='string'&&/^[a-z][a-z0-9_-]{2,15}$/i.test(value);
export const validToken = value => typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);
export const validRoom = value => typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
export function validateSignal(input) {
  if(!input||!Number.isInteger(input.to)||input.to<0||input.to>3)throw Error('Destino inválido.');
  if(!['description','candidate'].includes(input.op))throw Error('Sinal inválido.');
  if(input.op==='description'&&(!['offer','answer'].includes(input.type)||typeof input.sdp!=='string'||input.sdp.length>32768||!input.sdp.startsWith('v=0')))throw Error('Descrição inválida.');
  if(input.op==='candidate'&&(typeof input.candidate!=='string'||input.candidate.length>2048||typeof input.mid!=='string'||input.mid.length>32))throw Error('Candidato inválido.');
}
