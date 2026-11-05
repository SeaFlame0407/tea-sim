/* TEA step-drill engine.
   A page calls Drill.run(cfg). cfg.steps is a timeline of checkpoints; at each checkpoint the
   player's position is compared with step.spot(player, ctx) and step.check(ctx) runs mechanic checks.
   spot() returns {x,y,r} in the page's local frame (or {world:true,...}), null = "not known yet, wait",
   undefined = "no position required for this player". */
(function(){
'use strict';
const R=20,SPEED=6.2;
const TH=['MT','ST','H1','H2'],DD=['D1','D2','D3','D4'],ALL=TH.concat(DD);
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;const t=a[i];a[i]=a[j];a[j]=t}return a}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const fmt=s=>{s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};

// ---------- core (no DOM) ----------
function newState(cfg,meName,auto){
  const fr=cfg.frame?cfg.frame():{rot:0,mx:1};
  const c=Math.round(Math.cos(fr.rot)),s=Math.round(Math.sin(fr.rot));
  const ctx={frame:fr,t:cfg.t0||0,players:[],by:{},fails:[],
    L(u,v){const x=u*fr.mx;return{x:x*c-v*s,y:x*s+v*c}},
    toLocal(x,y){return{u:(x*c+y*s)*fr.mx,v:-x*s+y*c}},
    fail(p,why){this.fails.push({t:this.t,p,why})}};
  ALL.forEach((n,i)=>{const p={n,role:i<4?'TH':'DD',x:0,y:0,me:n===meName,tag:'',lastSi:-1,wait:0,
    jx:Math.random()*2-1,jy:Math.random()*2-1};ctx.players.push(p);ctx.by[n]=p});
  ctx.me=ctx.by[meName];
  cfg.setup(ctx);
  const st={cfg,ctx,si:0,results:[],done:false,lastFail:0,auto:!!auto};
  while(st.si<cfg.steps.length&&cfg.steps[st.si].t<ctx.t)st.si++;
  return st;
}
const rawSpot=(s,p,ctx)=>s.spot?s.spot(p,ctx):undefined;
function toW(r,ctx){const w=r.world?r:ctx.L(r.x,r.y);return{x:w.x,y:w.y,r:r.r,nograde:!!r.nograde}}
function spotFor(st,s,p){const r=rawSpot(s,p,st.ctx);return r?toW(r,st.ctx):null}
function nextTarget(st,p){
  const steps=st.cfg.steps;
  for(let i=st.si;i<steps.length;i++){const r=rawSpot(steps[i],p,st.ctx);if(r===undefined)continue;if(r===null)return null;return toW(r,st.ctx)}
  return null;
}
function flushFails(st,res){
  const fresh=st.ctx.fails.slice(st.lastFail);st.lastFail=st.ctx.fails.length;
  fresh.forEach(f=>{res.ok=false;res.notes.push((f.p?f.p.n+(f.p.me?'（你）':'')+'：':'')+f.why)});
}
function grade(st,s){
  const ctx=st.ctx,me=ctx.me,res={name:s.name,t:s.t,ok:true,notes:[]};
  const sp=spotFor(st,s,me);
  if(sp&&!sp.nograde){const d=dist(me,sp),r=sp.r==null?2.5:sp.r;if(d>r){res.ok=false;res.notes.push('你離正確位置 '+d.toFixed(1)+'m')}}
  if(s.check)(s.check(ctx)||[]).forEach(f=>ctx.fail(f[0],f[1]));
  flushFails(st,res);
  if(s.after)s.after(ctx);
  st.results.push(res);
  return res;
}
function tick(st,dt,input){
  if(st.done)return null;
  const ctx=st.ctx,cfg=st.cfg;ctx.t+=dt;
  for(const p of ctx.players){
    if(p.me&&!st.auto){
      let vx=input.vx,vy=input.vy;
      if(input.ptr&&!vx&&!vy){const dx=input.ptr.x-p.x,dy=input.ptr.y-p.y,d=Math.hypot(dx,dy);
        if(d>.2){const k=Math.min(1,d/(SPEED*dt));vx=dx/d*k;vy=dy/d*k}}
      const m=Math.hypot(vx,vy);if(m>1){vx/=m;vy/=m}
      p.x+=vx*SPEED*dt;p.y+=vy*SPEED*dt;
    }else{
      if(p.lastSi!==st.si){p.lastSi=st.si;p.wait=ctx.t+(p.me?.1:.25+Math.random()*.8)}
      if(ctx.t>=p.wait){const g=nextTarget(st,p);
        if(g){const j=Math.min(.45,(g.r==null?2.5:g.r)*.2),tx=g.x+p.jx*j,ty=g.y+p.jy*j;
          const dx=tx-p.x,dy=ty-p.y,d=Math.hypot(dx,dy);
          if(d>.02){const s=Math.min(d,SPEED*.95*dt);p.x+=dx/d*s;p.y+=dy/d*s}}}
    }
    const r=Math.hypot(p.x,p.y);if(r>R-.4){p.x*=(R-.4)/r;p.y*=(R-.4)/r}
  }
  if(cfg.update)cfg.update(ctx,dt);
  let graded=null;
  while(st.si<cfg.steps.length&&ctx.t>=cfg.steps[st.si].t){graded=grade(st,cfg.steps[st.si]);st.si++}
  if(ctx.t>=cfg.end){st.done=true;if(st.results.length)flushFails(st,st.results[st.results.length-1])}
  return graded;
}
// Headless run with everyone auto-moving; used for self-tests.
function simulate(cfg,meName){
  const st=newState(cfg,meName,true);
  while(!st.done)tick(st,1/30,{vx:0,vy:0,ptr:null});
  return st;
}

// ---------- UI ----------
function run(cfg){
  const W=720,SC=W/2/(R+2.6);
  const X=x=>W/2+x*SC,Y=y=>W/2+y*SC;
  const app=document.getElementById('app');
  app.innerHTML=`<div class="wrap">
  <header><a class="back" href="../">← 回模擬器選單</a><h1>${cfg.title}</h1><span class="sub">${cfg.sub}</span></header>
  <div class="main">
    <div class="stage">
      <div class="castbar"><span class="lbl" id="castName">待機中</span><div class="bar"><i id="castFill"></i></div><span class="clock" id="clock">${fmt(cfg.clock0+(cfg.t0||0))}</span></div>
      <canvas id="cv" width="${W}" height="${W}" tabindex="0" aria-label="場地，用方向鍵或點擊移動"></canvas>
      <p class="help"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 或方向鍵移動，手機按住場地往手指方向走。<kbd>Space</kbd> 開始／再來一次。金色虛線圈是下一步的目標點（練習模式）。</p>
    </div>
    <div class="rail">
      <div class="card"><h2>設定</h2>
        <div class="row">
          <label class="sel" for="slot">職位 <select id="slot"><option value="rand">隨機</option>${ALL.map(n=>`<option>${n}</option>`).join('')}</select></label>
          <label class="sel" for="mode">模式 <select id="mode"><option value="practice">練習</option><option value="test">測驗</option><option value="demo">示範（自動走）</option></select></label>
        </div>
        <div class="row" style="margin-top:10px"><button class="primary" id="go">開始</button></div>
      </div>
      <div class="card"><h2>你的任務</h2><div class="brief" id="brief">按「開始」，會隨機分配點名。</div></div>
      <div class="card"><h2>下一步</h2><p class="nextName" id="nextName">—</p><p class="nextDesc" id="nextDesc"></p></div>
      <div class="card" id="resultCard" hidden><h2>結果</h2><p class="verdict" id="verdict"></p></div>
      <div class="card"><h2>流程</h2><ol class="steps" id="steps"></ol></div>
      <div class="card"><h2>紀錄</h2><div class="stats"><div><b id="sOk">0</b><span>成功</span></div><div><b id="sAll">0</b><span>總次數</span></div><div><b id="sStreak">0</b><span>連勝</span></div></div></div>
    </div>
  </div>
</div>`;
  const $=id=>document.getElementById(id);
  const cv=$('cv'),g=cv.getContext('2d');
  const css=k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const C={gold:css('--gold'),j:css('--justice'),c:css('--chaser'),ok:css('--ok'),bad:css('--bad'),fg:css('--fg'),muted:css('--muted')};
  let st=null,keys={},ptr=null,last=0,flash=null,stats={ok:0,all:0,streak:0};
  try{const s=JSON.parse(localStorage.getItem(cfg.key)||'null');if(s)stats=s}catch(e){}
  const save=()=>{try{localStorage.setItem(cfg.key,JSON.stringify(stats))}catch(e){}};
  const showStats=()=>{$('sOk').textContent=stats.ok;$('sAll').textContent=stats.all;$('sStreak').textContent=stats.streak};

  function start(){
    let me=$('slot').value;if(me==='rand')me=shuffle(ALL)[0];
    st=newState(cfg,me,$('mode').value==='demo');flash=null;
    $('resultCard').hidden=true;$('go').textContent='重新開始';
    renderSteps();cv.focus();
  }
  function renderSteps(){
    const ol=$('steps');ol.innerHTML='';
    cfg.steps.forEach((s,i)=>{
      const li=document.createElement('li');const r=st&&st.results.find(x=>x.name===s.name&&x.t===s.t);
      li.textContent=`${fmt(cfg.clock0+s.t)}　${s.name}`;
      if(r){li.className=r.ok?'ok':'bad';if(r.notes.length){const ul=document.createElement('ul');r.notes.forEach(n=>{const x=document.createElement('li');x.textContent=n;ul.appendChild(x)});li.appendChild(ul)}}
      else if(st&&i===st.si&&!st.done)li.className='now';
      ol.appendChild(li);
    });
  }
  function finish(){
    const ok=st.results.every(r=>r.ok);
    if(!st.auto){stats.all++;if(ok){stats.ok++;stats.streak++}else stats.streak=0;save();showStats()}
    const v=$('verdict');const bad=st.results.filter(r=>!r.ok).length;
    v.textContent=st.auto?'示範結束':(ok?'全部檢查點通過':`${bad} 個檢查點失敗，看流程裡的紅字`);
    v.className='verdict '+(ok?'ok':'bad');$('resultCard').hidden=false;renderSteps();
  }
  function hud(){
    if(!st)return;const ctx=st.ctx,s=cfg.steps[st.si],mode=$('mode').value;
    $('clock').textContent=fmt(cfg.clock0+ctx.t);
    $('brief').innerHTML=cfg.brief(ctx.me,ctx);
    if(s&&!st.done){
      const prev=st.si?cfg.steps[st.si-1].t:(cfg.t0||0);
      $('castName').textContent=s.name;$('castFill').style.width=Math.min(100,(ctx.t-prev)/(s.t-prev)*100)+'%';
      $('nextName').textContent=`${s.name}（${Math.max(0,s.t-ctx.t).toFixed(1)} 秒）`;
      $('nextDesc').textContent=mode==='test'?'測驗模式不顯示提示。':(s.desc?s.desc(ctx.me,ctx):'');
    }else{$('castName').textContent='結束';$('castFill').style.width='100%';$('nextName').textContent='—';$('nextDesc').textContent=''}
  }

  // drawing helpers (world coordinates, metres; north up)
  const H={g,SC,
    P:(u,v)=>st.ctx.L(u,v),
    circle(p,r,fill,stroke,lw,dash){g.beginPath();g.arc(X(p.x),Y(p.y),r*SC,0,Math.PI*2);if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.setLineDash(dash||[]);g.strokeStyle=stroke;g.lineWidth=lw||2;g.stroke();g.setLineDash([])}},
    text(p,s,col,size,dy){g.fillStyle=col||C.fg;g.font=`700 ${size||13}px "Noto Sans TC",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(s,X(p.x),Y(p.y)+(dy||0))},
    line(a,b,col,lw){g.strokeStyle=col;g.lineWidth=lw||2;g.beginPath();g.moveTo(X(a.x),Y(a.y));g.lineTo(X(b.x),Y(b.y));g.stroke()},
    poly(pts,fill,stroke){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(X(p.x),Y(p.y)):g.moveTo(X(p.x),Y(p.y)));g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=1.5;g.stroke()}},
    cone(o,ang,len,half,col){g.fillStyle=col+'55';g.strokeStyle=col;g.lineWidth=1.5;g.beginPath();g.moveTo(X(o.x),Y(o.y));g.arc(X(o.x),Y(o.y),len*SC,ang-half,ang+half);g.closePath();g.fill();g.stroke()},
    boss(p,label,col,shape){g.save();g.translate(X(p.x),Y(p.y));g.fillStyle=col+'33';g.strokeStyle=col;g.lineWidth=3;g.beginPath();
      if(shape==='sq')g.rect(-1.5*SC,-1.5*SC,3*SC,3*SC);else if(shape==='tri'){g.moveTo(0,-1.8*SC);g.lineTo(1.6*SC,1.2*SC);g.lineTo(-1.6*SC,1.2*SC);g.closePath()}else g.arc(0,0,1.7*SC,0,Math.PI*2);
      g.fill();g.stroke();g.fillStyle=col;g.font='700 14px "Noto Sans TC",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(label,0,2.8*SC);g.restore()},
    C};
  function arena(){
    g.clearRect(0,0,W,W);
    const grd=g.createRadialGradient(W/2,W/2,10,W/2,W/2,R*SC);grd.addColorStop(0,'#1b2438');grd.addColorStop(1,'#111827');
    g.fillStyle=grd;g.beginPath();g.arc(W/2,W/2,R*SC,0,Math.PI*2);g.fill();
    g.strokeStyle='#33415f';g.lineWidth=2;
    for(let i=0;i<72;i++){const a=i/72*Math.PI*2;g.beginPath();g.moveTo(X(Math.cos(a)*R),Y(Math.sin(a)*R));g.lineTo(X(Math.cos(a)*(R+.9)),Y(Math.sin(a)*(R+.9)));g.stroke()}
    g.strokeStyle='#3a4a6b';g.beginPath();g.arc(W/2,W/2,R*SC,0,Math.PI*2);g.stroke();
    g.strokeStyle='#1f2a40';g.lineWidth=1;
    for(const r of [6,12]){g.beginPath();g.arc(W/2,W/2,r*SC,0,Math.PI*2);g.stroke()}
    g.beginPath();g.moveTo(X(-R),Y(0));g.lineTo(X(R),Y(0));g.moveTo(X(0),Y(-R));g.lineTo(X(0),Y(R));g.stroke();
    // 外圈 8 個紅點、中圈 1～4、內圈 A～D（北 A/1、東 B/2、南 C/3、西 D/4）
    for(let i=0;i<8;i++){const a=i*Math.PI/4;g.fillStyle='#b83c3c';g.beginPath();g.arc(X(Math.cos(a)*18.3),Y(Math.sin(a)*18.3),.6*SC,0,Math.PI*2);g.fill()}
    const wm=[['A','1',0,-1,'#e05a5a'],['B','2',1,0,'#e0c35a'],['C','3',0,1,'#5aa0e0'],['D','4',-1,0,'#b05ae0']];
    g.font='700 13px "Chakra Petch",sans-serif';g.textAlign='center';g.textBaseline='middle';g.lineWidth=1.5;
    for(const [l,n,x,y,col] of wm){
      g.strokeStyle=col+'aa';g.fillStyle=col;
      g.beginPath();g.arc(X(x*5.6),Y(y*5.6),.9*SC,0,Math.PI*2);g.stroke();g.fillText(l,X(x*5.6),Y(y*5.6));
      g.strokeRect(X(x*14.5)-.9*SC,Y(y*14.5)-.9*SC,1.8*SC,1.8*SC);g.fillText(n,X(x*14.5),Y(y*14.5));
    }
  }
  function draw(){
    arena();
    if(!st){g.fillStyle=C.fg;g.font='700 22px "Noto Sans TC",sans-serif';g.textAlign='center';g.fillText('按「開始」或 Space',W/2,W/2-10);
      g.fillStyle=C.muted;g.font='15px "Noto Sans TC",sans-serif';g.fillText(cfg.idle||'',W/2,W/2+20);return}
    const ctx=st.ctx;
    if(cfg.draw)cfg.draw(H,ctx,'under');
    const mode=$('mode').value;
    if(mode!=='test'&&!st.done){const tg=nextTarget(st,ctx.me);if(tg){g.strokeStyle=C.gold;g.setLineDash([6,5]);g.lineWidth=2;g.beginPath();g.arc(X(tg.x),Y(tg.y),Math.max(1.2,tg.r==null?2.5:tg.r)*SC,0,Math.PI*2);g.stroke();g.setLineDash([])}}
    for(const p of ctx.players){
      const px=X(p.x),py=Y(p.y),r=p.me?13:10;
      g.fillStyle=p.role==='TH'?(p.n[0]==='H'?'#3fae6a':'#3d6fd6'):'#c2464a';
      g.strokeStyle=p.me?C.gold:'#0a0e16';g.lineWidth=p.me?3:2;
      g.beginPath();g.arc(px,py,r,0,Math.PI*2);g.fill();g.stroke();
      g.fillStyle='#fff';g.font=`700 ${p.me?12:10}px "Chakra Petch",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(p.n,px,py+1);
      const tag=cfg.tag?cfg.tag(p,ctx):'';
      if(tag){g.font='700 12px "Noto Sans TC",sans-serif';const w=g.measureText(tag).width+8;g.fillStyle='#0a0e16cc';g.fillRect(px-w/2,py-r-21,w,16);g.fillStyle=C.gold;g.fillText(tag,px,py-r-12)}
      if(p.me){g.fillStyle=C.gold;g.font='700 12px "Noto Sans TC",sans-serif';g.fillText('你',px,py+r+11)}
    }
    if(cfg.draw)cfg.draw(H,ctx,'over');
    if(flash&&ctx.t-flash.t<1.6){g.fillStyle=flash.ok?C.ok:C.bad;g.font='700 22px "Noto Sans TC",sans-serif';g.textAlign='center';g.fillText((flash.ok?'✓ ':'✗ ')+flash.name,W/2,34)}
  }
  function loop(ts){
    const dt=Math.min(.05,(ts-(last||ts))/1000);last=ts;
    if(st&&!st.done){
      const vx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),vy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
      const res=tick(st,dt,{vx,vy,ptr});
      if(res){flash={t:st.ctx.t,ok:res.ok,name:res.name};renderSteps()}
      if(st.done)finish();
      hud();
    }
    draw();requestAnimationFrame(loop);
  }
  addEventListener('keydown',e=>{const k=e.key.toLowerCase();
    if(k===' '&&document.activeElement.tagName!=='SELECT'&&document.activeElement.tagName!=='BUTTON'){e.preventDefault();if(!st||st.done)start();return}
    if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(k)){if(document.activeElement.tagName!=='SELECT')e.preventDefault();keys[k]=true}});
  addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
  addEventListener('blur',()=>{keys={};ptr=null});
  const toWorld=e=>{const r=cv.getBoundingClientRect();return{x:((e.clientX-r.left)/r.width*W-W/2)/SC,y:((e.clientY-r.top)/r.height*W-W/2)/SC}};
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptr=toWorld(e)});
  cv.addEventListener('pointermove',e=>{if(ptr)ptr=toWorld(e)});
  const up=()=>{ptr=null};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  $('go').addEventListener('click',start);
  showStats();renderSteps();requestAnimationFrame(loop);
}

const api={run,simulate,newState,tick,shuffle,dist,TH,DD,ALL,R};
if(typeof window!=='undefined')window.Drill=api;
if(typeof module!=='undefined')module.exports=api;
})();
