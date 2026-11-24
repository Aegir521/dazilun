export type Role={id:string,name:string,subs:{id:string,name:string}[]};
export type Entry={id:string,role:string,sub:string,minutes:number,day:string,author:string,status:'ok'|'pending'|'declined'};
export type Pair={sender:string,accepted:boolean,review:boolean,roles:Role[],entries:Entry[],weights:Record<string,Record<string,number>>};
export function fresh(sender:string):Pair{return {sender,accepted:false,review:false,roles:[],entries:[],weights:{}}}
export type Action={type:string,peer:string,id?:string,role?:string,sub?:string,name?:string,day?:string,minutes?:number,value?:number};
function check(ok:unknown,msg:string):asserts ok{if(!ok)throw Error(msg)}
export function change(p:Pair,u:string,x:Action){
 if(x.type==='accept'){check(u!==p.sender,'请由对方接受申请');p.accepted=true;return}
 check(p.accepted,'请先完成绑定');
 const role=p.roles.find(r=>r.id===x.role);
 const name=x.name?.trim(); const id=x.id;
 if(['role','sub','rename','renameSub'].includes(x.type))check(name && name.length<=24,'名称限 1–24 个字');
 if(['role','sub','entry'].includes(x.type))check(typeof id==='string' && /^[\w-]{1,64}$/.test(id),'无效的记录编号');
 if(x.type==='role'){if(p.roles.some(r=>r.id===id))return;check(!p.roles.some(r=>r.name===name),'已有同名身份');p.roles.push({id:id!,name:name!,subs:[]});return}
 if(x.type==='review'){p.review=x.value===1;return}
 if(x.type==='approve'||x.type==='decline'){const e=p.entries.find(e=>e.id===id);check(e?.status==='pending'&&e.author!==u,'仅对方可处理待确认活动');e.status=x.type==='approve'?'ok':'declined';return}
 check(role,'请选择搭子身份');
 switch(x.type){
 case 'rename':check(!p.roles.some(r=>r!==role&&r.name===name),'已有同名身份');role.name=name!;break;
 case 'sub':if(role.subs.some(s=>s.id===id))return;check(!role.subs.some(s=>s.name===name),'已有同名细分');role.subs.push({id:id!,name:name!});break;
 case 'renameSub':{const s=role.subs.find(s=>s.id===x.sub);check(s,'请选择细分');check(!role.subs.some(v=>v!==s&&v.name===name),'已有同名细分');s.name=name!;break}
 case 'weight':check(typeof x.value==='number'&&Number.isFinite(x.value)&&x.value>=0.1&&x.value<=5,'系数范围 0.1–5');(p.weights[u]??={})[role.id]=x.value;break;
 case 'entry':if(p.entries.some(e=>e.id===id))return;check(!x.sub||role.subs.some(s=>s.id===x.sub),'未知的细分');check(Number.isInteger(x.minutes)&&x.minutes!>0&&x.minutes!<=1440,'单次活动限 1–1440 分钟');check(typeof x.day==='string'&&/^\d{4}-\d\d-\d\d$/.test(x.day)&&!isNaN(Date.parse(x.day))&&new Date(x.day).toISOString().slice(0,10)===x.day,'日期无效');p.entries.unshift({id:id!,role:role.id,sub:x.sub||'',minutes:x.minutes!,day:x.day,author:u,status:p.review?'pending':'ok'});break;
 default:throw Error('未知操作')
 }}
export function totals(p:Pair,user:string){return p.roles.map(role=>{const list=p.entries.filter(e=>e.role===role.id&&e.status==='ok');const minutes=list.reduce((a,e)=>a+e.minutes,0);const weight=p.weights[user]?.[role.id]??1;return {...role,minutes,count:list.length,weight,score:minutes*weight}}).sort((a,b)=>b.score-a.score)}
