/* ===== Intellect — Directorate Brief flow =====
   Chief-facing executive brief for the quarterly directorate review.
   Opened from the Organization view ("Directorate brief") and the sidebar
   ("Prep brief"). Data-driven from the portfolio; print/export ready.
   Reuses shared globals: D, fmt, pct, money, Avatar, orgRollup, covColor, Icon. */

const BRIEF_PERIOD = "FY26 · Q2";

function briefStyleOnce(){
  if (document.getElementById('brief-print-style')) return;
  const s = document.createElement('style');
  s.id = 'brief-print-style';
  s.textContent = `
    @keyframes briefFade{ from{opacity:0} to{opacity:1} }
    @keyframes briefRise{ from{transform:translateY(14px)} to{transform:none} }
    .brief-paper .brief-section{ animation:briefRise .5s cubic-bezier(.2,.7,.2,1) both; }
    @media print {
      @page { margin: 14mm; size: A4; }
      html,body{ background:#fff !important; }
      #root > div > *{ visibility:hidden !important; }
      .brief-overlay{ position:absolute !important; inset:0 !important; background:#fff !important; overflow:visible !important; padding:0 !important; display:block !important; }
      .brief-overlay, .brief-overlay *{ visibility:visible !important; }
      .brief-backdrop, .brief-toolbar{ display:none !important; }
      .brief-paper{ box-shadow:none !important; border:0 !important; max-width:none !important; width:100% !important; margin:0 !important; border-radius:0 !important; animation:none !important; }
      .brief-paper .brief-section{ animation:none !important; break-inside:avoid; }
    }`;
  document.head.appendChild(s);
}

function BriefStat({ label, value, sub, color='var(--ink)' }){
  return (
    <div style={{ minWidth:0 }}>
      <div className="eyebrow" style={{ marginBottom:6 }}>{label}</div>
      <div className="num" style={{ fontSize:23, fontWeight:600, color, lineHeight:1, letterSpacing:'-0.6px', whiteSpace:'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--faint)', marginTop:5 }}>{sub}</div>}
    </div>
  );
}

function SectionHead({ n, title, note }){
  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:16, paddingBottom:11, borderBottom:'1px solid var(--line)' }}>
      <span className="num" style={{ fontSize:12, fontWeight:600, color:'var(--faint)' }}>{n}</span>
      <h3 className="serif" style={{ fontSize:17, fontWeight:600, letterSpacing:'-0.3px' }}>{title}</h3>
      {note && <span className="eyebrow" style={{ marginLeft:'auto' }}>{note}</span>}
    </div>
  );
}

function centerStatus(r){
  if (r.mix['at-risk']>0 || r.cov<0.5) return { t:'Needs attention', c:'var(--rose)' };
  if (r.mix.watch>=r.mix.healthy || r.cov<0.66) return { t:'Watch', c:'var(--amber)' };
  return { t:'On track', c:'var(--green)' };
}

function DirectorateBrief({ open, onClose }){
  const [phase, setPhase] = useState('loading');
  useEffect(()=>{
    briefStyleOnce();
    if (open){
      setPhase('loading');
      const id = setTimeout(()=>setPhase('ready'), 720);
      const onKey = (e)=>{ if(e.key==='Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
      return ()=>{ clearTimeout(id); window.removeEventListener('keydown', onKey); document.body.style.overflow=''; };
    }
  }, [open]);
  if (!open) return null;

  const lab = D().lab;
  const P = lab.portfolio;
  const me = D().people.hv;
  const today = new Date(2026,5,6);
  const dateStr = today.toLocaleDateString('en-US',{ month:'long', day:'numeric', year:'numeric' });

  // exposure: critical/high gaps with no active work
  const exposure = D().gaps.filter(g=> (g.severity==='critical'||g.severity==='high') && (g.work||[]).length===0);
  const ACTION = {
    g9:"Approve data-sharing MOU with utility partner to unblock the coupled flood–grid dataset.",
    g3:"Fund an external endurance campaign to characterize memristors past 10⁸ cycles.",
    g8:"Commission a 30-year accelerated-aging study on CO₂-cured concrete.",
  };
  // centers
  const centers = D().subLabs.map(sl=>{
    const ts = D().topics.filter(t=> sl.teams.includes(t.team));
    return { sl, r: orgRollup(ts) };
  });
  // investment vs priority
  const totBud = Object.values(lab.binBudget).reduce((a,b)=>a+b,0);
  const totFte = Object.values(lab.binFte).reduce((a,b)=>a+b,0);
  const totTop = Object.values(lab.binMix).reduce((a,b)=>a+b,0);
  const p1TopShare = Math.round(lab.binMix[1]/totTop*100);
  const p1BudShare = Math.round(lab.binBudget[1]/totBud*100);
  // impact
  const topPapers = [...D().papers].sort((a,b)=> b.reads.downloads - a.reads.downloads).slice(0,2);

  const decisions = [
    { lead:"Reallocate 1.0 FTE and $0.8M to Climate Resilience Modeling.",
      body:"Flagship topic is at-risk — 33% gap coverage and momentum −14%. Current staffing cannot close the critical flood–grid gap before hurricane season.", tag:"Resourcing" },
    { lead:"Approve the scale-up proposal for seawater-buffered mineralization.",
      body:"Sub-$80/ton route validated against pilot data; DOE program office has requested a scale-up proposal. Time-sensitive to the funding window.", tag:"Portfolio" },
    { lead:"Authorize the Q3 fab run to unblock the on-chip plasticity learning rule.",
      body:"The critical neuromorphic learning-rule work is blocked pending test-chip fabrication. A Q3 slot keeps the flagship roadmap on schedule.", tag:"Operations" },
  ];

  const labelCol = { 1:'P1 · Top priority', 2:'P2 · High', 3:'P3 · Medium', 4:'P4 · Watching' };

  return (
    <div className="brief-overlay" style={{ position:'fixed', inset:0, zIndex:120, display:'flex', flexDirection:'column', alignItems:'center', overflow:'auto', padding:'0 0 60px' }}>
      <div className="brief-backdrop" onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(8,12,20,0.5)', backdropFilter:'blur(3px)', animation:'briefFade .2s both' }}/>

      {/* toolbar */}
      <div className="brief-toolbar" style={{ position:'sticky', top:0, zIndex:2, width:'100%', display:'flex', alignItems:'center', gap:14, padding:'12px 20px',
        background:'var(--topbar)', backdropFilter:'blur(10px)', borderBottom:'1px solid var(--line)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width="22" height="22" viewBox="0 0 28 28" aria-hidden="true"><rect x="0.5" y="0.5" width="27" height="27" rx="7.5" fill="var(--gold)"/><circle cx="14" cy="8.3" r="2.25" fill="var(--on-brand)"/><rect x="11.85" y="12.3" width="4.3" height="8.9" rx="2.15" fill="var(--on-brand)"/></svg>
          <div style={{ lineHeight:1.25 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Directorate Brief</div>
            <div className="eyebrow" style={{ fontSize:9.5 }}>{BRIEF_PERIOD} · Quarterly review</div>
          </div>
        </div>
        <div style={{ flex:1 }}/>
        <span className="chip" style={{ gap:7 }}><span className="dot" style={{ width:6, height:6, background: phase==='ready'?'var(--green)':'var(--amber)', boxShadow:'none' }}/>{phase==='ready'?'Ready to present':'Assembling…'}</span>
        <button className="btn" onClick={()=>window.print()} disabled={phase!=='ready'} style={{ opacity: phase==='ready'?1:0.5 }}>
          <Icon d={icons.download} size={15}/>Export PDF
        </button>
        <button className="btn btn-ghost" onClick={onClose} style={{ padding:8 }}><Icon d={icons.close} size={18}/></button>
      </div>

      {phase==='loading' ? (
        <div style={{ position:'relative', zIndex:1, marginTop:'22vh', display:'flex', flexDirection:'column', alignItems:'center', gap:18, color:'var(--ink)', animation:'briefFade .2s both' }}>
          <div style={{ width:46, height:46, borderRadius:12, border:'2px solid var(--line-2)', borderTopColor:'var(--gold)', animation:'spin 0.8s linear infinite' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:15, fontWeight:600 }}>Assembling directorate brief</div>
            <div style={{ fontSize:12.5, color:'var(--faint)', marginTop:5 }}>Rolling up 200 topics · 6 teams · 3 centers</div>
          </div>
        </div>
      ) : (
        <div className="brief-paper panel" style={{ position:'relative', zIndex:1, width:'min(960px, 94vw)', marginTop:24, padding:'0', overflow:'hidden', boxShadow:'var(--sh-pop)' }}>
          {/* cover header */}
          <div className="brief-section" style={{ padding:'34px 44px 26px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:20 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom:12 }}>{lab.name}</div>
                <h1 className="serif" style={{ fontSize:34, fontWeight:600, letterSpacing:'-0.8px', lineHeight:1.05, whiteSpace:'normal' }}>Quarterly Directorate Brief</h1>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginTop:14, color:'var(--muted)', fontSize:12.5, flexWrap:'wrap' }}>
                  <span className="num" style={{ color:'var(--ink-2)', fontWeight:600 }}>{BRIEF_PERIOD}</span>
                  <span style={{ color:'var(--line-3)' }}>|</span>
                  <span>{dateStr}</span>
                  <span style={{ color:'var(--line-3)' }}>|</span>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:7 }}><Avatar id={me.id} size={18}/>{me.name} · {me.role}</span>
                </div>
              </div>
              <div style={{ textAlign:'right', flex:'none' }}>
                <div className="eyebrow" style={{ marginBottom:6 }}>Review in</div>
                <div className="num" style={{ fontSize:30, fontWeight:600, color:'var(--gold)', letterSpacing:'-1px' }}>9<span style={{ fontSize:14, color:'var(--faint)', fontWeight:500 }}> days</span></div>
              </div>
            </div>
          </div>

          {/* 01 Executive summary */}
          <div className="brief-section" style={{ padding:'26px 44px', borderTop:'1px solid var(--line)', background:'var(--bg)' }}>
            <SectionHead n="01" title="Executive summary" note="What the directorate must know" />
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                ['var(--amber)','Portfolio health is holding, but tail risk is concentrated.', `${lab.healthMix.healthy} of ${P.topics} topics are on track; ${lab.healthMix.atRisk} are at risk. Overall gap coverage sits at ${pct(P.gapsCovered)}.`],
                ['var(--rose)','Three high-priority gaps have no work assigned.', 'Critical exposure on Climate Resilience (coupled flood–grid dataset), plus high-severity gaps in neuromorphic endurance and carbon-concrete durability.'],
                ['var(--green)','Impact is compounding where we have invested.', `${fmt(P.readsYTD)} reads and ${P.citationsYTD.toLocaleString()} citations YTD; flagship Carbon and Neuromorphic papers are driving sponsor pull.`],
              ].map(([c,lead,body],i)=>(
                <div key={i} style={{ display:'flex', gap:13 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:c, flex:'none', marginTop:6, boxShadow:`0 0 0 3px color-mix(in srgb, ${c} 16%, transparent)` }}/>
                  <div>
                    <div style={{ fontSize:14.5, fontWeight:600, marginBottom:3, letterSpacing:'-0.2px' }}>{lead}</div>
                    <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.55 }}>{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 02 Portfolio at a glance */}
          <div className="brief-section" style={{ padding:'26px 44px', borderTop:'1px solid var(--line)' }}>
            <SectionHead n="02" title="Portfolio at a glance" />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', rowGap:24, columnGap:20 }}>
              <BriefStat label="Active topics" value={P.topics} sub={`${P.activeQuestions} open questions`} />
              <BriefStat label="Gap coverage" value={pct(P.gapsCovered)} color={covColor(P.gapsCovered)} sub={`${P.openGaps} open gaps`} />
              <BriefStat label="Work in flight" value={P.workInFlight} sub="active projects" />
              <BriefStat label="Papers (YTD)" value={P.papersYTD} sub={`${fmt(P.readsYTD)} reads`} />
              <BriefStat label="Budget" value={money(lab.budget.allocated)} sub={`${money(lab.budget.spent)} spent · ${Math.round(lab.budget.spent/lab.budget.allocated*100)}% burn`} />
              <BriefStat label="Headcount" value={lab.headcount+' FTE'} color="var(--blue)" sub="across all centers" />
            </div>
          </div>

          {/* 03 Centers scorecard */}
          <div className="brief-section" style={{ padding:'26px 44px', borderTop:'1px solid var(--line)' }}>
            <SectionHead n="03" title="Centers scorecard" note="Detailed-topic rollup" />
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1.6fr 0.7fr 0.9fr 0.7fr 0.7fr 0.9fr 1.1fr', gap:12, padding:'0 0 10px', alignItems:'center' }}>
                {['Center','Topics','Coverage','Gaps','At risk','FTE','Status'].map((h,i)=><div key={h} className="eyebrow" style={{ fontSize:9, textAlign: i===0?'left':'right' }}>{h}</div>)}
              </div>
              {centers.map(({sl,r})=>{ const st=centerStatus(r); return (
                <div key={sl.id} style={{ display:'grid', gridTemplateColumns:'1.6fr 0.7fr 0.9fr 0.7fr 0.7fr 0.9fr 1.1fr', gap:12, padding:'12px 0', borderTop:'1px solid var(--line)', alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0 }}>
                    <span className="mono" style={{ fontSize:9.5, fontWeight:600, color:'var(--on-brand)', background:'var(--brand)', borderRadius:5, padding:'3px 6px' }}>{sl.code}</span>
                    <span style={{ fontSize:13, fontWeight:550, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sl.short}</span>
                  </div>
                  <div className="num" style={{ fontSize:13, textAlign:'right' }}>{r.n}</div>
                  <div className="num" style={{ fontSize:13, textAlign:'right', color:covColor(r.cov), fontWeight:600 }}>{pct(r.cov)}</div>
                  <div className="num" style={{ fontSize:13, textAlign:'right' }}>{r.openGaps}</div>
                  <div className="num" style={{ fontSize:13, textAlign:'right', color: r.mix['at-risk']? 'var(--rose)':'var(--faint)', fontWeight: r.mix['at-risk']?600:400 }}>{r.mix['at-risk']||'—'}</div>
                  <div className="num" style={{ fontSize:13, textAlign:'right', color:'var(--blue)' }}>{r.fte}</div>
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <span className="chip" style={{ color:st.c, borderColor:`color-mix(in srgb, ${st.c} 32%, transparent)`, background:`color-mix(in srgb, ${st.c} 8%, transparent)` }}><span style={{ width:6,height:6,borderRadius:'50%',background:st.c }}/>{st.t}</span>
                  </div>
                </div>
              );})}
            </div>
          </div>

          {/* 04 Exposure register */}
          <div className="brief-section" style={{ padding:'26px 44px', borderTop:'1px solid var(--line)', background:'var(--bg)' }}>
            <SectionHead n="04" title="Exposure register" note={`${exposure.length} uncovered`} />
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {exposure.map(g=>{ const topic=D().topics.find(t=>t.id===g.topic); const owner=D().people[g.owner]; const sc = g.severity==='critical'?'var(--rose)':'var(--amber)'; return (
                <div key={g.id} style={{ display:'grid', gridTemplateColumns:'92px 1fr', gap:16, padding:'14px 16px', background:'var(--panel)', border:'1px solid var(--line)', borderLeft:`3px solid ${sc}`, borderRadius:8 }}>
                  <div>
                    <div className="num" style={{ fontSize:10, fontWeight:700, color:sc, textTransform:'uppercase', letterSpacing:'0.6px' }}>{g.severity}</div>
                    <div style={{ fontSize:11, color:'var(--faint)', marginTop:5 }}>{topic.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:13.5, fontWeight:550, lineHeight:1.4 }}>{g.text}</div>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginTop:9, fontSize:12.5, color:'var(--muted)', lineHeight:1.5 }}>
                      <span style={{ color:'var(--gold)', fontWeight:600, flex:'none' }}>→ Recommend</span>
                      <span>{ACTION[g.id] || 'Assign an owner and scope a work item this quarter.'}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:9, fontSize:11.5, color:'var(--faint)' }}>
                      <Avatar id={owner.id} size={16}/>Owner · {owner.name}
                    </div>
                  </div>
                </div>
              );})}
            </div>
          </div>

          {/* 05 Investment vs priority */}
          <div className="brief-section" style={{ padding:'26px 44px', borderTop:'1px solid var(--line)' }}>
            <SectionHead n="05" title="Investment vs priority" />
            <p style={{ fontSize:13, color:'var(--ink-2)', margin:'0 0 18px', lineHeight:1.55 }}>
              Top-priority work draws the right share of resources — <b className="num" style={{ color:'var(--gold)' }}>P1</b> topics are <b className="num">{p1TopShare}%</b> of the portfolio but command <b className="num" style={{ color:'var(--gold)' }}>{p1BudShare}%</b> of budget. The risk is coverage, not funding: at-risk flagships need people, not just dollars.
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'150px 1fr 1fr', gap:'0 22px', alignItems:'center' }}>
              <div/>
              <div className="eyebrow" style={{ fontSize:9, paddingBottom:9 }}>Budget share</div>
              <div className="eyebrow" style={{ fontSize:9, paddingBottom:9 }}>Topic share</div>
              {[1,2,3,4].map(b=>(
                <React.Fragment key={b}>
                  <div style={{ fontSize:12.5, color:'var(--ink-2)', padding:'9px 0', borderTop:'1px solid var(--line)', fontWeight: b===1?600:400 }}>{labelCol[b]}</div>
                  <div style={{ padding:'9px 0', borderTop:'1px solid var(--line)', display:'flex', alignItems:'center', gap:9 }}>
                    <div style={{ flex:1, height:7, background:'var(--line)', borderRadius:100, overflow:'hidden' }}><div style={{ width:Math.round(lab.binBudget[b]/totBud*100)+'%', height:'100%', background: b===1?'var(--gold)':'var(--ink-2)', borderRadius:100 }}/></div>
                    <span className="num" style={{ fontSize:11.5, color:'var(--muted)', width:34, textAlign:'right' }}>{Math.round(lab.binBudget[b]/totBud*100)}%</span>
                  </div>
                  <div style={{ padding:'9px 0', borderTop:'1px solid var(--line)', display:'flex', alignItems:'center', gap:9 }}>
                    <div style={{ flex:1, height:7, background:'var(--line)', borderRadius:100, overflow:'hidden' }}><div style={{ width:Math.round(lab.binMix[b]/totTop*100)+'%', height:'100%', background:'var(--line-3)', borderRadius:100 }}/></div>
                    <span className="num" style={{ fontSize:11.5, color:'var(--muted)', width:34, textAlign:'right' }}>{Math.round(lab.binMix[b]/totTop*100)}%</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* 06 Impact highlights */}
          <div className="brief-section" style={{ padding:'26px 44px', borderTop:'1px solid var(--line)' }}>
            <SectionHead n="06" title="Impact highlights" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              {topPapers.map(p=>{ const topic=D().topics.find(t=>t.id===p.topic); return (
                <div key={p.id} style={{ padding:'16px 18px', background:'var(--bg)', border:'1px solid var(--line)', borderRadius:10 }}>
                  <div className="eyebrow" style={{ marginBottom:8 }}>{p.venue} · {p.month} {p.year}</div>
                  <div className="serif" style={{ fontSize:14.5, fontWeight:600, lineHeight:1.3, letterSpacing:'-0.2px', marginBottom:12 }}>{p.title}</div>
                  <div style={{ display:'flex', gap:20 }}>
                    {[['Reads',fmt(p.reads.downloads)],['Citations',p.reads.citations],['Altmetric',p.reads.altmetric]].map(([l,v])=>(
                      <div key={l}><div className="num" style={{ fontSize:17, fontWeight:600 }}>{v}</div><div className="eyebrow" style={{ fontSize:8.5, marginTop:3 }}>{l}</div></div>
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:'var(--faint)', marginTop:12 }}>{topic.name}</div>
                </div>
              );})}
            </div>
          </div>

          {/* 07 Decisions requested */}
          <div className="brief-section" style={{ padding:'26px 44px 36px', borderTop:'1px solid var(--line)', background:'var(--bg)' }}>
            <SectionHead n="07" title="Decisions requested" note="From the directorate" />
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {decisions.map((d,i)=>(
                <div key={i} style={{ display:'grid', gridTemplateColumns:'34px 1fr auto', gap:14, padding:'16px 18px', background:'var(--panel)', border:'1px solid var(--line-2)', borderRadius:10, alignItems:'start' }}>
                  <div className="num" style={{ width:30, height:30, borderRadius:8, background:'var(--brand)', color:'var(--on-brand)', display:'grid', placeItems:'center', fontSize:13, fontWeight:700 }}>{i+1}</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, letterSpacing:'-0.2px', marginBottom:5 }}>{d.lead}</div>
                    <div style={{ fontSize:12.5, color:'var(--muted)', lineHeight:1.55 }}>{d.body}</div>
                  </div>
                  <span className="chip" style={{ flex:'none' }}>{d.tag}</span>
                </div>
              ))}
            </div>
          </div>

          {/* footer */}
          <div className="brief-section" style={{ padding:'16px 44px', borderTop:'1px solid var(--line)', display:'flex', justifyContent:'space-between', alignItems:'center', color:'var(--faint)', fontSize:10.5 }}>
            <span className="eyebrow">Confidential · {lab.name}</span>
            <span className="num">Generated {dateStr} · Intellect</span>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { DirectorateBrief });
