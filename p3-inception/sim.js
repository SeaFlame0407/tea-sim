/* P3 時空潛行（ぬけまる式巨集＋ぬけまる解說影片截圖）
   Local frame: Prime at top (v<0), 黑貓/真心 at bottom, Justice left (u<0), Chaser right.
   Each run randomly puts Prime north (12) or south (6); Justice is always west (9), Chaser east (3), 黑貓 opposite Prime.
   Time t=0 is 0:55 (時空潛行 cast). Coordinates in metres, arena radius 20. */
(function(){
const {DD,ALL,shuffle,dist}=Drill;
const CIRC=['①','②','③','④'];
// 綠球出現位置：Justice 側上方兩顆（1、2），Chaser 側下方兩顆（3、4）
const ORB_SPAWN={1:[-18.5,-13],2:[-19.4,-8.4],3:[20.3,2.8],4:[19.2,7.5]};
// 綠球放置點（亞歷山大側）：1→① Chaser 側中段、2→② Chaser 側上方、3→③ Justice 側中段、4→④ Justice 側上方
const DROP={1:[16.8,-7.1],2:[6.8,-16.8],3:[-17.1,-7.1],4:[-7.2,-17.1]};
// 結晶：內側在 C 標記兩旁，外側在南邊紅點兩旁；L = Justice 側（西）
const STAR={iL:[-5.5,5.5],iR:[5.5,5.5],oL:[-5.5,17],oR:[5.5,17]};
const CRYSTAL_R=4.8,HEART_REACH=6.4,ORB_SPEED=2.4;
const J_POS=[-19.5,0],C_POS=[19.5,0];
const orbR=t=>Math.max(3,8-.4*(t-7));
const DEB={bolt:'加重罰',stack:'集團罰',blue:'接近禁止'};
const isNine=p=>p.n==='MT'||p.n==='ST'||p.deb==='stack';
const heartVec=c=>({x:Math.cos(c.heartAng),y:Math.sin(c.heartAng)});
const Wd=(x,y,r)=>({x,y,r,world:true});
const jSign=c=>Math.sign(c.L(...J_POS).x); // -1 = Justice 在西，1 = 在東
const Wm=(c,x,y,r)=>Wd(-jSign(c)*x,y,r); // 以「Justice 在西」寫的世界座標，Justice 在東時左右鏡像
const side=k=>k[1]==='L'?'Justice 側':'Chaser 側';
const FLAME={MT:[-14.4,0],ST:[-17.5,5.5],group:[-13,-12.5]};
const orbAlive=(c,p)=>c.orbs.some(o=>o.p===p&&o.alive);
const flameSpot=p=>p.n==='MT'?FLAME.MT:p.n==='ST'?FLAME.ST:FLAME.group;

Drill.run({
  key:'teaP3inception',
  title:'絕亞歷山大 <span>P3</span> · 時空潛行',
  sub:'依ぬけまる式練習：綠球、審判の結晶、大火焰放射、真心後散開、Chaser 誘導。',
  idle:'亞歷山大南北隨機，Justice 固定西（9 點）、Chaser 固定東（3 點）',
  t0:5,end:66,clock0:55,
  frame:()=>Math.random()<.5?{rot:0,mx:1}:{rot:Math.PI,mx:-1}, // 只翻南北，Justice 永遠在西
  setup(c){
    for(const p of c.players){const w=c.L((Math.random()-.5)*7,(Math.random()-.5)*7);p.x=w.x;p.y=w.y}
    const teth=shuffle(ALL).slice(0,4);
    c.orbs=teth.map((n,i)=>{const p=c.by[n];p.orb=i+1;const s=c.L(...ORB_SPAWN[i+1]);return{k:i+1,p,x:s.x,y:s.y,alive:true,boom:null}});
    const free=ALL.filter(n=>!teth.includes(n)).map(n=>c.by[n]),inner=[],outer=[];
    free.filter(p=>p.role==='TH').forEach(p=>(inner.length<2?inner:outer).push(p));
    free.filter(p=>p.role==='DD').forEach(p=>(outer.length<2?outer:inner).push(p));
    inner.forEach((p,i)=>p.star=i?'iR':'iL');outer.forEach((p,i)=>p.star=i?'oR':'oL');
    const dd=shuffle(DD);c.by[dd[0]].deb='bolt';c.by[dd[1]].deb='bolt';c.by[dd[2]].deb='stack';c.by[dd[3]].deb='blue';
    c.by[shuffle(['MT','ST'])[0]].deb='blue';
    c.heartAng=(Math.random()*8|0)*Math.PI/4;
    c.crystals=[];
  },
  update(c,dt){
    if(c.t<7)return;
    for(const o of c.orbs){
      if(!o.alive)continue;
      const dx=o.p.x-o.x,dy=o.p.y-o.y,d=Math.hypot(dx,dy);
      if(d<1.2){
        const r=orbR(c.t);o.alive=false;o.boom={x:o.x,y:o.y,r,t:c.t};
        for(const q of c.players)if(q!==o.p&&dist(q,o)<r)c.fail(q,`被${CIRC[o.k-1]}號綠球的爆炸波及`);
      }else{const s=Math.min(d,ORB_SPEED*dt);o.x+=dx/d*s;o.y+=dy/d*s}
    }
  },
  tag(p,c){
    if(c.t>=38&&p.deb)return DEB[p.deb];
    if(c.t>=7&&p.orb)return '線'+CIRC[p.orb-1];
    if(c.t>=14&&p.star)return '★';
    return '';
  },
  brief(me,c){
    const L=[];
    if(c.t<7)L.push('等綠球連線（1:02）');
    else if(me.orb)L.push(`綠球：你連到 <b>${CIRC[me.orb-1]}</b> → 拉到亞歷山大側的 <b>${CIRC[me.orb-1]}</b>`);
    else L.push('綠球：沒有連線 → 先去黑貓側，準備放結晶');
    if(c.t>=14&&me.star)L.push(`結晶：<b>${me.star[0]==='i'?'內側（C 標記旁）':'外側（南邊紅點旁）'}・${side(me.star)}</b>`);
    L.push(`大火焰放射：${me.n==='MT'?'<b>Justice 正面</b>':me.n==='ST'?'<b>Justice 的真心側</b>':'<b>Justice 的亞歷山大側</b>（6 人）'}`);
    if(c.t>=38)L.push(`Debuff：<b>${me.deb?DEB[me.deb]:'無'}</b> → 先回中央，真心消失處為 12 點，去 <b>${isNine(me)?'9 點':'3 點'}</b>`);
    return L.map(x=>`<div>${x}</div>`).join('');
  },
  steps:[
    {t:20,name:'放結晶／拉綠球',
      spot(p,c){
        if(p.orb)return c.t>=7?{x:DROP[p.orb][0],y:DROP[p.orb][1],r:3}:null;
        if(c.t<7)return null;
        if(c.t<14)return{x:0,y:12,r:6};
        return{x:STAR[p.star][0],y:STAR[p.star][1],r:1.8}},
      desc(p,c){if(c.t<7)return'等綠球連線。';if(p.orb)return`把綠球拉到 ${CIRC[p.orb-1]}，站好等它撞上。`;if(c.t<14)return'沒連線，先往黑貓側走，等結晶點名。';return`到 ${p.star[0]==='i'?'內側（C 標記旁）':'外側（南邊紅點旁）'}・${side(p.star)} 放結晶，四個圈不能重疊、也不能離中線太遠。`},
      check(c){const out=[],cr=c.players.filter(p=>p.star);
        for(let i=0;i<cr.length;i++)for(let j=i+1;j<cr.length;j++){const d=dist(cr[i],cr[j]);if(d<CRYSTAL_R*2+.2){out.push([cr[i],`結晶和 ${cr[j].n} 重疊（${d.toFixed(1)}m），立即引爆`])}}
        for(const p of cr){const u=Math.abs(c.toLocal(p.x,p.y).u);if(u>HEART_REACH)out.push([p,`結晶離中線太遠（${u.toFixed(1)}m），真心碰不到，變不成金色真心`])}
        return out},
      after(c){c.crystals=c.players.filter(p=>p.star).map(p=>({x:p.x,y:p.y}))}},
    {t:25,name:'真心碰結晶',
      spot(p,c){if(p.orb)return orbAlive(c,p)?{x:DROP[p.orb][0],y:DROP[p.orb][1],r:3}:{x:0,y:-8,r:6,nograde:true};return{x:0,y:-8,r:6}},
      desc(p,c){if(p.orb)return orbAlive(c,p)?`留在 ${CIRC[p.orb-1]} 等綠球撞上。`:'綠球已經撞上，可以離開，回亞歷山大正面集合（不要往黑貓側走）。';return'放完結晶跑到亞歷山大正面集合，遠離結晶。'},
      check(c){return c.players.filter(p=>c.toLocal(p.x,p.y).v>0).map(p=>[p,'真心碰到結晶時還在黑貓側（距離衰減傷害）'])}},
    {t:31,name:'大火焰放射',
      spot(p){const s=flameSpot(p);return{x:s[0],y:s[1],r:p.n==='MT'||p.n==='ST'?2.5:4}},
      desc(p){return p.n==='MT'?'站 Justice 正面誘導火焰。':p.n==='ST'?'站 Justice 的真心側誘導火焰。':'在 Justice 的亞歷山大側集合（6 人）。'},
      check(c){const out=[],J=c.L(...J_POS),n3=c.players.slice().sort((a,b)=>dist(a,J)-dist(b,J)).slice(0,3);
        c.flames=n3.map(p=>Math.atan2(p.y-J.y,p.x-J.x));
        for(const n of ['MT','ST'])if(!n3.includes(c.by[n]))out.push([c.by[n],'沒搶到大火焰放射，火焰打進人群']);
        for(const o of c.orbs)if(o.alive)out.push([o.p,'綠球還沒撞上']);
        return out}},
    {t:39,name:'Debuff 後回中央',
      spot(){return{x:0,y:0,r:4.5}},
      desc(){return'拿到 Debuff，先回場地中央，看金色真心往哪飛。'}},
    {t:53,name:'十字の秘蹟＋Debuff 判定',
      spot(p,c){if(c.t<40)return{x:0,y:0,r:4.5,nograde:true};const h=heartVec(c),d=isNine(p)?[h.y,-h.x]:[-h.y,h.x];return Wd(d[0]*15,d[1]*15,3)},
      desc(p,c){if(c.t<40)return'在中央等金色真心往外飛，它消失的方向就是 12 點。';return isNine(p)?'去 9 點：坦克兩人＋集團罰 DPS 分攤。':'去 3 點：補師兩人＋其他 DPS。'},
      check(c){
        const out=[],h=heartVec(c),ps=c.players;
        const blue=ps.filter(p=>p.deb==='blue');if(dist(blue[0],blue[1])<16)blue.forEach(p=>out.push([p,`接近禁止兩人只相距 ${dist(blue[0],blue[1]).toFixed(1)}m`]));
        const s=ps.find(p=>p.deb==='stack'),near=ps.filter(p=>dist(p,s)<3.5);
        if(near.length<3)out.push([s,`集團罰只有 ${near.length} 人分攤`]);
        near.filter(p=>p.deb==='bolt').forEach(p=>out.push([p,'加重罰被集團罰波及']));
        for(const p of ps){const perp=Math.abs(p.x*h.y-p.y*h.x),along=p.x*h.x+p.y*h.y;if(perp<3||Math.abs(along-19)<3)out.push([p,'被十字の秘蹟打中'])}
        return out}},
    {t:58,name:'アルファソード',
      spot(p,c){if(p.deb==='blue'&&p.role==='DD')return Wm(c,0,-2.8,1.2);if(p.n==='H1')return Wm(c,-2.8,0,1.2);if(p.n==='H2')return Wm(c,0,2.8,1.2);if(p.n==='MT')return undefined;return Wm(c,5.5,0,2)},
      desc(p,c){const w=jSign(c)<0;if(p.deb==='blue'&&p.role==='DD')return'貼 Chaser 北邊誘導一刀。';if(p.n==='H1')return`貼 Chaser ${w?'西':'東'}邊（Justice 那側）誘導一刀。`;if(p.n==='H2')return'貼 Chaser 南邊誘導一刀。';if(p.n==='MT')return`去 Justice 對面（${w?'東':'西'}側）場邊，準備誘導超級跳（開減傷）。`;return`在 ${w?'B':'D'} 標記待機，不要搶刀。`},
      check(c){const o={x:0,y:0},n3=c.players.slice().sort((a,b)=>dist(a,o)-dist(b,o)).slice(0,3);
        c.swords=n3.map(p=>Math.atan2(p.y,p.x));
        return n3.filter(p=>p.deb==='bolt'||p.deb==='stack').map(p=>[p,'帶易傷時被アルファソード打中'])}},
    {t:62,name:'超級跳',
      spot(p,c){return p.n==='MT'?Wm(c,17,0,3):Wd(0,0,3.5)},
      desc(p){return p.n==='MT'?'留在 Justice 對面的場邊吃超級跳。':'三刀出完回 Chaser 腳下，避免擊退。'},
      check(c){const J=c.L(...J_POS),far=c.players.slice().sort((a,b)=>dist(b,J)-dist(a,J))[0],out=[];
        c.jumpAt={x:far.x,y:far.y};
        if(far.n!=='MT')out.push([far,'離 Justice 最遠，被超級跳跳到']);
        c.players.filter(p=>p!==far&&Math.hypot(p.x,p.y)>3.5&&dist(p,far)<10).forEach(p=>out.push([p,'沒回 Chaser 腳下，被擊退']));
        return out}},
  ],
  draw(H,c,layer){
    const t=c.t,P=H.P,C=H.C;
    if(layer==='under'){
      for(let k=1;k<=4;k++){const p=P(...DROP[k]);H.circle(p,1.4,'#46e07a18','#46e07a88',1.5);H.text(p,CIRC[k-1],'#7ef0a0',16)}
      for(const k in STAR){const p=P(...STAR[k]);H.text(p,'★','#f2d06b',18)}
      for(const o of c.orbs)if(o.boom){H.circle(o.boom,o.boom.r,t-o.boom.t<.8?'#46e07a66':'#3b2a4a88',null)}
      if(t>=14&&t<20)for(const p of c.players)if(p.star)H.circle(p,CRYSTAL_R,'#ff6a5a22','#ff6a5a',2,[5,4]);
      for(const k of c.crystals)H.circle(k,CRYSTAL_R,'#7fd3ff33','#7fd3ff',2);
      H.boss(P(...J_POS),'Justice',C.j,'sq');
      if(t<43){H.boss(P(0,-19.5),'亞歷山大','#e3b04f','circle');H.boss(P(...C_POS),'Chaser',C.c,'tri')}
      if(t<51)H.boss(P(0,19.5),'黑貓',C.muted,'circle');
      if(t>=20&&t<38){const v=Math.max(2,19-3*(t-20)),gold=v<=5.5;H.circle(P(0,v),1.1,gold?'#f2d06b':'#ff8fb3',null);H.text(P(0,v),gold?'金色真心':'真心',gold?'#f2d06b':'#ff8fb3',12,-20)}
      if(t>=38&&t<51){const h=heartVec(c),k=Math.max(0,t-40)/11*19,p={x:h.x*k,y:h.y*k};H.circle(p,1.2,'#f2d06b',null);H.text(p,'金色真心','#f2d06b',12,-20)}
      if(t>=31&&t<32.6&&c.flames){const J=P(...J_POS);for(const a of c.flames)H.cone(J,a,34,Math.PI/14,C.j)}
      if(t>=53){const h=heartVec(c),pr={x:h.x*19,y:h.y*19};
        if(t<54.6){const n={x:-h.y,y:h.x},w=3,L=40;
          H.poly([{x:pr.x+n.x*w,y:pr.y+n.y*w},{x:pr.x+n.x*w-h.x*L,y:pr.y+n.y*w-h.y*L},{x:pr.x-n.x*w-h.x*L,y:pr.y-n.y*w-h.y*L},{x:pr.x-n.x*w,y:pr.y-n.y*w}],'#e3b04f44','#e3b04f');
          H.poly([{x:pr.x+h.x*w+n.x*L,y:pr.y+h.y*w+n.y*L},{x:pr.x+h.x*w-n.x*L,y:pr.y+h.y*w-n.y*L},{x:pr.x-h.x*w-n.x*L,y:pr.y-h.y*w-n.y*L},{x:pr.x-h.x*w+n.x*L,y:pr.y-h.y*w+n.y*L}],'#e3b04f44','#e3b04f')}
        H.boss(pr,'亞歷山大','#e3b04f','circle');H.boss({x:0,y:0},'Chaser',C.c,'tri')}
      if(t>=58&&t<59.6&&c.swords)for(const a of c.swords)H.cone({x:0,y:0},a,14,Math.PI/9,C.c);
      if(t>=62&&t<63.6&&c.jumpAt)H.circle(c.jumpAt,10,'#f0873a33','#f0873a',2);
    }else{
      if(t>=7)for(const o of c.orbs)if(o.alive){H.line(o,o.p,'#46e07a',2);H.circle(o,orbR(t),'#46e07a33','#46e07a',2);H.text(o,CIRC[o.k-1],'#b6ffcc',14)}
    }
  }
});
})();
