'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {translate,type Language} from './language';
import Cloud from './cloud';
import {fresh,totals,type Pair,type Action} from './model';
type State={me:string,name:string,members:{id:string,name:string}[],pairs:{peer:string,data:Pair}[]};
const sample=fresh('');sample.roles=['饭搭子','羽毛球搭子','自习搭子','散步搭子','电影搭子'].map((name,i)=>({name,id:String(i),subs:[]}));sample.entries=[240,160,100,60,40].map((minutes,i)=>({id:String(i),author:'',day:'',role:String(i),sub:'',status:'ok',minutes}));
const hrs=(n:number)=>+(n/60).toFixed(2);
export default function Home(){
 const [state,S]=useState<State|null>(null),[peer,P]=useState(''),[view,V]=useState(''),[rid,R]=useState(''),[error,E]=useState(''),[busy,B]=useState(false),[auth,A]=useState(false),[factor,F]=useState(1),[sub,U]=useState('');
 const [language,setLanguage]=useState<Language>('zh-CN');
 useEffect(()=>{
   let stored:string|null=null;
   try{stored=localStorage.getItem('dazilun.language')}catch{}
   setLanguage(stored==='en'||stored==='zh-CN'?stored:navigator.language.toLowerCase().startsWith('en')?'en':'zh-CN');
 },[]);
 useEffect(()=>{document.documentElement.lang=language;document.title=translate(language,'搭子论 · 关系星图')},[language]);
 function chooseLanguage(value:Language){
   setLanguage(value);
   try{localStorage.setItem('dazilun.language',value)}catch{}
 }
 const t=(message:string)=>translate(language,message);
 const [records,setRecords]=useState(false);
 useEffect(()=>{const sync=()=>setRecords(location.hash==='#records');sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync)},[]);
 const dialog=useRef<HTMLDialogElement>(null),lock=useRef(false),seq=useRef(0);
 const refresh=useCallback(async()=>{const token=++seq.current;try{const res=await fetch('/api/orbit',{cache:'no-store'});if(token!==seq.current)return;if(res.status===401){A(true);return}if(!res.ok)throw Error();const data:State=await res.json();if(token!==seq.current)return;A(false);S(data);P(old=>data.pairs.some(p=>p.peer===old)?old:data.pairs.find(p=>p.data.accepted)?.peer||data.pairs[0]?.peer||'')}catch{E('暂时无法同步，请检查连接后刷新页面。')}},[]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh()},12000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh)}},[refresh]);
 const pair=state?.pairs.find(p=>p.peer===peer)?.data,real=pair?.accepted?pair:undefined,me=state?.me||'',name=state?.members.find(m=>m.id===peer)?.name||t("我的搭子");
 const demo=!real?.roles.length,src=demo?sample:real!,rows=totals(src,me).map(r=>demo?{...r,name:t(r.name)}:r),actual=real?totals(real,me):[],role=real?.roles.find(r=>r.id===rid);
 if(view==='weight'&&!demo){const item=rows.find(r=>r.id===rid);if(item){item.score=item.minutes*factor;rows.sort((a,b)=>b.score-a.score)}}
 const sum=rows.reduce((s,r)=>s+r.score,0),mins=actual.reduce((s,r)=>s+r.minutes,0),count=actual.reduce((s,r)=>s+r.count,0);
 function open(v:string,id=''){E('');R(id);U('');F(actual.find(r=>r.id===id)?.weight??1);V(v);if(!dialog.current?.open)dialog.current?.showModal()}
 function close(){dialog.current?.close();V('');E('')}
 async function send(x:Omit<Action,'peer'>&{peer?:string},next=''){if(lock.current)return;lock.current=true;B(true);E('');try{const res=await fetch('/api/orbit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({peer,...x})});if(!res.ok){const data=await res.json() as {error?:string};throw Error(data.error||'保存失败')}await refresh();if(next)V(next);else close()}catch(e){E((e as Error).message)}finally{lock.current=false;B(false)}}
 const entries=real?.entries.filter(e=>e.role===rid)||[];
 const titles:Record<string,string>={settings:t('显示设置'),people:t("我的搭子"),manage:t("管理身份"),detail:role?.name||t("身份详情"),entry:t("记一次活动"),weight:t("调整显示"),history:t("活动记录"),preview:t("词云预览")};
 const chosen=actual.find(r=>r.id===rid);
 function listEntries(all:boolean){const list=all?(real?.entries||[]):entries;return list.length?list.map(e=>{const r=real?.roles.find(r=>r.id===e.role);return <div className="line" key={e.id}><div><strong>{r?.subs.find(s=>s.id===e.sub)?.name||r?.name}</strong><small>{e.day} · {language==='en'?'Logged by ':''}{e.author===me?t("我"):name}{language==='en'?' ·': '记录 ·'} {{ok:t("已计入"),pending:t("待确认"),declined:t("未通过")}[e.status]}</small></div><b>{e.minutes} {t("分钟")}</b>{e.status==='pending'&&e.author!==me&&<span><button onClick={()=>send({type:'approve',id:e.id},view)}>{t("确认")}</button><button onClick={()=>send({type:'decline',id:e.id},view)}>{t("退回")}</button></span>}</div>}):<p className="muted">{t("还没有活动记录。")}</p>}
 function reqEntry(){if(!real)open('people');else if(!actual.length)open('manage');else open('entry',actual[0].id)}
 const inputForm=(type:string,label:string,def='')=><form key={type+rid+sub+def} className="inline" onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const name=String(new FormData(form).get('name'));void send({type,name,id:crypto.randomUUID(),role:rid,sub},view);}}><input aria-label={label} name="name" required maxLength={24} defaultValue={def} placeholder={label}/><button disabled={busy}>{type.startsWith('rename')?t("保存名称"):t("添加")}</button></form>;
 return <> <header className="orbit-nav">
   <nav aria-label={t("主导航")}>
     <a href="#map" aria-current={!records?'page':undefined}>{t("关系星图")}</a>
     <a href="#records" aria-current={records?'page':undefined}>{t("记录活动")}</a>
   </nav>{records&&<button className="log-settings" onClick={()=>open('settings')}>{t('显示设置')}</button>}
 </header>
 {error&&!view&&<p className="sync-alert" role="alert">{t(error)}</p>}
 {records ? <main className="logbook">
   <section className="heading"><div><h1>{t("记录活动")}</h1><p>{real?(t("我 ×")+' ')+name:t("我的搭子")}</p></div><button className="primary" onClick={reqEntry}>{t("＋ 记一次活动")}</button></section>
   <div className="record-grid"><section className="panel"><div className="sectiontitle"><h2>{t("共同记录")}</h2><button onClick={()=>open('people')}>{t("管理绑定")}</button></div>{listEntries(true)}</section>
   <aside><section className="panel"><h2>{t("相处概览")}</h2><div className="big">{hrs(mins)} <em>{t("小时")}</em></div><div className="metrics"><span><b>{count}</b> {t("次活动")}</span><span><b>{actual.length}</b> {t("种身份")}</span></div></section>
   <section className="panel"><div className="sectiontitle"><h2>{t("身份分布")}</h2><button onClick={()=>open(real?'manage':'people')}>{t("管理身份")}</button></div>{actual.length===0&&<p className="muted">{t("绑定后即可添加身份。")}</p>}{actual.map(r=><button className="barrow" key={r.id} onClick={()=>open('detail',r.id)}><span>{r.name}<b>{sum?Math.round(r.score/sum*100):0}%</b></span><i><u style={{width:(sum?r.score/sum*100:0)+'%',background:'#ceb491'}}/></i></button>)}</section></aside></div>
 </main> : <main className="universe" aria-label={t("关系星图")}>
   <Cloud words={rows} onSelect={id=>open(demo?'preview':'detail',id)}/>
   <footer className="map-tools"><button onClick={()=>open('people')}><span aria-hidden="true">◌</span> {real?(t("我 ×")+' ')+name:t("我的搭子")}{demo&&<small>{t("示例星图")}</small>}</button><button onClick={()=>open('settings')}><span aria-hidden="true">☼</span> {t("显示设置")}</button></footer>
 </main>} <dialog ref={dialog} onClose={()=>{V('');E('')}}><div className="dlg"><div className="sectiontitle"><h2>{titles[view]}</h2><button aria-label={t("关闭")} onClick={close}>✕</button></div>{error&&<p role="alert">{t(error)}</p>}
 {view==='settings'&&<><label><span>{t('界面语言')} / {language==='en'?'中文':'English'}</span><select value={language} onChange={e=>chooseLanguage(e.target.value as Language)}><option value="zh-CN" lang="zh-CN">简体中文</option><option value="en" lang="en">English</option></select></label>{actual.length>0&&<button onClick={()=>open('weight',actual[0].id)}>{t('调整显示')}</button>}</>}
 {view==='people'&&<>{auth?<a href="/signin-with-chatgpt?return_to=%2F" target="_top">{t("使用 ChatGPT 登录")}</a>:<><p>{t("双方首次打开本站后，搭子会出现在这里。")}</p>{!state?.members.length&&<p className="muted">{t("正在等待另一位体验者登录。")}</p>}{state?.members.map(m=>{const p=state.pairs.find(p=>p.peer===m.id)?.data;return <div className="line" key={m.id}><strong>{m.name}</strong>{p?.accepted?<button onClick={()=>{P(m.id);location.hash='map';close()}}>{t("查看星图")}</button>:p?<span>{p.sender===me?t("等待回应"):<button onClick={()=>send({type:'accept',peer:m.id})}>{t("接受绑定")}</button>} <button onClick={()=>send({type:'cancelInvite',peer:m.id},'people')}>{p.sender===me?t("撤回"):t("拒绝")}</button></span>:<button onClick={()=>send({type:'invite',peer:m.id},'people')}>{t("申请绑定")}</button>}</div>})}</>}{real&&<label className="check"><input type="checkbox" checked={real.review} onChange={e=>send({type:'review',value:+e.target.checked},'people')}/> {t("新活动需对方确认")}</label>}</>}
 {view==='preview'&&<><h3>{rows.find(r=>r.id===rid)?.name}</h3><p>{t("这是示例身份。绑定搭子并添加身份后，这里会显示你们自己的时间和活动。")}</p><button onClick={()=>open(real?'manage':'people')}>{real?t("添加身份"):t("管理绑定")}</button></>}
 {view==='manage'&&<><h3>{t("新增主名称")}</h3>{inputForm('role',t("主名称，如饭搭子"))}<h3>{t("已有身份")}</h3>{actual.map(r=><button className="chip" key={r.id} onClick={()=>open('detail',r.id)}>{r.name}</button>)}</>}
 {view==='detail'&&role&&<><div className="stat">{hrs(chosen?.minutes||0)} {t("小时 ·")} {chosen?.count} {t("次")}</div><button className="primary" onClick={()=>open('entry',rid)}>{t("＋ 再记一次")}</button><details><summary>{t("名称与细分")}</summary>{inputForm('rename',t("主名称"),role.name)}{inputForm('sub',t("新增副名称，如周五夜宵"))}{role.subs.map(s=><button className="chip" key={s.id} onClick={()=>U(s.id)}>{s.name}</button>)}{sub&&inputForm('renameSub',t("修改副名称"),role.subs.find(s=>s.id===sub)?.name)}</details><h3>{t("活动明细")}</h3>{listEntries(false)}</>}
 {view==='entry'&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void send({type:'entry',id:String(f.get('key')),role:rid,sub,minutes:Number(f.get('minutes')),day:String(f.get('day'))})}}><EntryKey/><label>{t("搭子身份")}<select value={rid} onChange={e=>{R(e.target.value);U('')}}>{actual.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>{t("细分")}<select value={sub} onChange={e=>U(e.target.value)}><option value="">{t("直接记在主名称下")}</option>{role?.subs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>{t("活动日期")}<input name="day" type="date" required defaultValue={new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10)}/></label><label>{t("时长（分钟）")}<input type="number" min="1" max="1440" name="minutes" required defaultValue="60"/></label><button className="primary" disabled={busy}>{real?.review?t("提交对方确认"):t("保存活动")}</button></form>}
 {view==='history'&&listEntries(true)}
 {view==='weight'&&<><label>{t("调整身份")}<select value={rid} onChange={e=>{R(e.target.value);F(actual.find(r=>r.id===e.target.value)?.weight||1)}}>{actual.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>{t("个人展示系数")}<input type="number" min=".1" max="5" step=".1" value={factor} onChange={e=>F(Number(e.target.value))}/></label><input aria-label={t("拖动调整系数")} type="range" min=".1" max="5" step=".1" value={factor} onChange={e=>F(+e.target.value)}/><h3>{t("占比预览")}</h3>{rows.map(r=><div className="weightrow" key={r.id}>{r.name}<progress max={sum||1} value={Math.max(0,r.score)}/>{sum?Math.round(r.score/sum*100):0}%</div>)}<p>{t("仅改变你的词云，双方的实际时长保持一致。")}</p><button onClick={()=>F(1)}>{t("恢复 1.0")}</button> <button className="primary" disabled={busy||factor<.1||factor>5} onClick={()=>send({type:'weight',role:rid,value:factor})}>{t("保存显示")}</button></>}
 </div></dialog></>
}
function EntryKey(){const [key]=useState(()=>crypto.randomUUID());return <input type="hidden" name="key" value={key}/>}