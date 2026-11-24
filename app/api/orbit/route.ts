import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {fresh,change,type Pair,type Action} from '../../model';
export const dynamic='force-dynamic';
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){
 const user=await getChatGPTUser();if(!user)return reply({error:'请登录'},401);
 const db=env.DB!;await db.prepare('INSERT INTO members VALUES (?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name').bind(user.userId,user.fullName||user.email.split('@')[0]).run();
 const members=await db.prepare('SELECT id,name FROM members WHERE id<>?').bind(user.userId).all();
 const rows=await db.prepare('SELECT a,b,body FROM pairs WHERE a=? OR b=?').bind(user.userId,user.userId).all<{a:string,b:string,body:string}>();
 return reply({me:user.userId,name:user.fullName||user.email.split('@')[0],members:members.results,pairs:rows.results.map(r=>{const p=JSON.parse(r.body) as Pair;p.weights={[user.userId]:p.weights[user.userId]||{}};return {peer:r.a===user.userId?r.b:r.a,data:p}})})
}
export async function POST(req:Request){
 const user=await getChatGPTUser();if(!user)return reply({error:'请登录'},401);
 if(req.headers.get('origin')&&new URL(req.url).origin!==req.headers.get('origin'))return reply({error:'来源无效'},403);
 if(!req.headers.get('content-type')?.startsWith('application/json'))return reply({error:'请求格式无效'},415);
 const db=env.DB!,u=user.userId;let x:Action;try{x=await req.json()}catch{return reply({error:'数据无效'},400)}
 if(!x||typeof x.peer!=='string'||x.peer===u||!await db.prepare('SELECT id FROM members WHERE id=?').bind(x.peer).first())return reply({error:'请选择已登录的搭子'},400);
 const [a,b]=[u,x.peer].sort(),key=JSON.stringify([a,b]);
 if(x.type==='invite'){await db.prepare('INSERT OR IGNORE INTO pairs (id,a,b,body,revision) VALUES (?,?,?,?,0)').bind(key,a,b,JSON.stringify(fresh(u))).run();return reply({ok:true})}
 for(let attempt=0;attempt<6;attempt++){
 const row=await db.prepare('SELECT body,revision FROM pairs WHERE id=?').bind(key).first<{body:string,revision:number}>();if(!row)return reply({error:'尚未绑定'},403);
 const p=JSON.parse(row.body) as Pair;
 if(x.type==='cancelInvite'&&!p.accepted){const result=await db.prepare('DELETE FROM pairs WHERE id=? AND revision=?').bind(key,row.revision).run();if(result.meta.changes)return reply({ok:true});continue}
 try{change(p,u,x)}catch(e){return reply({error:(e as Error).message},400)}
 const result=await db.prepare('UPDATE pairs SET body=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(p),key,row.revision).run();
 if(result.meta.changes)return reply({ok:true});
 }return reply({error:'双方正在同时操作，请再试一次'},409)
}