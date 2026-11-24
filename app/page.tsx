'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Cloud from './cloud';
import {fresh,totals,type Pair,type Action} from './model';
type State={me:string,name:string,members:{id:string,name:string}[],pairs:{peer:string,data:Pair}[]};
const sample=fresh('');sample.roles=['饭搭子','羽毛球搭子','自习搭子','散步搭子','电影搭子'].map((name,i)=>({name,id:String(i),subs:[]}));sample.entries=[240,160,100,60,40].map((minutes,i)=>({id:String(i),author:'',day:'',role:String(i),sub:'',status:'ok',minutes}));
const hrs=(n:number)=>+(n/60).toFixed(2);
export default function Home(){
 const [state,S]=useState<State|null>(null),[peer,P]=useState(''),[view,V]=useState(''),[rid,R]=useState(''),[error,E]=useState(''),[busy,B]=useState(false),[auth,A]=useState(false),[factor,F]=useState(1),[sub,U]=useState('');
 const [records,setRecords]=useState(false);
 useEffect(()=>{const sync=()=>setRecords(location.hash==='#records');sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[]);
 const dialog=useRef<HTMLDialogElement>(null),lock=useRef(false),seq=useRef(0);
 const refresh=useCallback(async()=>{const token=++seq.current;try{const res=await fetch('/api/orbit',{cache:'no-store'});if(token!==seq.current)return;if(res.status===401){A(true);return}if(!res.ok)throw Error();const data:State=await res.json();if(token!==seq.current)return;A(false);S(data);P(old=>data.pairs.some(p=>p.peer===old)?old:data.pairs.find(p=>p.data.accepted)?.peer||data.pairs[0]?.peer||'')}catch{E('暂时无法同步，请检查连接后刷新页面。')}},[]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh()},12000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}},[refresh]);
 const pair=state?.pairs.find(p=>p.peer===peer)?.data,real=pair?.accepted?pair:undefined,me=state?.me||'',name=state?.members.find(m=>m.id===peer)?.name||'我的搭子';
 const demo=!real?.roles.length,src=demo?sample:real!,rows=totals(src,me),actual=real?totals(real,me):[],role=real?.roles.find(r=>r.id===rid);
 if(view==='weight'&&!demo){const item=rows.find(r=>r.id===rid);if(item){item.score=item.minutes*factor;rows.sort((a,b)=>b.score-a.score)}}
 const sum=rows.reduce((s,r)=>s+r.score,0),mins=actual.reduce((s,r)=>s+r.minutes,0),count=actual.reduce((s,r)=>s+r.count,0);
 function open(v:string,id=''){E('');R(id);U('');F(actual.find(r=>r.id===id)?.weight??1);V(v);if(!dialog.current?.open)dialog.current?.showModal()}
 function close(){dialog.current?.close();V('');E('')}
 async function send(x:Omit<Action,'peer'>&{peer?:string},next=''){if(lock.current)return;lock.current=true;B(true);E('');try{const res=await fetch('/api/orbit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({peer,...x})});if(!res.ok){const data=await res.json() as {error?:string};throw Error(data.error||'保存失败')}await refresh();if(next)V(next);else close()}catch(e){E((e as Error).message)}finally{lock.current=false;B(false)}}
 const entries=real?.entries.filter(e=>e.role===rid)||[];
 const titles:Record<string,string>={people:'我的搭子',manage:'管理身份',detail:role?.name||'身份详情',entry:'记一次活动',weight:'调整显示',history:'活动记录',preview:'词云预览'};
 const chosen=actual.find(r=>r.id===rid);
 function listEntries(all:boolean){const list=all?(real?.entries||[]):entries;return list.length?list.map(e=>{const r=real?.roles.find(r=>r.id===e.role);return <div className="line" key={e.id}><div><strong>{r?.subs.find(s=>s.id===e.sub)?.name||r?.name}</strong><small>{e.day} · {e.author===me?'我':name}记录 · {{ok:'已计入',pending:'待确认',declined:'未通过'}[e.status]}</small></div><b>{e.minutes} 分钟</b>{e.status==='pending'&&e.author!==me&&<span><button onClick={()=>send({type:'approve',id:e.id},view)}>确认</button><button onClick={()=>send({type:'decline',id:e.id},view)}>退回</button></span>}</div>}):<p className="muted">还没有活动记录。</p>}
 function reqEntry(){if(!real)open('people');else if(!actual.length)open('manage');else open('entry',actual[0].id)}
 const inputForm=(type:string,label:string,def='')=><form key={type+rid+sub+def} className="inline" onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const name=String(new FormData(form).get('name'));void send({type,name,id:crypto.randomUUID(),role:rid,sub},view);}}><input aria-label={label} name="name" required maxLength={24} defaultValue={def} placeholder={label}/><button disabled={busy}>{type.startsWith('rename')?'保存名称':'添加'}</button></form>;
 return <> <header className="orbit-nav">
   <nav aria-label="主导航">
     <a href="#map" aria-current={!records?'page':undefined}>关系星图</a>
     <a href="#records" aria-current={records?'page':undefined}>记录活动</a>
   </nav>
 </header>
 {error&&!view&&<p className="sync-alert" role="alert">{error}</p>}
 {records ? <main className="logbook">
   <section className="heading"><div><h1>记录活动</h1><p>{real?'我 × '+name:'我的搭子'}</p></div><button className="primary" onClick={reqEntry}>＋ 记一次活动</button></section>
   <div className="record-grid"><section className="panel"><div className="sectiontitle"><h2>共同记录</h2><button onClick={()=>open('people')}>管理绑定</button></div>{listEntries(true)}</section>
   <aside><section className="panel"><h2>相处概览</h2><div className="big">{hrs(mins)} <em>小时</em></div><div className="metrics"><span><b>{count}</b> 次活动</span><span><b>{actual.length}</b> 种身份</span></div></section>
   <section className="panel"><div className="sectiontitle"><h2>身份分布</h2><button onClick={()=>open(real?'manage':'people')}>管理身份</button></div>{actual.length===0&&<p className="muted">绑定后即可添加身份。</p>}{actual.map(r=><button className="barrow" key={r.id} onClick={()=>open('detail',r.id)}><span>{r.name}<b>{sum?Math.round(r.score/sum*100):0}%</b></span><i><u style={{width:(sum?r.score/sum*100:0)+'%',background:'#ceb491'}}/></i></button>)}</section></aside></div>
 </main> : <main className="universe" aria-label="关系星图">
   <Cloud words={rows} onSelect={id=>open(demo?'preview':'detail',id)}/>
   <footer className="map-tools"><button onClick={()=>open('people')}><span aria-hidden="true">◌</span> {real?'我 × '+name:'我的搭子'}{demo&&<small>示例星图</small>}</button><button onClick={()=>open(actual.length?'weight':real?'manage':'people',actual[0]?.id)}><span aria-hidden="true">☼</span> 显示设置</button></footer>
 </main>} <dialog ref={dialog} onClose={()=>{V('');E('')}}><div className="dlg"><div className="sectiontitle"><h2>{titles[view]}</h2><button aria-label="关闭" onClick={close}>✕</button></div>{error&&<p role="alert">{error}</p>}
 {view==='people'&&<>{auth?<a href="/signin-with-chatgpt?return_to=%2F" target="_top">使用 ChatGPT 登录</a>:<><p>双方首次打开本站后，搭子会出现在这里。</p>{!state?.members.length&&<p className="muted">正在等待另一位体验者登录。</p>}{state?.members.map(m=>{const p=state.pairs.find(p=>p.peer===m.id)?.data;return <div className="line" key={m.id}><strong>{m.name}</strong>{p?.accepted?<button onClick={()=>{P(m.id);location.hash='map';close()}}>查看星图</button>:p?<span>{p.sender===me?'等待回应':<button onClick={()=>send({type:'accept',peer:m.id})}>接受绑定</button>} <button onClick={()=>send({type:'cancelInvite',peer:m.id},'people')}>{p.sender===me?'撤回':'拒绝'}</button></span>:<button onClick={()=>send({type:'invite',peer:m.id},'people')}>申请绑定</button>}</div>})}</>}{real&&<label className="check"><input type="checkbox" checked={real.review} onChange={e=>send({type:'review',value:+e.target.checked},'people')}/> 新活动需对方确认</label>}</>}
 {view==='preview'&&<><h3>{rows.find(r=>r.id===rid)?.name}</h3><p>这是示例身份。绑定搭子并添加身份后，这里会显示你们自己的时间和活动。</p><button onClick={()=>open(real?'manage':'people')}>{real?'添加身份':'管理绑定'}</button></>}
 {view==='manage'&&<><h3>新增主名称</h3>{inputForm('role','主名称，如饭搭子')}<h3>已有身份</h3>{actual.map(r=><button className="chip" key={r.id} onClick={()=>open('detail',r.id)}>{r.name}</button>)}</>}
 {view==='detail'&&role&&<><div className="stat">{hrs(chosen?.minutes||0)} 小时 · {chosen?.count} 次</div><button className="primary" onClick={()=>open('entry',rid)}>＋ 再记一次</button><details><summary>名称与细分</summary>{inputForm('rename','主名称',role.name)}{inputForm('sub','新增副名称，如周五夜宵')}{role.subs.map(s=><button className="chip" key={s.id} onClick={()=>U(s.id)}>{s.name}</button>)}{sub&&inputForm('renameSub','修改副名称',role.subs.find(s=>s.id===sub)?.name)}</details><h3>活动明细</h3>{listEntries(false)}</>}
 {view==='entry'&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void send({type:'entry',id:String(f.get('key')),role:rid,sub,minutes:Number(f.get('minutes')),day:String(f.get('day'))})}}><EntryKey/><label>搭子身份<select value={rid} onChange={e=>{R(e.target.value);U('')}}>{actual.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>细分<select value={sub} onChange={e=>U(e.target.value)}><option value="">直接记在主名称下</option>{role?.subs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>活动日期<input name="day" type="date" required defaultValue={new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)}/></label><label>时长（分钟）<input type="number" min="1" max="1440" name="minutes" required defaultValue="60"/></label><button className="primary" disabled={busy}>{real?.review?'提交对方确认':'保存活动'}</button></form>}
 {view==='history'&&listEntries(true)}
 {view==='weight'&&<><label>调整身份<select value={rid} onChange={e=>{R(e.target.value);F(actual.find(r=>r.id===e.target.value)?.weight||1)}}>{actual.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>个人展示系数<input type="number" min=".1" max="5" step=".1" value={factor} onChange={e=>F(Number(e.target.value))}/></label><input aria-label="拖动调整系数" type="range" min=".1" max="5" step=".1" value={factor} onChange={e=>F(+e.target.value)}/><h3>占比预览</h3>{rows.map(r=><div className="weightrow" key={r.id}>{r.name}<progress max={sum||1} value={Math.max(0,r.score)}/>{sum?Math.round(r.score/sum*100):0}%</div>)}<p>仅改变你的词云，双方的实际时长保持一致。</p><button onClick={()=>F(1)}>恢复 1.0</button> <button className="primary" disabled={busy||factor<.1||factor>5} onClick={()=>send({type:'weight',role:rid,value:factor})}>保存显示</button></>}
 </div></dialog></>
}
function EntryKey(){const [key]=useState(()=>crypto.randomUUID());return <input type="hidden" name="key" value={key}/>}