/* P3 次元斷絕（ぬけまる式，依ぬけまる解說影片截圖）
   World coordinates, north up. 亞歷山大 always south; Justice/Chaser appear NE or NW at random.
   Odd numbers work the west side, even numbers the east side. t=0 is 2:35 (サイコロ＋チャクラム). */
(function(){
const {DD,shuffle,dist}=Drill;
const NUM='①②③④⑤⑥⑦⑧';
const CHASER_IMG=typeof Image!=='undefined'?Object.assign(new Image(),{src:'img/chaser.png'}):null;
// Chaser 示意圖（圖片裁自ぬけまる解說影片截圖）
const ASIDE=`<div class="card"><h2>Chaser 怎麼打</h2>
  <div class="chaserfig"><img src="img/chaser.png" alt="Chaser（紅色機體）"><p>Chaser 依號碼順序處理：<b>奇數</b>號吃アルファソード（扇形），<b>偶數</b>號吃突進（擊退）。</p></div>
  <div class="chaserdia">
    <figure><svg viewBox="0 0 120 110" role="img" aria-label="奇數：Chaser 在你背後朝你面向揮扇形">
      <path d="M60 78 L18 8 A80 80 0 0 1 102 8 Z" fill="#46c1e633" stroke="#46c1e6"/>
      <image href="img/chaser.png" x="44" y="72" width="32" height="34"/>
      <circle cx="60" cy="52" r="8" fill="#3d6fd6" stroke="#e3b04f" stroke-width="2"/>
      <path d="M60 36 l-5 8 h10z" fill="#e3b04f"/>
      <text x="60" y="56" font-size="9" fill="#fff" text-anchor="middle" font-weight="700">1</text>
      <text x="60" y="16" font-size="8" fill="#e7ecf4" text-anchor="middle">場外（外圈）↑</text>
    </svg><figcaption>奇數：Chaser 出現在你<b>背後</b>，朝你面向揮扇形 → <b>正面朝外圈</b>，才不會掃到隊友。</figcaption></figure>
    <figure><svg viewBox="0 0 120 110" role="img" aria-label="偶數：Chaser 從上一個奇數的位置衝向你">
      <image href="img/chaser.png" x="4" y="30" width="30" height="32"/>
      <line x1="30" y1="46" x2="92" y2="46" stroke="#46c1e6" stroke-width="7" opacity=".55"/>
      <line x1="30" y1="46" x2="92" y2="46" stroke="#fff" stroke-width="1.5"/>
      <circle cx="98" cy="46" r="8" fill="#c2464a" stroke="#e3b04f" stroke-width="2"/>
      <path d="M82 46 l8 -5 v10z" fill="#e3b04f"/>
      <text x="98" y="50" font-size="9" fill="#fff" text-anchor="middle" font-weight="700">2</text>
      <circle cx="98" cy="46" r="12" fill="none" stroke="#7fe3ff" stroke-width="2"/>
      <text x="60" y="80" font-size="8" fill="#e7ecf4" text-anchor="middle">從 1 號的位置衝過來</text>
      <text x="60" y="94" font-size="8" fill="#7fe3ff" text-anchor="middle">開防擊退 或 面向 Chaser</text>
    </svg><figcaption>偶數：Chaser 從<b>上一個奇數號</b>的位置衝向你 → 開防擊退（F）或面向它；路線上不要站人。</figcaption></figure>
  </div></div>`;
const RED={NW:[-12.9,-12.9],NE:[12.9,-12.9],SW:[-12.9,12.9],SE:[12.9,12.9]};
const HALF={SW:[-12.2,12.2],SE:[12.2,12.2]}; // 3、4 號站紅點的一半（不站最外）
const OUT={SW:[-14.4,14.4],SE:[14.4,14.4]};  // 被超級跳後往外一步
const W_HI=[-18.5,-1.5],W_LO=[-18.5,1.5],E_HI=[18.5,-1.5],E_LO=[18.5,1.5];
const ROOM_R=[6.8,5.5,3.5];
const RAY_LEN=27,RAY_HALF=27*Math.PI/180;
// c.s = 1：Justice 在東北；-1：Justice 在西北（超級跳和アポカリ左右對調）
// c.w = 1：懺悔の間在西偏北＋東偏南；-1：西偏南＋東偏北（隨機）。生成後第 10、14、18 秒判定
// c.wheel = 1：第二個輪子（蒸汽戰輪）在東；-1：在西。北邊那個固定。只影響畫面，十字範圍一樣。
const room=(c,side)=>side==='L'?[-11,-4.7*c.w]:[11,4.7*c.w];
const jumpNum=c=>c.s>0?3:4, rayNum=c=>c.s>0?2:1;
const STEP_IN=[[5,6],[7,8],[1,2]];
const ROUTE={
  1:'北西紅點，面向外圈 → 懺悔①後沿外圈到 9 點 → 踩左邊第 3 次懺悔',
  2:'東北紅點，面向外圈 → 懺悔①後沿外圈到 3 點 → 踩右邊第 3 次懺悔',
  3:'西南紅點的一半（不站最外）→ 被超級跳就往外一步 → 扇形後到 9 點',
  4:'東南紅點的一半（不站最外）→ 被超級跳就往外一步 → 突進後到 3 點',
  5:'北西（1 號下方）→ チャクラム飛出後到 9 點踩第 1 次懺悔 → 北西紅點推扇形 → 回 9 點',
  6:'東北（2 號下方）→ チャクラム飛出後到 3 點踩第 1 次懺悔 → 東北紅點誘導突進 → 回 3 點',
  7:'北西（5 號下方）→ チャクラム飛出後到 9 點 → 踩第 2 次懺悔 → 西南紅點推扇形',
  8:'東北（6 號下方）→ チャクラム飛出後到 3 點 → 踩第 2 次懺悔 → 東南紅點誘導突進'};
const AMULET={1:'到紅點後',2:'到紅點後（突進前 6 秒內）',3:'Justice 起跳時',4:'Justice 起跳時',5:'踩完第 1 次懺悔',6:'踩完第 1 次懺悔',7:'踩完第 2 次懺悔',8:'踩完第 2 次懺悔'};
const P=(xy,r,nograde)=>({x:xy[0],y:xy[1],r:r==null?2.5:r,nograde:!!nograde});
const odd=p=>p.num%2===1;
// 每個檢查點每個號碼該站的位置
function spotAt(k,p,c){
  const n=p.num,o=odd(p),sideRoom=o?'L':'R';
  const roomEdge1=o?[-16.5,-5*c.w]:[16.5,5*c.w], roomEdge2=o?[-15,-3*c.w]:[14.5,6.2*c.w];
  const hi=o?W_HI:E_HI,lo=o?W_LO:E_LO,red2=o?RED.NW:RED.NE,red3=o?RED.SW:RED.SE;
  const jumped=n===jumpNum(c);
  switch(k){
    case 'spread':return P({1:RED.NW,2:RED.NE,3:HALF.SW,4:HALF.SE,5:[-16.5,-9.5],6:[16.5,-9.5],7:[-17.8,-7.4],8:[17.8,-7.4]}[n]);
    case 'jump':
      if(n<=2)return P(n===1?RED.NW:RED.NE,2);
      if(n<=4)return P(n===3?HALF.SW:HALF.SE,2);
      if(n<=6)return P(roomEdge1,3,true);
      return P(o?[-19,0]:[19,0],3,true);
    case 'ray':
      if(n<=2)return P(n===1?RED.NW:RED.NE,2);
      if(n<=4)return jumped?P(n===3?OUT.SW:OUT.SE,2):P(n===3?HALF.SW:HALF.SE,2);
      if(n<=6)return P(roomEdge1,3,true);
      return P(o?[-19,0]:[19,0],3,true);
    case 'room1':
      if(n<=2)return P(n===1?RED.NW:RED.NE,2.5);
      if(n<=4)return P(n===3?(jumped?OUT.SW:HALF.SW):(jumped?OUT.SE:HALF.SE),3);
      if(n<=6)return P(roomEdge1,ROOM_R[0]-1);
      return P(o?[-19,0]:[19,0],2.5);
    case 'cross': // 只判定十字範圍，不檢查站位（大家都在移動中）
      if(n<=2)return P(hi,3,true);
      if(n<=4)return P(lo,3,true);
      if(n<=6)return P(red2,2.5,true);
      return P(roomEdge2,3,true);
    case 'room2':
      if(n<=2)return P(hi,3);
      if(n<=4)return P(lo,3);
      if(n<=6)return P(red2,2.5);
      return P(roomEdge2,ROOM_R[1]-1);
    case 'room3':
      if(n<=2)return P(room(c,sideRoom),ROOM_R[2]-1);
      if(n<=4)return P(lo,3);
      if(n<=6)return P(hi,3);
      return P(red3,3);
  }
}
function roomCheck(k){
  return c=>{const out=[];
    for(const p of c.players){
      const L=room(c,'L'),R=room(c,'R');
      const inL=dist(p,{x:L[0],y:L[1]})<ROOM_R[k],inR=dist(p,{x:R[0],y:R[1]})<ROOM_R[k];
      const must=STEP_IN[k].includes(p.num);
      if(must&&!(odd(p)?inL:inR))out.push([p,'沒踩到懺悔の間（全體傷害）']);
      if(!must&&(inL||inR))out.push([p,'誤踩懺悔の間']);
    }
    return out};
}
function inRay(c,p){
  if(!c.ray)return false;const o=c.ray.o,dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy);
  if(d<3||d>RAY_LEN)return false;let da=Math.atan2(dy,dx)-c.ray.a;da=Math.atan2(Math.sin(da),Math.cos(da));return Math.abs(da)<=RAY_HALF;
}
const rayCheck=c=>c.players.filter(p=>inRay(c,p)).map(p=>[p,'被アポカリティックレイ打中']);
// Chaser：奇數＝出現在玩家正背後，朝玩家面向放 90 度扇形；偶數＝從上一個號碼的位置往玩家直線衝鋒，
// 沒面向 Chaser 又沒開防擊退會被擊飛（這裡算死亡）。
const CONE_LEN=12,CONE_HALF=Math.PI/4;
const angDiff=(a,b)=>{const d=a-b;return Math.abs(Math.atan2(Math.sin(d),Math.cos(d)))};
function segDist(q,a,b){const vx=b.x-a.x,vy=b.y-a.y,L=vx*vx+vy*vy||1;let k=((q.x-a.x)*vx+(q.y-a.y)*vy)/L;k=Math.max(0,Math.min(1,k));return Math.hypot(q.x-a.x-k*vx,q.y-a.y-k*vy)}
const byNum=(c,n)=>c.players.find(q=>q.num===n);
function chaserCone(n){return c=>{
  const p=byNum(c,n),f=c.faceOf(p),o={x:p.x-Math.cos(f)*1.5,y:p.y-Math.sin(f)*1.5};
  c.fx.push({kind:'cone',o,a:f,t:c.t});c.prevOdd={x:p.x,y:p.y};c.chaserAt=o;
  return c.players.filter(q=>{if(q===p)return false;const d=dist(q,o);return d<CONE_LEN&&angDiff(Math.atan2(q.y-o.y,q.x-o.x),f)<=CONE_HALF})
    .map(q=>[q,`被 ${NUM[n-1]} 號的アルファソード波及`])}}
function chaserDash(n){return c=>{
  const p=byNum(c,n),a=c.prevOdd,b={x:p.x,y:p.y};
  c.fx.push({kind:'dash',a,b,t:c.t});c.chaserAt=b;
  const out=c.players.filter(q=>q!==p&&q.num!==n-1&&segDist(q,a,b)<1.5).map(q=>[q,`被 ${NUM[n-1]} 號的超級摧毀者衝擊撞到`]);
  const facing=angDiff(c.faceOf(p),Math.atan2(a.y-p.y,a.x-p.x))<=Math.PI/3;
  if(!facing&&!c.kbActive(p))out.push([p,'被超級摧毀者衝擊擊飛（沒開防擊退，也沒面向 Chaser）']);
  return out}}
// 被衝的人在突進前留在原位（不另外檢查站位）
const holdFor=(n,key)=>(p,c)=>p.num===n?Object.assign(spotAt(key,p,c),{nograde:true}):undefined;
const dashDesc=n=>(p)=>p.num===n?'Chaser 要衝向你：防擊退要開著（F），或面向 Chaser 過來的方向。':'不要站在 Chaser 突進的路線上。';
const marked=c=>c.players.filter(p=>p.count).sort((a,b)=>a.n.localeCompare(b.n));
const D={
  spread:{1:'到北西紅點，面向外圈。',2:'到東北紅點，面向外圈。',3:'到西南紅點的一半，不要站最外。',4:'到東南紅點的一半，不要站最外。',5:'到北西、1 號下方。',6:'到東北、2 號下方。',7:'到北西、5 號下方。',8:'到東北、6 號下方。'},
  jump:{1:'留在北西紅點，Chaser 會在你背後出現推扇形。',2:'留在東北紅點等突進。',3:'站在紅點的一半等超級跳。',4:'站在紅點的一半等超級跳。',5:'チャクラム飛出後往 9 點，準備踩第 1 次懺悔。',6:'チャクラム飛出後往 3 點，準備踩第 1 次懺悔。',7:'チャクラム飛出後往 9 點。',8:'チャクラム飛出後往 3 點。'},
  ray:{1:'留在紅點，アポカリ誘導確定前不要大動。',2:'留在紅點，アポカリ誘導確定前不要大動。',3:'被跳的話往外一步避開アポカリ，沒被跳就站著。',4:'被跳的話往外一步避開アポカリ，沒被跳就站著。',5:'在 9 點懺悔邊緣等。',6:'在 3 點懺悔邊緣等。',7:'在 9 點等，不要踩懺悔。',8:'在 3 點等，不要踩懺悔。'},
  room1:{1:'還在紅點，懺悔①之後再走。',2:'還在紅點，懺悔①之後再走。',3:'留在原地處理扇形，不要急著跑。',4:'留在原地等突進，不要急著跑。',5:'踩左邊懺悔的邊緣（第 1 次）。',6:'踩右邊懺悔的邊緣（第 1 次）。',7:'在 9 點等，不要踩。',8:'在 3 點等，不要踩。'},
  cross:{1:'沿外圈到 9 點。',2:'沿外圈到 3 點。',3:'處理完到 9 點。',4:'處理完到 3 點。',5:'到北西紅點推扇形。',6:'到東北紅點誘導突進。',7:'走到左邊懺悔的邊緣準備第 2 次。',8:'走到右邊懺悔的邊緣準備第 2 次。'},
  room2:{1:'在 9 點等。',2:'在 3 點等。',3:'在 9 點等。',4:'在 3 點等。',5:'在北西紅點推扇形，面向外圈。',6:'在東北紅點誘導突進。',7:'踩左邊懺悔的邊緣（第 2 次）。',8:'踩右邊懺悔的邊緣（第 2 次）。'},
  room3:{1:'踩左邊懺悔（第 3 次）。',2:'踩右邊懺悔（第 3 次）。',3:'在 9 點等。',4:'在 3 點等。',5:'回 9 點。',6:'回 3 點。',7:'到西南紅點推扇形。',8:'到東南紅點誘導突進。'}};
const stepDesc=k=>(p,c)=>{
  const n=p.num;let s=D[k][n];
  if(k==='jump'&&n===jumpNum(c))s='超級跳會跳你，站在紅點的一半等。';
  if((k==='jump'||k==='ray')&&n===rayNum(c))s='你在超級跳的對角，留在紅點誘導アポカリ，確定前不要動。';
  return s;
};

Drill.run({
  key:'teaP3wormhole',
  title:'絕亞歷山大 <span>P3</span> · 次元斷絕',
  sub:'依ぬけまる式練習：依號碼散開、超級跳與アポカリ、懺悔の間 5・6 → 7・8 → 1・2、浄化の熱線分攤、生命計算數。',
  idle:'亞歷山大固定南邊；Justice、輪子、懺悔の間位置隨機',
  t0:0,end:41,clock0:155,
  frame:()=>({rot:0,mx:1}),
  pick:{label:'號碼',options:[1,2,3,4,5,6,7,8].map(n=>[n,NUM[n-1]+(n%2?' 奇數':' 偶數')])},
  aside:ASIDE,
  setup(c){
    c.s=Math.random()<.5?1:-1;
    c.w=Math.random()<.5?1:-1;
    c.wheel=Math.random()<.5?1:-1;
    c.justice={x:14*c.s,y:-14};c.chaser={x:-14*c.s,y:-14};
    let nums=shuffle([1,2,3,4,5,6,7,8]);
    const want=+c.pick;
    if(want>=1&&want<=8){nums=nums.filter(n=>n!==want);nums.splice(c.players.indexOf(c.me),0,want)}
    c.players.forEach((p,i)=>{p.num=nums[i];p.x=(Math.random()-.5)*5;p.y=(Math.random()-.5)*5});
    c.fx=[];c.chaserAt=null;c.prevOdd=null;
    shuffle(DD).slice(0,2).forEach(n=>c.by[n].count=true);
  },
  tagSize:26,
  tagColor:p=>p.num%2?'#6aa8ff':'#ff6a7a',
  tag(p,c){return NUM[p.num-1]+(c.t>=29&&p.count?' 計':'')},
  brief(me,c){
    const n=me.num,L=[`號碼：<b>${NUM[n-1]}</b>（${n%2?'奇數・西側':'偶數・東側'}）`,`路線：${ROUTE[n]}`,`防擊退（F）：${AMULET[n]}${n%2?'':'，沒開就要面向 Chaser'}`,n%2?'扇形：面向外圈（最後移動的方向）':'突進：不要背對 Chaser 又沒開防擊退'];
    L.push(`懺悔の間：<b>${c.w>0?'西偏北＋東偏南':'西偏南＋東偏北'}</b>　輪子：北＋<b>${c.wheel>0?'東':'西'}</b>`);
    L.push(`這次 Justice 在<b>${c.s>0?'東北':'西北'}</b> → 超級跳跳 <b>${NUM[jumpNum(c)-1]}</b>，アポカリ由 <b>${NUM[rayNum(c)-1]}</b> 誘導`);
    L.push('之後：回中央分攤浄化の熱線');
    if(c.t>=29){const m=marked(c);
      if(me.count)L.push(`生命計算數：你被點名 → 站<b>${m[0]===me?'北（和坦克）':'南（和補師）'}</b>`);
      else if(me.role==='DD')L.push('生命計算數：沒點名 → <b>不要進兩個圈</b>');
      else L.push(`生命計算數：<b>${me.n==='MT'||me.n==='ST'?'北':'南'}</b>`);
    }
    return L.map(x=>`<div>${x}</div>`).join('');
  },
  steps:[
    {t:9,name:'依號碼散開（チャクラム）',spot:(p,c)=>spotAt('spread',p,c),desc:stepDesc('spread'),
      check(c){return c.players.filter(p=>Math.abs(p.x)<2.5||Math.abs(p.y)<2.5).map(p=>[p,'被チャクラム的十字打中'])}},
    {t:13,name:'1 號扇形＋超級跳',spot:(p,c)=>spotAt('jump',p,c),desc:stepDesc('jump'),
      check(c){const J=c.justice,far=c.players.slice().sort((a,b)=>dist(b,J)-dist(a,J))[0];
        c.land={x:far.x,y:far.y};c.justice={x:far.x,y:far.y};
        const out=far.num===jumpNum(c)?[]:[[far,`離 Justice 最遠，被超級跳跳到（應該是 ${NUM[jumpNum(c)-1]}）`]];
        return out.concat(chaserCone(1)(c))}},
    {t:14,name:'2 號突進',spot:holdFor(2,'ray'),desc:dashDesc(2),check:c=>chaserDash(2)(c)},
    {t:15,name:'アポカリティックレイ',spot:(p,c)=>spotAt('ray',p,c),desc:stepDesc('ray'),
      check(c){const o=c.land,far=c.players.slice().sort((a,b)=>dist(b,o)-dist(a,o))[0];
        c.ray={o,a:Math.atan2(far.y-o.y,far.x-o.x),t:c.t};
        const out=far.num===rayNum(c)?[]:[[far,`アポカリ誘導錯人（應該由 ${NUM[rayNum(c)-1]} 誘導）`]];
        return out.concat(rayCheck(c))}},
    {t:17,name:'3 號扇形＋懺悔①（5、6 號踩）',spot:(p,c)=>spotAt('room1',p,c),desc:stepDesc('room1'),
      check:c=>roomCheck(0)(c).concat(rayCheck(c),chaserCone(3)(c))},
    {t:18,name:'4 號突進',spot:holdFor(4,'room1'),desc:dashDesc(4),check:c=>chaserDash(4)(c)},
    {t:19,name:'十字の秘蹟（アポカリ結束）',spot:(p,c)=>spotAt('cross',p,c),desc:stepDesc('cross'),
      check(c){const out=rayCheck(c);c.ray=null;
        c.players.filter(p=>Math.abs(p.x)<6||p.y>16).forEach(p=>out.push([p,'被十字の秘蹟打中']));return out}},
    {t:21,name:'5 號扇形＋懺悔②（7、8 號踩）',spot:(p,c)=>spotAt('room2',p,c),desc:stepDesc('room2'),check:c=>roomCheck(1)(c).concat(chaserCone(5)(c))},
    {t:22,name:'6 號突進',spot:holdFor(6,'room2'),desc:dashDesc(6),check:c=>chaserDash(6)(c)},
    {t:25,name:'7 號扇形＋懺悔③（1、2 號踩）',spot:(p,c)=>spotAt('room3',p,c),desc:stepDesc('room3'),check:c=>roomCheck(2)(c).concat(chaserCone(7)(c))},
    {t:26,name:'8 號突進',spot:holdFor(8,'room3'),desc:dashDesc(8),check:c=>chaserDash(8)(c)},
    {t:33,name:'浄化の熱線（全員分攤）',spot(){return{x:0,y:0,r:3.5}},desc(){return'全員回場地中央分攤。'},
      check(c){return c.players.filter(p=>Math.hypot(p.x,p.y)>=3.5).map(p=>[p,'沒進浄化の熱線分攤'])}},
    {t:39,name:'生命計算數',
      spot(p,c){if(c.t<29)return null;const m=marked(c);
        if(p.count)return{x:0,y:m[0]===p?-6.5:6.5,r:1};
        if(p.role==='DD'){const um=c.players.filter(q=>q.role==='DD'&&!q.count);return{x:um[0]===p?-9:9,y:0,r:3}}
        return{x:0,y:p.n==='MT'||p.n==='ST'?-6.5:6.5,r:1.5}},
      desc(p,c){if(c.t<29)return'等兩位 DPS 被點名。';const m=marked(c);
        if(p.count)return m[0]===p?'站北邊，MT、ST 會過來。':'站南邊，H1、H2 會過來。';
        if(p.role==='DD')return'沒點名的 DPS 不要進兩個圈。';
        return p.n==='MT'||p.n==='ST'?'去北邊的圈。':'去南邊的圈。'},
      check(c){const out=[];for(const m of marked(c)){const n=c.players.filter(p=>dist(p,m)<3).length;if(n!==3)out.push([m,`生命計算數圈內 ${n} 人，需要 3 人`])}return out}},
  ],
  draw(H,c,layer){
    if(layer!=='under')return;
    const t=c.t,C=H.C;
    H.boss({x:0,y:19.5},'亞歷山大','#e3b04f','circle');
    if(t<11)for(const p of [{x:0,y:-20.5},{x:20.5*c.wheel,y:0}]){H.circle(p,1.3,'#ff6a8a55','#ff6a8a',2);H.text(p,'チャクラム','#ff9ab0',11,-22)}
    if(t>=9&&t<10.6){H.poly([{x:-2.5,y:-20},{x:2.5,y:-20},{x:2.5,y:20},{x:-2.5,y:20}],'#ff6a8a33',null);H.poly([{x:-20,y:-2.5},{x:20,y:-2.5},{x:20,y:2.5},{x:-20,y:2.5}],'#ff6a8a33',null)}
    if(t>=7){const done=t<17?0:t<21?1:t<25?2:3;
      if(done<3)for(const sd of ['L','R']){const r=room(c,sd),p={x:r[0],y:r[1]};H.circle(p,ROOM_R[done],'#9a7bff33','#9a7bff',2);H.text(p,`懺悔 ${3-done}`,'#c9b8ff',12)}}
    H.boss(c.justice,'Justice',C.j,'sq');
    const chaser=p=>H.img(p,CHASER_IMG,4.2,'Chaser',C.c)||H.boss(p,'Chaser',C.c,'tri');
    if(t<1)chaser(c.chaser);
    for(const e of c.fx){if(t-e.t>1.4)continue;
      if(e.kind==='cone')H.cone(e.o,e.a,CONE_LEN,CONE_HALF,C.c);
      else{H.line(e.a,e.b,C.c,10);H.line(e.a,e.b,'#ffffff',2)}}
    if(c.chaserAt&&t<27.5)chaser(c.chaserAt);
    if(t>=13&&t<14.4&&c.land)H.circle(c.land,6,'#f0873a33','#f0873a',2);
    if(c.ray)H.cone(c.ray.o,c.ray.a,RAY_LEN,RAY_HALF,'#ffb347');
    if(t>=19&&t<20.6){H.poly([{x:-6,y:-20},{x:6,y:-20},{x:6,y:20},{x:-6,y:20}],'#e3b04f44','#e3b04f');H.poly([{x:-20,y:16},{x:20,y:16},{x:20,y:21},{x:-20,y:21}],'#e3b04f44','#e3b04f')}
    if(t>=29&&t<33)H.circle({x:0,y:0},3.5,'#e3b04f22','#e3b04f',2,[6,4]);
    if(t>=33&&t<34.5)H.circle({x:0,y:0},3.5,'#e3b04f66',null);
    if(t>=29)for(const m of marked(c)){H.circle(m,3,'#46c1e622','#46c1e6',2);H.text(m,'3',C.c,16,-24)}
  }
});
})();
