(async()=>{
const v=window.__v, P=CanvasRenderingContext2D.prototype, real=P.fillText; let log=null;
P.fillText=function(t,x,y,mw){ if(log&&String(t).trim()){const m=T(this,t),M=this.getTransform(),px=M.a*x+M.c*y+M.e,py=M.b*x+M.d*y+M.f,s=Math.hypot(M.a,M.b);
 log.push({t:String(t),l:px-m.actualBoundingBoxLeft*s,r:px+m.actualBoundingBoxRight*s,u:py-m.actualBoundingBoxAscent*s,d:py+m.actualBoundingBoxDescent*s,a:this.globalAlpha});} return real.apply(this,arguments);};
const T=(c,t)=>c.measureText(t);
const issues={}; let done=0;
const shot=(name,opt={})=>{log=[];try{v.draw();}catch(e){issues['THROW '+name+' '+e.message]=name;log=null;return;}const L=log.filter(o=>o.a>.05);log=null;done++;
 for(let i=0;i<L.length;i++){const a=L[i];
  if(a.l<-1||a.r>v.W+1||a.u<-1||a.d>v.H+1)if(a.d>0&&a.u<v.H&&a.r>0&&a.l<v.W)(issues['OFF: '+a.t]=issues['OFF: '+a.t]||[]).push(name+' l'+a.l.toFixed(0)+' r'+a.r.toFixed(0));
  for(let j=i+1;j<L.length;j++){const b=L[j]; if(a.t===b.t&&Math.abs(a.l-b.l)<4&&Math.abs(a.u-b.u)<4)continue;
   const w=Math.min(a.r,b.r)-Math.max(a.l,b.l),h=Math.min(a.d,b.d)-Math.max(a.u,b.u); if(w<=2||h<=2)continue;
   const area=w*h,min=Math.min((a.r-a.l)*(a.d-a.u),(b.r-b.l)*(b.d-b.u)); if(area/min<.12)continue;
   const k=a.t+'  <>  '+b.t;(issues[k]=issues[k]||[]).push(name);}
 }};
try{
v.tutSeen=Object.assign(v.tutSeen||{},{});
v.landTier=v.LAND_MAX; const h=v.hallOf(); h.lvl=v.HALL.length?v.HALL.length-1:5; 
const fill=n=>{for(const k of v.RES)v.res[k]=n;};
fill(1e6);
const spots=[];
for(const b of v.BUILDINGS){ if(b.key==='hall'||v.placed.some(p=>p.key===b.key))continue; let ok=false;
 for(let c=-30;c<40&&!ok;c++)for(let r=-30;r<40&&!ok;r++){ if(v.canPlace(b.key,c,r,v.occupied())){ try{fill(1e6);v.place(b.key,c,r);ok=true;}catch(e){} } }
 if(!ok)issues['NOPLACE '+b.key]=1;}
for(const p of v.placed){p.t=1;p.build=0;}
v.rebuildStores();v.invalidateJobs();v.assignJobs&&v.assignJobs();
v.caught={balloon:12,whale:8,pod:21,golden:3};
const banks=[['rich',1e6],['poor',0],['mid',137]];
const keys=[...new Set(v.placed.map(p=>p.key))];
for(const [bn,n] of banks){ fill(n);
 for(const k of keys){const p=v.placed.find(o=>o.key===k); const orig=p.lvl;
  for(const l of [1,2,k==='hall'?h.lvl:v.LVL_MAX]){p.lvl=l;v.panel=p.id;v.sellArm=null;shot(bn+':'+k+':L'+l);}
  p.lvl=orig;v.panel=null;}
 for(const m of ['build','decor','orders','Build','Decorate','Orders','goods','people']){v.barMode=m;shot(bn+':bar:'+m);}
 v.barMode='build';
}
fill(1e6);
v.caught={balloon:9999,whale:9999,pod:9999,golden:9999};v.panel=h.id;shot('hall:huge-tally');v.panel=null;v.caught={balloon:12,whale:8,pod:21,golden:3};
for(const c of [{balloon:0,whale:0,pod:0,golden:0},{balloon:1,whale:0,pod:9,golden:2},{balloon:9999,whale:9999,pod:9999,golden:9999}]){v.caught=c;v.album=true;shot('album'+c.balloon);v.album=false;}
v.caught={balloon:12,whale:8,pod:21,golden:3};
const safes=[null,{top:44,bottom:34,left:0,right:0},{top:120,bottom:90,left:0,right:0}];
for(const sf of safes){ const old=v.SAFE; if(sf)v.SAFE=Object.assign({},old,sf); const tag=sf?'safe'+sf.top:'safe0';
 v.barMode='orders';
 for(const n of [1,2,3,4]){ try{v.orders=[];for(let i=0;i<n;i++){const o=v.makeOrder();if(o)v.orders.push(o);}}catch(e){issues['ORDERS '+e.message]=1;} fill(1e6);shot(tag+':orders'+n);fill(0);shot(tag+':orders-poor'+n);}
 v.barMode='build'; fill(1e6);
 const g0=v.goalIdx; for(let i=0;i<v.GOALS.length;i++){v.goalIdx=i;shot(tag+':goal'+i);} v.goalIdx=g0;
 for(const a of [{secs:90,got:{wood:12},capped:false,spilled:0,shared:null,fullAfter:null,beacon:null},{secs:360000,got:{wood:1234567,food:987654,stone:55555},capped:true,spilled:99999,shared:12345,fullAfter:7200,beacon:null}]){v.away=a;shot(tag+':away');} v.away=null;
 v.album=true;shot(tag+':album');v.album=false;v.claimAsk=true;shot(tag+':claim');v.claimAsk=false;
 v.finished={villagers:72,buildings:48,trades:1234,charm:9999};shot(tag+':finished');v.finished=null;
 v.saveFailed=true;shot(tag+':savefail');v.saveFailed=false;
 v.SAFE=old;
}
if(v.villagers[0]){v.who=v.villagers[0].id||v.villagers[0];shot('who');v.who=null;}
return JSON.stringify({done,count:Object.keys(issues).length,placed:v.placed.length,keys,issues:Object.fromEntries(Object.entries(issues).map(([k,a])=>[k,Array.isArray(a)?(a.length+' '+a.slice(0,3).join(',')):a]))},null,1);
}catch(e){return 'ERR '+e.stack+' '+JSON.stringify(issues).slice(0,500);}
})()
