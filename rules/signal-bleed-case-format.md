# SIGNAL BLEED — Case Files
### A format for dropping new cases into the Chart Table

---

## THE IDEA

A **case file** is one JSON document holding everything you prepped for a session: the job, the one wrong detail, the locations and people, the clue cards, any artifacts and puzzles you might send, and terror/temptation suggestions per ring.

The GM loads it in the Portal before play. Nothing appears automatically. Clues land in your **bank**, artifacts and puzzles land in a **staging queue**, and you release each one when the moment arrives. The players see nothing until you drop it.

Keep a folder of these. Write new ones between sessions. Share them.

---

## THE FORMAT

```json
{
  "format": "signal-bleed-case",
  "version": 1,

  "title": "Eleven Minutes",
  "byline": "One line of pitch, for you, not the players.",
  "depth": 3,

  "job": {
    "client": "Who's hiring",
    "brief": "What they want done",
    "pay": "How much, and why it's too much",
    "deadline": "When"
  },

  "wrongDetail": "Exactly one thing. Never explained.",

  "locations": [
    { "name": "", "sense": "what it smells and sounds like", "who": "one person there" }
  ],

  "npcs": [
    { "name": "", "want": "", "hiding": "" }
  ],

  "clues": [
    { "text": "A hole in the world.", "face": false }
  ],

  "artifacts": [
    { "title": "", "body": "", "to": "all" }
  ],

  "puzzles": [
    { "type": "keypad", "title": "", "body": "", "code": "1411", "payload": "", "to": "all" },
    { "type": "sound",  "title": "", "body": "", "target": 4100, "payload": "", "to": "all" },
    { "type": "audio",  "title": "", "body": "log shows [[eleven]] minutes gone", "to": "all" }
  ],

  "rings": {
    "terrors":     ["", "", "", "", ""],
    "temptations": ["", "", "", "", ""]
  },

  "notes": "Anything else. Never a solution."
}
```

### Field notes

| Field | Rules |
|---|---|
| `depth` | 3 one-shot · 4 longer case · 5 finale |
| `wrongDetail` | Exactly one. If you have two, you have two cases. |
| `clues[].face` | `true` pins it face down — visible as a hatched card, GM-only until revealed |
| `artifacts[].to` | `"all"` or a player name matching their roster entry. Falls back to `"all"`. |
| `puzzles[].type` | `keypad` (enter a code) · `sound` (find a depth, 0–4200m, ±40 tolerance) · `audio` (bracketed words are blacked out; three free recoveries, then Static) |
| `rings.terrors` | Five entries, one per ring. Suggestions only — the app shows you the current ring's pair. |

### Writing clues

A clue is **a hole in the world**, not a piece of a puzzle you already solved.

> **Good** — The tower's water usage tripled after the last tenant left.
> **Bad** — People are living in the flooded lobby. *(explains itself)*

> **Good** — Her last transmission logged four minutes after the vessel went down. It describes the vessel going down.
> **Bad** — She could see the future. *(that's a theory, not a clue)*

Eight to twelve per case. If a clue only makes sense with one solution, rewrite it.

---

## THE LOADER PATCH

Five small edits to `index.html`. Do these *after* the Firebase work, or before it — they don't touch each other.

### ☐ 1. Add a queue to the GM store

Find `function gm(){` and add `queue`:

```js
function gm(){return{v:3,ts:0,bank:[],queue:[],notes:"",wrong:"",rings:null};}
```

### ☐ 2. Let `deliver()` take an explicit target

Find `async function deliver(msg){` and change its first lines to:

```js
async function deliver(msg, target){
  msg.t=ct();msg.read=false;
  const to = target || sendTo;
  const targets = to==="all"
    ? (B.roster||[]).map(r=>r.pid)
    : [ (B.roster||[]).find(r=>r.name===to)?.pid || to ];
```

Everything below that line stays as it is.

### ☐ 3. Add the Case tab

Find the portal tab bar and add one button:

```html
<button class="tb" data-p="case">Case</button>
```

Then in `openPortal()`, extend the dispatch:

```js
document.getElementById("portalBody").innerHTML=
  pTab==="bank"?pBank():pTab==="send"?pSend():pTab==="puzzle"?pPuz():
  pTab==="crew"?pCrew():pTab==="case"?pCase():pNotes();
```

### ☐ 4. Add the panel and the load/export functions

Paste this next to the other `p…()` functions:

```js
function pCase(){
  const q=G.queue||[];
  const r=G.rings, ring=B.ring;
  return `<div class="lab">Load a case file</div>
   <div class="acts" style="margin-top:0">
     <button class="act pri sm" data-act="case-pick">Choose file…</button>
     <button class="act sm" data-act="case-export">Export current</button>
   </div>
   <input type="file" id="caseFile" accept=".json" style="display:none">

   ${r ? `<div class="lab">Ring ${ring+1} — suggestions</div>
     <div class="gmrow"><div class="gt">
       <b style="color:var(--warn)">Terror.</b> ${esc(r.terrors?.[ring]||"—")}<br>
       <b style="color:var(--lens2)">Temptation.</b> ${esc(r.temptations?.[ring]||"—")}
     </div></div>` : ``}

   <div class="lab">Staged — ${q.length}</div>
   ${q.length ? q.map((it,i)=>`<div class="gmrow">
       <div class="gt"><b>${esc(it.title||it.type)}</b>
         <span style="color:var(--dim)">· ${esc(it.kind==="puzzle"?it.p:"artifact")} · to ${esc(it.to||"all")}</span><br>
         <span style="color:var(--soft)">${esc((it.body||"").slice(0,90))}${(it.body||"").length>90?"…":""}</span></div>
       <div class="ga">
         <button class="act sm pri" data-act="q-send" data-i="${i}">Send</button>
         <button class="act sm" data-act="q-del" data-i="${i}">×</button></div>
     </div>`).join("")
    : `<div class="empty">Nothing staged.</div>`}`;
}

function loadCase(txt){
  let c; try{ c=JSON.parse(txt); }catch(e){ alert("That isn't valid JSON."); return; }
  if(c.format!=="signal-bleed-case"){ alert("Not a Signal Bleed case file."); return; }

  G.bank  = (G.bank||[]).concat((c.clues||[]).map(x=>
              typeof x==="string" ? x : (x.face ? "\u2691 "+x.text : x.text)));
  G.queue = (G.queue||[]).concat(
    (c.artifacts||[]).map(a=>({kind:"art",title:a.title,body:a.body,to:a.to||"all"})),
    (c.puzzles||[]).map(p=>({kind:"puzzle",p:p.type,title:p.title,body:p.body,
      code:p.code,target:p.target,payload:p.payload,to:p.to||"all"})));
  G.rings = c.rings||null;
  G.wrong = c.wrongDetail||G.wrong;
  G.notes = [c.byline&&("— "+c.byline),
    c.job&&`JOB\nClient: ${c.job.client||""}\n${c.job.brief||""}\nPay: ${c.job.pay||""}\nDeadline: ${c.job.deadline||""}`,
    (c.locations||[]).length&&"LOCATIONS\n"+c.locations.map(l=>`· ${l.name} — ${l.sense||""} — ${l.who||""}`).join("\n"),
    (c.npcs||[]).length&&"PEOPLE\n"+c.npcs.map(n=>`· ${n.name} — wants ${n.want||"?"} — hiding ${n.hiding||"?"}`).join("\n"),
    c.notes].filter(Boolean).join("\n\n");

  if(c.depth) B.depth=c.depth;
  if(c.title) B.caseName=c.title;

  pushG(); pushB(); render(); openPortal();
  moment("Case loaded", (c.title||"Untitled")+" — "+(c.clues||[]).length+" clues in the bank.", "recv");
}

function exportCase(){
  const out={format:"signal-bleed-case",version:1,title:B.caseName||"Untitled",
    depth:B.depth,wrongDetail:G.wrong,notes:G.notes,
    clues:(G.bank||[]).map(t=>({text:t.replace(/^\u2691 /,""),face:t.startsWith("\u2691")})),
    artifacts:(G.queue||[]).filter(x=>x.kind==="art").map(x=>({title:x.title,body:x.body,to:x.to})),
    puzzles:(G.queue||[]).filter(x=>x.kind==="puzzle").map(x=>({type:x.p,title:x.title,
      body:x.body,code:x.code,target:x.target,payload:x.payload,to:x.to})),
    rings:G.rings};
  const b=new Blob([JSON.stringify(out,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(b);
  a.download=(B.caseName||"case").toLowerCase().replace(/\W+/g,"-")+".json";
  a.click();
}
```

### ☐ 5. Wire the buttons

Add these cases to the big `switch(a)` block:

```js
case "case-pick":{
  const f=document.getElementById("caseFile");
  f.onchange=e=>{const file=e.target.files[0];if(!file)return;
    const rd=new FileReader();rd.onload=()=>loadCase(rd.result);rd.readAsText(file);};
  f.click();break;}
case "case-export":exportCase();break;
case "q-send":{
  const it=G.queue[i];
  deliver(Object.assign({},it), it.to);
  G.queue.splice(i,1);pushG();openPortal();
  moment("Sent", it.to==="all"?"It lands in every private space.":"It lands in one private space.","recv");
  break;}
case "q-del":G.queue.splice(i,1);pushG();openPortal();break;
```

**Done.** Portal → Case → Choose file. Clues fill the bank; artifacts and puzzles wait in the queue until you press Send.

---

## USING IT AT THE TABLE

1. **Before the session** — load the case file. Glance at the wrong detail in Prep.
2. **During** — drop clues from the bank onto the chart as they're earned. Face-down ones stay hidden until you reveal.
3. **When someone digs somewhere specific** — send the matching artifact or puzzle from the queue, to them alone.
4. **Watch the ring suggestions** — the panel shows the current ring's terror and temptation. You can't advance until you've landed one of each.
5. **After** — export. Whatever survived is now the record.

---

## AUTHORING A NEW CASE

Twenty minutes, maximum.

- ☐ A job. Who's hiring, what's the deliverable, what's the deadline.
- ☐ **One** wrong detail. Never explain it.
- ☐ Four or five locations: a name, a smell, one person there.
- ☐ Five to seven people: name, want, secret. Two are lying about unrelated things.
- ☐ Eight to twelve clues. Concrete, strange, non-explaining.
- ☐ One or two artifacts, one puzzle. Optional.
- ☐ Five terrors, five temptations.
- ☐ Depth 3.
- ☐ **No solution.** If you have one in your head, throw it out — you'll steer toward it.
