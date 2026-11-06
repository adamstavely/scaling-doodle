/* ===== Intellect — Resourcing: people + research dollars vs priority ===== */

function ShareBar({ share, color, label, value }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
      <div style={{ flex:1, height:8, background:'var(--line)', borderRadius:100, overflow:'hidden' }}>
        <div style={{ width:Math.round(share*100)+'%', height:'100%', background:color, borderRadius:100, transition:'width .6s' }}/>
      </div>
      <div className="num" style={{ width:64, textAlign:'right', fontSize:11, color:'var(--faint)', flex:'none' }}>{value} <span style={{ opacity:.7 }}>· {Math.round(share*100)}%</span></div>
    </div>
  );
}

function ResourceRow({ t, go }) {
  const lead = D().people[t.lead];
  const burn = t.budget.spent / t.budget.allocated;
  const under = t.health==='at-risk';
  return (
    <button onClick={()=>go('topic',{topicId:t.id})} style={{
      display:'grid', gridTemplateColumns:'1.5fr 150px 64px 70px 78px', alignItems:'center', gap:14,
      width:'100%', textAlign:'left', background:'transparent', border:0, borderTop:'1px solid var(--line)',
      padding:'12px 16px', cursor:'pointer', color:'inherit' }}>
      <div style={{ display:'flex', alignItems:'center', gap:11, minWidth:0 }}>
        <PriorityBadge bin={t.bin} size={20} />
        <span className={'dot '+t.health}/>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:13.5, fontWeight:550, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.name}</div>
          <div style={{ fontSize:11, color:'var(--faint)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{lead.name}</div>
        </div>
      </div>
      <div>
        <div className="num" style={{ display:'flex', justifyContent:'space-between', fontSize:10.5, color:'var(--faint)', marginBottom:5 }}>
          <span style={{ color:'var(--ink-2)' }}>{money(t.budget.spent)}</span><span>/ {money(t.budget.allocated)}</span>
        </div>
        <Progress v={burn} color={under?'var(--rose)':'var(--gold)'} h={4} />
      </div>
      <div className="num" style={{ fontSize:12.5, color:'var(--ink-2)', textAlign:'right' }}>{Math.round(burn*100)}%</div>
      <div className="num" style={{ fontSize:13, color:'var(--blue)', textAlign:'right', fontWeight:550 }}>{t.fte}<span style={{ color:'var(--faint)', fontWeight:400, fontSize:10 }}> FTE</span></div>
      <div style={{ display:'flex', justifyContent:'flex-end' }}><AvatarStack ids={t.team_ids} size={22} /></div>
    </button>
  );
}

function PersonLoad({ p, go }) {
  const over = p.load > 1.0;
  return (
    <div style={{ padding:'12px 16px', borderTop:'1px solid var(--line)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
        <Avatar id={p.id} size={28} />
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontSize:12.5, fontWeight:550, whiteSpace:'nowrap' }}>{p.name}</div>
          <div style={{ fontSize:10.5, color:'var(--faint)' }}>{p.role}</div>
        </div>
        <span className="chip num" style={{ color: over?'var(--rose)':'var(--muted)', borderColor: over?'var(--rose-dim)':'var(--line-2)', background: over?'var(--rose-dim)':'transparent' }}>
          {p.load.toFixed(1)} / {p.cap.toFixed(1)} FTE{over?' · over':''}
        </span>
      </div>
      <div style={{ display:'flex', height:7, borderRadius:100, overflow:'hidden', background:'var(--line)', marginBottom:8 }}>
        {(p.alloc||[]).map(([tid,f],i)=>{ const t=D().topics.find(x=>x.id===tid);
          return <div key={i} title={`${t.name}: ${f} FTE`} style={{ width:(f/Math.max(p.cap,p.load)*100)+'%', background: i%2? 'var(--blue)':'color-mix(in srgb,var(--blue) 65%, var(--violet))', borderRight:'1px solid var(--panel)' }}/>; })}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
        {(p.alloc||[]).map(([tid,f])=>{ const t=D().topics.find(x=>x.id===tid);
          return <button key={tid} onClick={()=>go('topic',{topicId:tid})} className="chip" style={{ cursor:'pointer' }}><PriorityBadge bin={t.bin} size={13}/>{t.name} <span className="num" style={{ color:'var(--faint)' }}>{f}</span></button>; })}
      </div>
    </div>
  );
}

function Resourcing({ scope, go }) {
  const isChief = scope.isChief;
  const L = D().lab;
  const ts = scope.topics;
  const binAgg = (bin)=>{ const items=ts.filter(t=>t.bin===bin); return { count:items.length, budget:items.reduce((s,t)=>s+t.budget.allocated,0), fte:Math.round(items.reduce((s,t)=>s+t.fte,0)*10)/10 }; };
  const bins = isChief
    ? [1,2,3,4].map(b=>({ bin:b, count:L.binMix[b], budget:L.binBudget[b], fte:L.binFte[b] }))
    : [1,2,3,4].map(b=>({ bin:b, ...binAgg(b) }));
  const totC = bins.reduce((s,b)=>s+b.count,0)||1;
  const totB = bins.reduce((s,b)=>s+b.budget,0)||1;
  const totF = bins.reduce((s,b)=>s+b.fte,0)||1;

  const kBudget = isChief? L.budget.allocated : ts.reduce((s,t)=>s+t.budget.allocated,0);
  const kSpent  = isChief? L.budget.spent : ts.reduce((s,t)=>s+t.budget.spent,0);
  const kComm   = isChief? L.budget.committed : ts.reduce((s,t)=>s+t.budget.allocated,0);
  const kFte    = isChief? L.headcount : Math.round(ts.reduce((s,t)=>s+t.fte,0)*10)/10;
  const burn = kSpent/kBudget;

  const rows = [...ts].sort((a,b)=> a.bin-b.bin || b.budget.allocated-a.budget.allocated);
  const ppl = [...new Set(ts.flatMap(t=>t.team_ids))].map(id=>D().people[id]).filter(p=>p && p.load!==undefined).sort((a,b)=> b.load-a.load);

  // headline insight: P1 share of budget vs topics
  const p1 = bins[0];
  const p1TopicShare = Math.round(p1.count/totC*100), p1BudgetShare = Math.round(p1.budget/totB*100);

  return (
    <div className="rise" style={{ padding:'22px 26px 60px', maxWidth:1440, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:18, gap:16, flexWrap:'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom:7 }}>FY26 · {isChief?'Whole portfolio':`${scope.person.name} · ${scope.person.team}`}</div>
          <h1 className="serif" style={{ fontSize:30, fontWeight:500, letterSpacing:'-0.4px' }}>Resourcing</h1>
        </div>
        <button className="btn btn-gold">Plan allocation</button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:14 }}>
        <KPI label="Budget allocated" value={money(kBudget)} sub="FY26 commitments" accent="var(--ink)" />
        <KPI label="Spent to date" value={money(kSpent)} sub={Math.round(burn*100)+'% of budget'} accent="var(--gold)" />
        <KPI label={isChief?'Committed':'Allocated'} value={money(kComm)} sub={isChief?'under contract':'across topics'} accent="var(--ink)" />
        <KPI label="People" value={kFte+' FTE'} sub={ppl.length+' allocated researchers'} accent="var(--blue)" />
      </div>

      {/* alignment: investment vs priority */}
      <div className="panel" style={{ padding:'16px 20px 18px', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:12, marginBottom:4, flexWrap:'wrap' }}>
          <h3 className="serif" style={{ fontSize:16, fontWeight:500, whiteSpace:'nowrap' }}>Investment vs priority</h3>
          <p style={{ fontSize:12, color:'var(--faint)', margin:0 }}>Are dollars &amp; people flowing to our top-priority work?</p>
        </div>
        <p style={{ fontSize:12.5, color:'var(--ink-2)', margin:'8px 0 16px', lineHeight:1.5 }}>
          <b style={{ color:'var(--gold)' }}>P1</b> topics are <b className="num">{p1TopicShare}%</b> of the portfolio but draw <b className="num" style={{ color:'var(--gold)' }}>{p1BudgetShare}%</b> of the budget.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'150px 1fr 1fr 1fr', gap:'0 22px', alignItems:'center' }}>
          <div/>
          {[['Topics','var(--muted)'],['Budget ($)','var(--gold)'],['People (FTE)','var(--blue)']].map(([l])=> <div key={l} className="eyebrow" style={{ fontSize:9, paddingBottom:10 }}>{l}</div>)}
          {bins.map(b=>(
            <React.Fragment key={b.bin}>
              <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 0', borderTop:'1px solid var(--line)' }}>
                <PriorityBadge bin={b.bin} size={20} />
                <span style={{ fontSize:12.5, fontWeight:500, whiteSpace:'nowrap' }}>{BIN[b.bin].name}</span>
              </div>
              <div style={{ borderTop:'1px solid var(--line)', padding:'9px 0' }}><ShareBar share={b.count/totC} color="var(--muted)" value={b.count} /></div>
              <div style={{ borderTop:'1px solid var(--line)', padding:'9px 0' }}><ShareBar share={b.budget/totB} color="var(--gold)" value={money(b.budget)} /></div>
              <div style={{ borderTop:'1px solid var(--line)', padding:'9px 0' }}><ShareBar share={b.fte/totF} color="var(--blue)" value={b.fte} /></div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* topic allocations + people */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.7fr) minmax(300px,1fr)', gap:14, alignItems:'start' }}>
        <div className="panel" style={{ overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px' }}>
            <h3 className="serif" style={{ fontSize:16, fontWeight:500, whiteSpace:'nowrap' }}>{isChief?'Top allocations by topic':'Your topics'}</h3>
            <span className="eyebrow">spend · burn · FTE</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1.5fr 150px 64px 70px 78px', gap:14, padding:'0 16px 7px' }}>
            {['Topic','Budget','Burn','People','Team'].map((h,i)=><div key={h} className="eyebrow" style={{ fontSize:9, textAlign: i>1&&i<4?'right':'left' }}>{h}</div>)}
          </div>
          {rows.map(t=> <ResourceRow key={t.id} t={t} go={go} />)}
        </div>
        <div className="panel" style={{ overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px' }}>
            <h3 className="serif" style={{ fontSize:16, fontWeight:500, whiteSpace:'nowrap' }}>People capacity</h3>
            {ppl.some(p=>p.load>1) && <span className="chip" style={{ color:'var(--rose)', borderColor:'var(--rose-dim)' }}>{ppl.filter(p=>p.load>1).length} over capacity</span>}
          </div>
          {ppl.map(p=> <PersonLoad key={p.id} p={p} go={go} />)}
        </div>
      </div>
    </div>
  );
}

window.Resourcing = Resourcing;
