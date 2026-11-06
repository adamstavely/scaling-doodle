/* ===== Intellect — Portfolio Health dashboard ===== */
function KPI({ label, value, sub, accent='var(--ink)', spark, delta }) {
  return (
    <div className="panel" style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:8, minWidth:0 }}>
      <div className="eyebrow">{label}</div>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:8 }}>
        <div className="num" style={{ fontSize:30, fontWeight:600, lineHeight:1, color:accent, letterSpacing:'-1px', whiteSpace:'nowrap' }}>{value}</div>
        {spark && <Sparkline data={spark} w={70} h={26} color={accent==='var(--ink)'?'var(--gold)':accent} />}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11.5, color:'var(--faint)' }}>
        {delta!=null && <Delta v={delta} />}<span>{sub}</span>
      </div>
    </div>
  );
}

function TopicRow({ t, onOpen }) {
  const lead = D().people[t.lead];
  const covColor = t.coverage>=0.75?'var(--green)': t.coverage>=0.5?'var(--gold)':'var(--rose)';
  return (
    <button onClick={()=>onOpen(t.id)} className="topic-row" style={{
      display:'grid', gridTemplateColumns:'1.7fr 86px 110px 84px 76px', alignItems:'center', gap:14,
      width:'100%', textAlign:'left', background:'transparent', border:0, borderTop:'1px solid var(--line)',
      padding:'13px 16px', cursor:'pointer', color:'inherit' }}>
      <div style={{ display:'flex', alignItems:'center', gap:11, minWidth:0 }}>
        <PriorityBadge bin={t.bin} size={22} />
        <span className={'dot '+t.health}/>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontWeight:550, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.name}</span>
          </div>
          <div style={{ fontSize:11.5, color:'var(--faint)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{lead.name} · {t.team}</div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        <Sparkline data={t.trend} w={56} h={22} color={t.momentum>=0?'var(--green)':'var(--rose)'} fill={false} />
        <Delta v={t.momentum} />
      </div>
      <div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
          <span className="eyebrow" style={{ fontSize:9 }}>Coverage</span>
          <span className="num" style={{ fontSize:11, color:covColor }}>{pct(t.coverage)}</span>
        </div>
        <Progress v={t.coverage} color={covColor} h={4} />
      </div>
      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
        <span className="chip" title="Open gaps" style={{ color:t.openGaps>2?'var(--rose)':'var(--muted)' }}>{t.openGaps} gaps</span>
      </div>
      <div style={{ display:'flex', gap:6, justifyContent:'flex-end', color:'var(--faint)' }}>
        <span className="num" title="Work in flight" style={{ fontSize:12 }}>{t.work}<span style={{ color:'var(--faint)' }}>·wk</span></span>
      </div>
    </button>
  );
}

function AttentionGaps({ topics, onOpen }) {
  const tset = new Set(topics.map(t=>t.id));
  const gaps = D().gaps.filter(g=> tset.has(g.topic) && g.status!=='closed')
    .sort((a,b)=> ({critical:0,high:1,medium:2}[a.severity]-{critical:0,high:1,medium:2}[b.severity]) || (a.work.length-b.work.length))
    .slice(0,5);
  return (
    <div className="panel" style={{ overflow:'hidden' }}>
      <PanelHead title="Gaps needing attention" hint={gaps.length+' shown'} />
      <div>
        {gaps.map(g=>{ const t = D().topics.find(x=>x.id===g.topic); const uncovered = g.work.length===0;
          return (
          <button key={g.id} onClick={()=>onOpen(g.topic)} style={{ display:'block', width:'100%', textAlign:'left', background:'transparent', border:0, borderTop:'1px solid var(--line)', padding:'11px 16px', cursor:'pointer', color:'inherit' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
              <span className="num" style={{ fontSize:9.5, color:SEV[g.severity], textTransform:'uppercase', letterSpacing:'.5px', fontWeight:600 }}>{g.severity}</span>
              <span style={{ fontSize:10.5, color:'var(--faint)' }}>·</span>
              <span style={{ fontSize:11, color:'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.name}</span>
              {uncovered && <span className="chip" style={{ marginLeft:'auto', color:'var(--rose)', borderColor:'var(--rose-dim)', background:'var(--rose-dim)', fontSize:9 }}>No work</span>}
            </div>
            <div style={{ fontSize:12.5, color:'var(--ink-2)', lineHeight:1.35 }}>{g.text}</div>
          </button>
        );})}
      </div>
    </div>
  );
}

function PanelHead({ title, hint, action }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'13px 16px' }}>
      <h3 className="serif" style={{ fontSize:16, fontWeight:500, whiteSpace:'nowrap', flex:'none' }}>{title}</h3>
      {hint && !action && <span className="eyebrow">{hint}</span>}
      {action}
    </div>
  );
}

function ImpactPulse({ topics, onOpenPaper }) {
  const tset = new Set(topics.map(t=>t.id));
  const papers = D().papers.filter(p=> tset.has(p.topic)).sort((a,b)=> b.reads.downloads-a.reads.downloads).slice(0,3);
  return (
    <div className="panel" style={{ overflow:'hidden' }}>
      <PanelHead title="Impact pulse" hint="Top papers" />
      {papers.map(p=>(
        <button key={p.id} onClick={()=>onOpenPaper(p.id)} style={{ display:'flex', gap:12, alignItems:'center', width:'100%', textAlign:'left', background:'transparent', border:0, borderTop:'1px solid var(--line)', padding:'12px 16px', cursor:'pointer', color:'inherit' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12.5, fontWeight:500, lineHeight:1.3, marginBottom:4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{p.title}</div>
            <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--faint)' }} className="num">
              <span>↓ {fmt(p.reads.downloads)}</span><span>◇ {p.reads.citations} cites</span><span style={{ color:'var(--violet)' }}>◆ {p.reads.altmetric}</span>
            </div>
          </div>
          <Sparkline data={p.readTrend} w={64} h={28} color="var(--violet)" />
        </button>
      ))}
    </div>
  );
}

function Dashboard({ scope, go, onNewTopic }) {
  const L = D().lab;
  const isChief = scope.isChief;
  const ts = scope.topics;
  // scoped aggregate
  const agg = useMemo(()=>{
    if (isChief) return { topics:L.portfolio.topics, openGaps:L.portfolio.openGaps, cov:L.portfolio.gapsCovered, work:L.portfolio.workInFlight, papers:L.portfolio.papersYTD, reads:L.portfolio.readsYTD };
    const openGaps = ts.reduce((s,t)=>s+t.openGaps,0);
    const cov = ts.reduce((s,t)=>s+t.coverage,0)/ts.length;
    const work = ts.reduce((s,t)=>s+t.work,0);
    const papers = ts.reduce((s,t)=>s+t.papers,0);
    const reads = D().papers.filter(p=> ts.some(t=>t.id===p.topic)).reduce((s,p)=>s+p.reads.downloads,0);
    return { topics:ts.length, openGaps, cov, work, papers, reads };
  }, [scope]);

  const mix = isChief ? L.healthMix : {
    healthy: ts.filter(t=>t.health==='healthy').length,
    watch:   ts.filter(t=>t.health==='watch').length,
    atRisk:  ts.filter(t=>t.health==='at-risk').length,
  };
  const sorted = [...ts].sort((a,b)=> ({'at-risk':0,watch:1,healthy:2}[a.health]-{'at-risk':0,watch:1,healthy:2}[b.health]) || a.coverage-b.coverage);

  return (
    <div className="rise" style={{ padding:'22px 26px 60px', maxWidth:1440, margin:'0 auto' }}>
      {/* heading */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:18, gap:16, flexWrap:'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom:7 }}>{isChief? 'Directorate · Whole portfolio' : `${scope.person.name} · ${scope.person.team}`}</div>
          <h1 className="serif" style={{ fontSize:30, fontWeight:500, letterSpacing:'-0.4px' }}>{isChief? 'Portfolio Health' : 'Your Portfolio'}</h1>
        </div>
        <div style={{ display:'flex', gap:9 }}>
          <button className="btn"><span style={{ color:'var(--faint)' }}>This quarter</span> ▾</button>
          <button className="btn btn-gold" onClick={onNewTopic}>+ New topic</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12, marginBottom:14 }}>
        <KPI label={isChief?'Active priorities':'Your topics'} value={agg.topics} sub="tracked" accent="var(--ink)" />
        <KPI label="Open gaps" value={agg.openGaps} sub="unresolved" accent="var(--gold)" />
        <KPI label="Gap coverage" value={pct(agg.cov)} sub="have work against them" accent={agg.cov>=0.6?'var(--green)':'var(--rose)'} />
        <KPI label="Work in flight" value={agg.work} sub="projects active" accent="var(--ink)" />
        <KPI label="Papers (YTD)" value={agg.papers} sub="published" accent="var(--ink)" />
        <KPI label="Readership (YTD)" value={fmt(agg.reads)} sub="downloads" accent="var(--ink)" spark={isChief?L.readTrend:undefined} delta={isChief?11:undefined} />
      </div>

      {/* main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,2.05fr) minmax(300px,1fr)', gap:14, alignItems:'start' }}>
        {/* left: topic table */}
        <div className="panel" style={{ overflow:'hidden' }}>
          <PanelHead title="Priorities" action={
            <div style={{ display:'flex', gap:6 }}>
              <span className="chip"><span className="dot at-risk" style={{ boxShadow:'none' }}/>{mix.atRisk} at risk</span>
              <span className="chip"><span className="dot watch" style={{ boxShadow:'none' }}/>{mix.watch} watch</span>
              <span className="chip"><span className="dot healthy" style={{ boxShadow:'none' }}/>{mix.healthy} on track</span>
            </div>} />
          <div style={{ display:'grid', gridTemplateColumns:'1.7fr 86px 110px 84px 76px', gap:14, padding:'0 16px 8px', }}>
            {['Topic','Momentum','Gap coverage','Open','Work'].map((h,i)=>(
              <div key={h} className="eyebrow" style={{ fontSize:9, textAlign: i>2?'right':(i===0?'left':'left') }}>{h}</div>
            ))}
          </div>
          {sorted.map(t=> <TopicRow key={t.id} t={t} onOpen={(id)=>go('topic',{topicId:id})} />)}
        </div>

        {/* right rail */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="panel" style={{ padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:18 }}>
              <Ring value={agg.cov} size={96} stroke={9} color={agg.cov>=0.6?'var(--green)':'var(--gold)'} label={pct(agg.cov)} sub="covered" />
              <div style={{ flex:1 }}>
                <h3 className="serif" style={{ fontSize:15, fontWeight:500, marginBottom:3 }}>Gap coverage</h3>
                <p style={{ fontSize:11.5, color:'var(--faint)', margin:'0 0 10px', lineHeight:1.4 }}>Share of open gaps with active work assigned.</p>
                <StackBar parts={[
                  {label:'On track', v:mix.healthy, color:'var(--green)'},
                  {label:'Watch', v:mix.watch, color:'var(--gold)'},
                  {label:'At risk', v:mix.atRisk, color:'var(--rose)'},
                ]} h={7} />
                <div className="num" style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:10.5, color:'var(--faint)' }}>
                  <span>Healthiest</span><span>Needs attention</span>
                </div>
              </div>
            </div>
          </div>
          <AttentionGaps topics={ts} onOpen={(id)=>go('topic',{topicId:id})} />
          <ImpactPulse topics={ts} onOpenPaper={(id)=>go('papers',{paperId:id})} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
