/* ===== Intellect — Gaps & Coverage (strategic portfolio view) ===== */

function CoverageChip({ g }) {
  const n = (g.work||[]).length;
  if (n===0) return <span className="chip" style={{ color:'var(--rose)', borderColor:'var(--rose-dim)', background:'var(--rose-dim)' }}>No work</span>;
  return <span className="chip" style={{ color:'var(--green)', borderColor:'color-mix(in srgb,var(--green) 30%, transparent)' }}>{n} in work</span>;
}

function GapRow({ g, go }) {
  const t = D().topics.find(x=>x.id===g.topic);
  const uncovered = !(g.work||[]).length;
  const inv = (g.work||[]).reduce((a,id)=>{ const w=D().work.find(x=>x.id===id); if(w&&w.budget){ a.b+=w.budget.allocated; a.f+=w.fte||0; } return a; }, {b:0,f:0});
  return (
    <button onClick={()=>go('topic',{topicId:g.topic})} style={{
      display:'grid', gridTemplateColumns:'70px 1fr 196px 158px 28px', alignItems:'center', gap:14,
      width:'100%', textAlign:'left', background:'transparent', border:0, borderTop:'1px solid var(--line)',
      padding:'13px 16px', cursor:'pointer', color:'inherit' }}>
      <span className="num" style={{ fontSize:10, color:SEV[g.severity], textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600 }}>{g.severity}</span>
      <div style={{ minWidth:0, display:'flex', alignItems:'center', gap:8 }}>
        {uncovered && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--rose)', flex:'none', boxShadow:'0 0 0 3px var(--rose-dim)' }}/>}
        <span style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.35, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.text}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0 }}>
        <PriorityBadge bin={t.bin} size={18} />
        <span className={'dot '+t.health} style={{ boxShadow:'none', width:6, height:6 }}/>
        <span style={{ fontSize:11.5, color:'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.name}</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9 }}>
          <CoverageChip g={g} />
          <Avatar id={g.owner} size={20} />
        </div>
        {inv.b>0 && <span className="num" style={{ fontSize:10, color:'var(--faint)' }}>{money(inv.b)} · {Math.round(inv.f*10)/10} FTE invested</span>}
      </div>
      <span style={{ color:'var(--faint)', justifySelf:'end' }}>›</span>
    </button>
  );
}

function GapsBoard({ scope, go }) {
  const [group, setGroup] = useState('priority');
  const [cov, setCov] = useState('all'); // all | uncovered
  const tset = new Set(scope.topics.map(t=>t.id));
  let gaps = D().gaps.filter(g=> tset.has(g.topic) && g.status!=='closed');
  if (cov==='uncovered') gaps = gaps.filter(g=> !(g.work||[]).length);

  const sevRank = { critical:0, high:1, medium:2 };
  const uncovered = D().gaps.filter(g=> tset.has(g.topic) && g.status!=='closed' && !(g.work||[]).length);
  const exposure = uncovered.filter(g=> g.severity!=='medium')
    .sort((a,b)=> (D().topics.find(t=>t.id===a.topic).bin - D().topics.find(t=>t.id===b.topic).bin) || (sevRank[a.severity]-sevRank[b.severity]));
  const totalOpen = scope.isChief ? D().lab.portfolio.openGaps : scope.topics.reduce((s,t)=>s+t.openGaps,0);

  // grouping
  const sort = (arr)=> [...arr].sort((a,b)=>{ const ua=!(a.work||[]).length, ub=!(b.work||[]).length;
    return (sevRank[a.severity]-sevRank[b.severity]) || (ub-ua); });
  let sections = [];
  if (group==='priority') {
    [1,2,3,4].forEach(bin=>{ const items = gaps.filter(g=> D().topics.find(t=>t.id===g.topic).bin===bin);
      if(items.length) sections.push({ key:'p'+bin, head:<><PriorityBadge bin={bin} size={20}/><span style={{whiteSpace:'nowrap'}}>{BIN[bin].name}</span></>, items:sort(items) }); });
  } else {
    [['critical','Critical'],['high','High'],['medium','Medium']].forEach(([s,l])=>{ const items=gaps.filter(g=>g.severity===s);
      if(items.length) sections.push({ key:s, head:<><span style={{ width:9, height:9, borderRadius:2, background:SEV[s] }}/><span style={{whiteSpace:'nowrap'}}>{l}</span></>, items:sort(items) }); });
  }

  return (
    <div className="rise" style={{ padding:'22px 26px 60px', maxWidth:1440, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:18, gap:16, flexWrap:'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom:7 }}>{scope.isChief?'Directorate · Whole portfolio':`${scope.person.name} · ${scope.person.team}`}</div>
          <h1 className="serif" style={{ fontSize:30, fontWeight:500, letterSpacing:'-0.4px' }}>Gaps &amp; Coverage</h1>
        </div>
        <button className="btn btn-gold">Export gap review</button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:14 }}>
        <KPI label="Open gaps" value={totalOpen} sub="across portfolio" accent="var(--gold)" />
        <KPI label="Uncovered" value={uncovered.length} sub="no work assigned" accent={uncovered.length?'var(--rose)':'var(--green)'} />
        <KPI label="Exposure" value={exposure.length} sub="critical / high & uncovered" accent={exposure.length?'var(--rose)':'var(--green)'} />
      </div>

      {/* exposure callout */}
      {exposure.length>0 && (
        <div className="panel" style={{ padding:'16px 18px', marginBottom:14, borderColor:'color-mix(in srgb,var(--rose) 28%, var(--line))' }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:13 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--rose)', boxShadow:'0 0 0 4px var(--rose-dim)' }}/>
            <h3 className="serif" style={{ fontSize:16, fontWeight:500 }}>Exposure</h3>
            <span className="eyebrow" style={{ marginLeft:2 }}>High-priority gaps with nothing in work</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:11 }}>
            {exposure.slice(0,6).map(g=>{ const t=D().topics.find(x=>x.id===g.topic);
              return (
              <button key={g.id} onClick={()=>go('topic',{topicId:g.topic})} style={{ textAlign:'left', cursor:'pointer', background:'var(--panel)', border:'1px solid var(--line-2)', borderRadius:10, padding:'12px 13px', color:'inherit' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                  <PriorityBadge bin={t.bin} size={18} />
                  <span className="num" style={{ fontSize:9.5, color:SEV[g.severity], textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600 }}>{g.severity}</span>
                  <span style={{ fontSize:10.5, color:'var(--faint)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.name}</span>
                </div>
                <div style={{ fontSize:12.5, color:'var(--ink-2)', lineHeight:1.4 }}>{g.text}</div>
              </button>
            );})}
          </div>
        </div>
      )}

      {/* controls */}
      <div style={{ display:'flex', gap:10, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
        <span className="eyebrow">Group by</span>
        <div style={{ display:'flex', gap:4, background:'var(--bg-2)', border:'1px solid var(--line-2)', borderRadius:8, padding:3 }}>
          {[['priority','Priority'],['severity','Severity']].map(([k,l])=>(
            <button key={k} onClick={()=>setGroup(k)} style={{ padding:'6px 13px', borderRadius:6, border:0, cursor:'pointer', fontSize:12, fontFamily:'var(--sans)', whiteSpace:'nowrap',
              background: group===k?'var(--raised)':'transparent', color: group===k?'var(--ink)':'var(--faint)', fontWeight: group===k?550:450 }}>{l}</button>
          ))}
        </div>
        <div style={{ flex:1 }}/>
        <button onClick={()=>setCov(cov==='all'?'uncovered':'all')} className="btn" style={{ borderColor: cov==='uncovered'?'var(--rose)':'var(--line-2)', color: cov==='uncovered'?'var(--rose)':'var(--ink-2)' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--rose)' }}/>{cov==='uncovered'?'Showing uncovered only':'Uncovered only'}
        </button>
      </div>

      {/* grouped list */}
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {sections.map(sec=>(
          <div key={sec.key} className="panel" style={{ overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, padding:'13px 16px' }}>
              {sec.head}
              <span className="num" style={{ fontSize:11, color:'var(--faint)', marginLeft:2 }}>{sec.items.length}</span>
              <span style={{ flex:1 }}/>
              <span className="num" style={{ fontSize:10.5, color:'var(--rose)' }}>{sec.items.filter(g=>!(g.work||[]).length).length} uncovered</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'70px 1fr 196px 158px 28px', gap:14, padding:'0 16px 7px' }}>
              {['Severity','Gap','Topic','Coverage · investment',''].map((h,i)=><div key={i} className="eyebrow" style={{ fontSize:9 }}>{h}</div>)}
            </div>
            {sec.items.map(g=> <GapRow key={g.id} g={g} go={go} />)}
          </div>
        ))}
        {!sections.length && <div className="panel" style={{ padding:40, textAlign:'center', color:'var(--faint)' }}>No gaps match this filter.</div>}
      </div>
    </div>
  );
}

window.GapsBoard = GapsBoard;
