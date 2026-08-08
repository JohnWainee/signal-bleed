const {JSDOM}=require("jsdom");
const fs=require("fs");
const html=fs.readFileSync("table/index.html","utf8");
const dom=new JSDOM(html,{url:"https://example.com/table/?room=TEST1",runScripts:"dangerously",
  beforeParse(w){
    // stub canvas + audio + matchMedia + sw
    w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==="createLinearGradient"?()=>({addColorStop(){}}):(typeof k==="string"?()=>{}:undefined),set:()=>true});
    w.AudioContext=undefined;
    w.matchMedia=()=>({matches:false,addEventListener(){}});
    w.navigator.serviceWorker={register:()=>Promise.resolve()};
    w.requestAnimationFrame=()=>0;
    w.console.error=(...a)=>console.log("PAGE ERROR:",...a);
  }});
const w=dom.window,d=w.document;
w.addEventListener("error",e=>console.log("UNCAUGHT:",e.message));
setTimeout(()=>{
  const errs=[];
  const click=sel=>{const el=d.querySelector(sel); if(!el){errs.push("missing "+sel);return;} el.dispatchEvent(new w.Event("click",{bubbles:true}));};
  // room shows
  console.log("roomJoin text:",JSON.stringify(d.getElementById("roomJoin").textContent));
  // join as GM
  d.getElementById("joinName").value="TestGM";
  click('[data-act="join-gm"]');
  setTimeout(()=>{
    console.log("join hidden:",d.getElementById("join").style.display==="none");
    console.log("gmSpoke visible:",d.getElementById("gmSpoke").style.display!=="none");
    // open portal, go to clocks tab
    click('[data-act="portal"]');
    const clocksTab=d.querySelector('[data-p="clocks"]');
    console.log("clocks tab exists:",!!clocksTab);
    if(clocksTab){clocksTab.dispatchEvent(new w.Event("click",{bubbles:true}));}
    setTimeout(()=>{
      const ci=d.getElementById("corpIn");
      console.log("corp input rendered:",!!ci);
      if(ci){ci.value="Meridian Salvage";click('[data-act="corp-add"]');}
      setTimeout(()=>{
        const seg=d.querySelector('[data-act="corp-seg"]');
        console.log("corp clock rendered:",!!seg);
        if(seg)seg.dispatchEvent(new w.Event("click",{bubbles:true}));
        // bleed mark
        click('[data-act="bleed"]');
        // export
        const notesTab=d.querySelector('[data-p="notes"]');
        if(notesTab)notesTab.dispatchEvent(new w.Event("click",{bubbles:true}));
        setTimeout(()=>{
          click('[data-act="dump-exp"]');
          const dump=d.getElementById("dumpBox");
          let parsed=null; try{parsed=JSON.parse(dump.value);}catch(e){}
          console.log("export valid JSON:",!!parsed,"| corps in export:",parsed&&parsed.shared.corps&&parsed.shared.corps.length===1,"| corp n:",parsed&&parsed.shared.corps[0].n);
          console.log("localStorage keys:",Object.keys(w.localStorage).filter(k=>k.startsWith("SB:")).join(", ")||"(async writes pending)");
          console.log("errors:",errs.length?errs:"none");
          process.exit(0);
        },150);
      },100);
    },100);
  },200);
},400);
