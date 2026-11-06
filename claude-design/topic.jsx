/* ===== Intellect — Topic detail with traceability spine ===== */

function GradeRollup({ papers }) {
  const G = window.GRADE, ORDER = window.GRADE_ORDER || [];
  if(!G) return null;
  const graded = papers.filter(p=>p.grade && G[p.grade]);
  const counts = ORDER.map(k=>({ k, g:G[k], n:graded.filter(p=>p.grade===k).length }));
  const total = graded.length;
  return (
    <div style={{ borderLeft:'1px solid var(--line)', paddingLeft:26 }}>
      <div className="eyebrow" style={{ marginBottom:9 }}>Paper grades · <span style={{ color:'var(--muted)' }}>{total} assessed</span></div>
      {total>0 && (
        <div style={{ display:'flex', height:7, borderRadius:100, overflow:'hidden', marginBottom:11, background:'var(--line)' }}>
          {counts.filter(c=>c.n>0).map(c=>(
            <div key={c.k} style={{ flex:c.n, background:c.g.c }} title={`${c.g.t}: ${c.n}`}/>
          ))}
        </div>
      )}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'7px 14px' }}>
        {counts.map(c=>(
          <div key={c.k} style={{ display:'flex', alignItems:'center', gap:6, opacity: c.n?1:0.4 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:c.g.c, flex:'none' }}/>
            <span className="num" style={{ fontSize:13, fontWeight:600, color: c.n?c.g.c:'var(--faint)' }}>{c.n}</span>
            <span style={{ fontSize:11, color:'var(--faint)' }}>{c.g.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NodeCard({ kind, id, title, meta, sub, accent, active, dim, onSelect, nref, children }) {
  return (
    <div ref={nref} onClick={()=>onSelect(id)} style={{
      position:'relative', cursor:'pointer', borderRadius:10, padding:'10px 12px',
      background: active? 'var(--raised)':'var(--panel)',
      border:'1px solid '+(active? 'color-mix(in srgb,'+accent+' 55%, transparent)':'var(--line-2)'),
      boxShadow: active? '0 0 0 1px color-mix(in srgb,'+accent+' 30%, transparent), var(--sh-2)':'var(--sh-1)',
      opacity: dim? 0.32 : 1, transition:'.2s', transform: active?'translateY(-1px)':'none' }}>
      <div style={{ position:'absolute', left:0, top:10, bottom:10, width:2.5, borderRadius:3, background:accent, opacity: active?1:0.5 }}/>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
        <span className="eyebrow" style={{ fontSize:8.5, color:accent }}>{kind}</span>
        {meta}
      </div>
      <div style={{ fontSize:12.5, lineHeight:1.34, color:'var(--ink)', fontWeight: kind==='QUESTION'?500:450 }}>{title}</div>
      {sub}
      {children}
    </div>
  );
}

function TraceMap({ topic }) {
  const D0 = D();
  const qs = D0.questions.filter(q=>q.topic===topic.id);
  const gs = D0.gaps.filter(g=>g.topic===topic.id);
  const ws = D0.work.filter(w=>w.topic===topic.id);
  const ps = D0.papers.filter(p=>p.topic===topic.id);
  const wrap = useRef(null);
  const nodes = useRef({});
  const [sel, setSel] = useState(null);
  const [paths, setPaths] = useState([]);
  const [tick, setTick] = useState(0);

  // build edges
  const edges = useMemo(()=>{
    const e=[];
    qs.forEach(q=> (q.gaps||[]).forEach(g=> e.push([q.id,g,'q'])));
    gs.forEach(g=> (g.work||[]).forEach(w=> e.push([g.id,w,'g'])));
    ws.forEach(w=> (w.papers||[]).forEach(p=> e.push([w.id,p,'w'])));
    ps.forEach(p=> (p.citedBy||[]).forEach(c=> e.push([p.id, c.id, 'p'])));
    return e;
  }, [topic.id]);

  // adjacency for highlight
  const adj = useMemo(()=>{ const a={}; edges.forEach(([s,t])=>{ (a[s]=a[s]||[]).push(t); (a[t]=a[t]||[]).push(s); }); return a; }, [edges]);
  const chain = useMemo(()=>{ if(!sel) return null; const seen=new Set([sel]); const st=[sel];
    while(st.length){ const n=st.pop(); (adj[n]||[]).forEach(m=>{ if(!seen.has(m)){ seen.add(m); st.push(m);} }); } return seen; }, [sel, adj]);

  useLayoutEffect(()=>{
    const compute = ()=>{
      const wr = wrap.current; if(!wr) return;
      const wb = wr.getBoundingClientRect();
      const out = edges.map(([s,t,kind])=>{
        const se = nodes.current[s], te = nodes.current[t];
        if(!se||!te) return null;
        const a = se.getBoundingClientRect(), b = te.getBoundingClientRect();
        const x1 = a.right - wb.left, y1 = a.top - wb.top + a.height/2;
        const x2 = b.left - wb.left,  y2 = b.top - wb.top + b.height/2;
        const dx = Math.max(34,(x2-x1)*0.5);
        return { d:`M${x1} ${y1} C ${x1+dx} ${y1}, ${x2-dx} ${y2}, ${x2} ${y2}`, s, t, kind };
      }).filter(Boolean);
      setPaths(out);
    };
    compute();
    const ro = new ResizeObserver(compute); if(wrap.current) ro.observe(wrap.current);
    window.addEventListener('resize', compute);
    return ()=>{ ro.disconnect(); window.removeEventListener('resize', compute); };
  }, [edges, tick]);

  const EDGE_C = { q:'var(--gold)', g:'var(--blue)', w:'var(--violet)', p:'var(--violet)' };
  const SECTOR = { academic:'var(--blue)', industry:'var(--violet)', government:'var(--green)', policy:'var(--gold)' };
  const cites = ps.flatMap(p=> (p.citedBy||[]).map(c=>({ ...c, paper:p.id })));
  const moreCount = ps.reduce((s,p)=>s+(p.citeMore||0),0);
  const reg = (id)=>(el)=>{ if(el) nodes.current[id]=el; };
  const onSel = (id)=> setSel(s=> s===id? null : id);
  const isDim = (id)=> chain && !chain.has(id);

  if (!qs.length && !gs.length) {
    return <div className="panel" style={{ padding:'40px', textAlign:'center', color:'var(--faint)' }}>
      <div className="serif" style={{ fontSize:18, color:'var(--ink-2)', marginBottom:6 }}>Traceability detail in progress</div>
      <div style={{ fontSize:13 }}>This topic tracks {topic.questions} questions and {topic.gaps} gaps. Structured links are being populated.</div>
    </div>;
  }

  const colHead = (label, n, accent) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:11, paddingBottom:9, borderBottom:'1px solid var(--line)' }}>
      <span className="eyebrow" style={{ color:accent, fontSize:10 }}>{label}</span>
      <span className="num" style={{ fontSize:11, color:'var(--faint)' }}>{n}</span>
    </div>
  );

  return (
    <div className="panel" style={{ padding:'16px 18px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <h3 className="serif" style={{ fontSize:17, fontWeight:500 }}>Traceability spine</h3>
          <p style={{ fontSize:12, color:'var(--faint)', margin:'4px 0 0', maxWidth:600, lineHeight:1.45 }}>Follow the chain from open questions, through the work and papers that resolve them, to the downstream papers that cite our results. Click any node to trace its full path.</p>
        </div>
        {sel && <button className="btn btn-ghost" onClick={()=>setSel(null)} style={{ fontSize:12 }}>Clear trace ✕</button>}
      </div>
      <div style={{ display:'flex', gap:14, marginBottom:14, marginTop:2, flexWrap:'wrap' }}>
        {[['Question','var(--gold)'],['Gap','var(--blue)'],['Work','var(--violet)'],['Paper','var(--green)'],['Cited by','var(--violet)']].map(([l,c],i)=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--muted)' }}>
            <span style={{ width:14, height:2, borderRadius:2, background:c }}/>{l}{i<4 && <span style={{ color:'var(--faint)', marginLeft:4 }}>→</span>}
          </div>
        ))}
      </div>

      <div ref={wrap} style={{ position:'relative', display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:'0 26px', alignItems:'start' }}>
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible', zIndex:1 }}>
          {paths.map((p,i)=>{ const hot = chain && chain.has(p.s) && chain.has(p.t);
            return <path key={i} d={p.d} fill="none" stroke={hot? EDGE_C[p.kind] : 'var(--line-3)'}
              strokeWidth={hot?2:1.2} opacity={chain? (hot?1:0.18):0.5}
              style={{ transition:'.2s' }} />; })}
        </svg>

        {/* Questions */}
        <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', gap:10 }}>
          {colHead('Questions', qs.length, 'var(--gold)')}
          {qs.map(q=>(
            <NodeCard key={q.id} kind="QUESTION" id={q.id} nref={reg(q.id)} accent="var(--gold)"
              active={sel===q.id} dim={isDim(q.id)} onSelect={onSel} title={q.text}
              meta={<span className="chip" style={{ fontSize:8.5, color: q.status==='answered'?'var(--green)': q.status==='partially'?'var(--gold)':'var(--muted)' }}>{q.status==='answered'?'Answered':q.status==='partially'?'Partial':'Open'}</span>} />
          ))}
        </div>
        {/* Gaps */}
        <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', gap:10 }}>
          {colHead('Gaps', gs.length, 'var(--blue)')}
          {gs.map(g=>{ const uncovered = !g.work || g.work.length===0;
            return (
            <NodeCard key={g.id} kind="GAP" id={g.id} nref={reg(g.id)} accent={uncovered?'var(--rose)':'var(--blue)'}
              active={sel===g.id} dim={isDim(g.id)} onSelect={onSel} title={g.text}
              meta={<><span className="num" style={{ fontSize:9, color:SEV[g.severity], textTransform:'uppercase', letterSpacing:'.4px', fontWeight:600 }}>{g.severity}</span>
                {uncovered && <span className="chip" style={{ marginLeft:'auto', fontSize:8.5, color:'var(--rose)', borderColor:'var(--rose-dim)', background:'var(--rose-dim)' }}>Uncovered</span>}</>} />
          );})}
        </div>
        {/* Work */}
        <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', gap:10 }}>
          {colHead('Work in flight', ws.length, 'var(--violet)')}
          {ws.length? ws.map(w=>(
            <NodeCard key={w.id} kind="WORK" id={w.id} nref={reg(w.id)} accent="var(--violet)"
              active={sel===w.id} dim={isDim(w.id)} onSelect={onSel} title={w.title}
              meta={<Tag map={WORK_ST} k={w.status} />}
              sub={<div style={{ marginTop:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--faint)', marginBottom:4 }} className="num"><span>{pct(w.progress)}</span><Avatar id={w.lead} size={16}/></div>
                <Progress v={w.progress} color={w.status==='blocked'?'var(--rose)':'var(--violet)'} h={4} />
              </div>} />
          )) : <div style={{ fontSize:11.5, color:'var(--faint)', padding:'4px 2px' }}>No active work.</div>}
        </div>
        {/* Papers */}
        <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', gap:10 }}>
          {colHead('Papers', ps.length, 'var(--green)')}
          {ps.length? ps.map(p=>(
            <NodeCard key={p.id} kind="PAPER" id={p.id} nref={reg(p.id)} accent="var(--green)"
              active={sel===p.id} dim={isDim(p.id)} onSelect={onSel} title={p.title}
              meta={<span className="chip" style={{ fontSize:8.5 }}>{p.venue}</span>}
              sub={<div className="num" style={{ display:'flex', gap:10, marginTop:7, fontSize:10, color:'var(--faint)' }}>
                <span>↓{fmt(p.reads.downloads)}</span><span>◇{p.reads.citations}</span><span style={{ color:'var(--violet)' }}>◆{p.reads.altmetric}</span></div>} />
          )) : <div style={{ fontSize:11.5, color:'var(--faint)', padding:'4px 2px' }}>No papers yet.</div>}
        </div>
        {/* Cited by (downstream) */}
        <div style={{ position:'relative', zIndex:2, display:'flex', flexDirection:'column', gap:10 }}>
          {colHead('Cited by', cites.length, 'var(--violet)')}
          {cites.length? <>
            {cites.map(c=>(
              <NodeCard key={c.id} kind="CITED BY" id={c.id} nref={reg(c.id)} accent="var(--violet)"
                active={sel===c.id} dim={isDim(c.id)} onSelect={onSel} title={c.title}
                meta={<span className="chip" style={{ fontSize:8.5 }}>{c.venue} · {c.year}</span>}
                sub={<div style={{ display:'flex', alignItems:'center', gap:6, marginTop:7 }}>
                  <span style={{ fontSize:10.5, color:'var(--muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.org}</span>
                  <span className="chip" style={{ marginLeft:'auto', fontSize:8, color: SECTOR[c.sector], borderColor:'color-mix(in srgb,'+SECTOR[c.sector]+' 32%, transparent)' }}>{c.sector}</span>
                </div>} />
            ))}
            {moreCount>0 && <div className="num" style={{ fontSize:11, color:'var(--faint)', padding:'9px 10px', border:'1px dashed var(--line-2)', borderRadius:8, textAlign:'center' }}>+{moreCount} more citing works</div>}
          </> : <div style={{ fontSize:11.5, color:'var(--faint)', padding:'4px 2px' }}>No citations tracked yet.</div>}
        </div>
      </div>
    </div>
  );
}

function TopicDetail({ topicId, go, scope }) {
  const t = D().topics.find(x=>x.id===topicId) || D().topics[0];
  const lead = D().people[t.lead];
  const covColor = t.coverage>=0.75?'var(--green)': t.coverage>=0.5?'var(--gold)':'var(--rose)';
  const ws = D().work.filter(w=>w.topic===t.id);
  const wsBudget = ws.reduce((s,w)=>s+(w.budget?w.budget.allocated:0),0);

  return (
    <div className="rise" style={{ padding:'18px 26px 60px', maxWidth:1440, margin:'0 auto' }}>
      <button className="btn btn-ghost" onClick={()=>go('dashboard')} style={{ marginBottom:14, fontSize:12.5, color:'var(--muted)', padding:'5px 8px' }}>
        <Icon d={icons.back} size={15}/> Portfolio
      </button>

      {/* header */}
      <div className="panel" style={{ padding:'20px 22px', marginBottom:14 }}>
        <div style={{ display:'flex', gap:24, alignItems:'flex-start', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:320 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:9 }}>
              <PriorityBadge bin={t.bin} size={20} />
              <span className={'dot '+t.health}/>
              <HealthTag h={t.health} />
              <span className="eyebrow" style={{ marginLeft:4 }}>{BIN[t.bin].name} · {t.team}</span>
            </div>
            <h1 className="serif" style={{ fontSize:30, fontWeight:500, letterSpacing:'-0.4px', marginBottom:8 }}>{t.name}</h1>
            <p style={{ fontSize:14, color:'var(--ink-2)', maxWidth:620, lineHeight:1.5, margin:'0 0 14px' }}>{t.summary}</p>
            <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <Avatar id={lead.id} size={30} ring />
                <div style={{ lineHeight:1.25, whiteSpace:'nowrap' }}><div style={{ fontSize:12.5, fontWeight:550 }}>{lead.name}</div><div style={{ fontSize:10.5, color:'var(--faint)' }}>Topic lead</div></div>
              </div>
              <div style={{ width:1, height:30, background:'var(--line)' }}/>
              <div>
                <div className="eyebrow" style={{ marginBottom:5 }}>Sponsors</div>
                <div style={{ display:'flex', gap:6 }}>{t.sponsors.map(s=><span key={s} className="chip">{s}</span>)}</div>
              </div>
              <div style={{ width:1, height:30, background:'var(--line)' }}/>
              <div>
                <div className="eyebrow" style={{ marginBottom:5 }}>Tags</div>
                <div style={{ display:'flex', gap:6 }}>{t.tags.map(s=><span key={s} className="chip" style={{ color:'var(--muted)' }}>#{s}</span>)}</div>
              </div>
            </div>
          </div>
          {/* stat cluster */}
          <div style={{ display:'flex', gap:22, alignItems:'center', paddingLeft:8 }}>
            <div style={{ textAlign:'center' }}>
              <Ring value={t.coverage} size={88} stroke={8} color={covColor} label={pct(t.coverage)} sub="coverage" />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 22px' }}>
              {[['Questions',t.questions,'var(--gold)'],['Open gaps',t.openGaps,'var(--rose)'],['Work',t.work,'var(--blue)'],['Papers',t.papers,'var(--green)']].map(([l,v,c])=>(
                <div key={l}>
                  <div className="num" style={{ fontSize:24, fontWeight:600, color:c, lineHeight:1 }}>{v}</div>
                  <div className="eyebrow" style={{ marginTop:5 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* resourcing strip */}
      <div className="panel" style={{ padding:'14px 18px', marginBottom:14, display:'grid', gridTemplateColumns:'1.3fr 0.9fr 0.9fr 1.2fr', gap:24, alignItems:'center' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom:9 }}>FY26 budget</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:7 }} className="num">
            <span style={{ fontSize:16, fontWeight:600 }}>{money(t.budget.spent)} <span style={{ color:'var(--faint)', fontWeight:400, fontSize:12 }}>spent</span></span>
            <span style={{ color:'var(--faint)', fontSize:12 }}>of {money(t.budget.allocated)} · {Math.round(t.budget.spent/t.budget.allocated*100)}%</span>
          </div>
          <Progress v={t.budget.spent/t.budget.allocated} color="var(--gold)" />
        </div>
        <div style={{ borderLeft:'1px solid var(--line)', paddingLeft:26 }}>
          <div className="eyebrow" style={{ marginBottom:9 }}>People · <span style={{ color:'var(--blue)' }}>{t.fte} FTE</span></div>
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <AvatarStack ids={t.team_ids} size={26} />
            <span style={{ fontSize:11.5, color:'var(--faint)' }}>{t.team_ids.length} researchers</span>
          </div>
        </div>
        <div style={{ borderLeft:'1px solid var(--line)', paddingLeft:26 }}>
          <div className="eyebrow" style={{ marginBottom:9 }}>Experiments funded</div>
          <div className="num" style={{ fontSize:16, fontWeight:600 }}>{ws.length} <span style={{ color:'var(--faint)', fontWeight:400, fontSize:12 }}>active · {money(wsBudget)} committed</span></div>
        </div>
        <GradeRollup papers={D().papers.filter(p=>p.topic===t.id)} />
      </div>

      {/* traceability spine */}
      <TraceMap topic={t} />

      {/* work board strip */}
      {ws.length>0 && (
        <div className="panel" style={{ marginTop:14, overflow:'hidden' }}>
          <PanelHead title="Work against this topic" action={
            <span className="chip" style={{ color:'var(--faint)' }} title="Execution lives in the lab's research-ops tool; mirrored here read-only for portfolio review">⟲ Synced · read-only · {ws.length} items</span>
          } />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12, padding:'4px 16px 18px' }}>
            {ws.map(w=>{ const gp = (w.gaps||[]).map(id=>D().gaps.find(g=>g.id===id)).filter(Boolean);
              return (
              <div key={w.id} style={{ background:'var(--panel)', border:'1px solid var(--line-2)', borderRadius:10, padding:'13px 14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:9 }}>
                  <div style={{ fontSize:13.5, fontWeight:550 }}>{w.title}</div>
                  <Tag map={WORK_ST} k={w.status} />
                </div>
                {w.note && <p style={{ fontSize:11.5, color:'var(--faint)', margin:'0 0 11px', lineHeight:1.4 }}>{w.note}</p>}
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10.5, color:'var(--faint)', marginBottom:5 }} className="num"><span>Progress {pct(w.progress)}</span><span>Due {w.due.slice(5)}</span></div>
                <Progress v={w.progress} color={w.status==='blocked'?'var(--rose)':'var(--blue)'} />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:11 }}>
                  <AvatarStack ids={w.team} size={22} />
                  {gp[0] && <span className="chip" style={{ color:'var(--blue)', borderColor:'var(--blue-dim)' }}>fills {gp.length} gap{gp.length>1?'s':''}</span>}
                </div>
                <div className="num" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10, paddingTop:10, borderTop:'1px solid var(--line)', fontSize:11, color:'var(--faint)' }}>
                  <span>{w.budget? money(w.budget.spent):'—'} <span style={{ opacity:.7 }}>/ {w.budget? money(w.budget.allocated):'—'}</span></span>
                  <span style={{ color:'var(--blue)' }}>{w.fte} FTE</span>
                </div>
              </div>
            );})}
          </div>
        </div>
      )}
    </div>
  );
}

window.TopicDetail = TopicDetail;
