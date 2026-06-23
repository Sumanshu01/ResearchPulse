import React, { useState, useEffect, useCallback, useRef } from 'react';
import { analyticsAPI } from '../services/api.js';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Zap, Radio, Target, Activity } from 'lucide-react';
import * as d3 from 'd3';

const PERIODS = ['daily', 'weekly', 'monthly'];

const SECTORS = [
  { name: 'AI & ML',          color: '#6366f1', dim: '#312e81', keywords: ['intelligence','neural','learning','nlp','vision','agent','model','llm','generative','ai','protocol','mcp'] },
  { name: 'Data Systems',     color: '#06b6d4', dim: '#164e63', keywords: ['data','knowledge','database','graph','cloud','federated','edge','mining'] },
  { name: 'Bio & Health',     color: '#10b981', dim: '#064e3b', keywords: ['med','health','bio','cancer','gene','drug','genomic','clinical','neuro'] },
  { name: 'Quantum',          color: '#8b5cf6', dim: '#3b0764', keywords: ['quantum','physic','algorithm','photon','mechanic'] },
  { name: 'Climate',          color: '#f59e0b', dim: '#451a03', keywords: ['climate','envir','sustain','energy','ecol','atmos','renew'] },
  { name: 'Security',         color: '#ef4444', dim: '#450a0a', keywords: ['secur','privac','crypt','block','chain','decent','netw','malware'] },
  { name: 'Robotics',         color: '#ec4899', dim: '#500724', keywords: ['robot','auto','control','vehicle','motion','human'] },
  { name: 'Other',            color: '#84cc16', dim: '#1a2e05', keywords: [] },
];

const classifyTopic = (name) => {
  const lower = name.toLowerCase();
  for (let i = 0; i < SECTORS.length - 1; i++) {
    if (SECTORS[i].keywords.some(k => lower.includes(k))) return SECTORS[i];
  }
  return SECTORS[SECTORS.length - 1];
};

const StatusBadge = ({ status }) => {
  const map = {
    emerging:  { cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/40', icon: <Zap size={9}/>,        label: 'Emerging' },
    growing:   { cls: 'text-blue-400   bg-blue-400/10   border-blue-400/40',      icon: <TrendingUp size={9}/>, label: 'Growing'  },
    stable:    { cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/40',    icon: <Minus size={9}/>,      label: 'Stable'   },
    declining: { cls: 'text-red-400    bg-red-400/10    border-red-400/40',        icon: <TrendingDown size={9}/>, label: 'Declining' },
  };
  const s = map[status] || map.stable;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
};

function MiniSparkline({ count, prevCount, color = '#10b981' }) {
  const pts = [
    prevCount,
    prevCount * 1.05 + (count - prevCount) * 0.1,
    prevCount * 0.95 + (count - prevCount) * 0.3,
    prevCount * 1.1  + (count - prevCount) * 0.5,
    prevCount * 1.02 + (count - prevCount) * 0.8,
    count,
  ];
  const w = 80, h = 24, pad = 2;
  const minV = Math.min(...pts), maxV = Math.max(...pts);
  const range = maxV - minV || 1;
  const xs = i  => pad + (i / (pts.length - 1)) * (w - 2 * pad);
  const ys = v  => h - pad - ((v - minV) / range) * (h - 2 * pad);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs(i)},${ys(p)}`).join(' ');
  const area = `${path} L${xs(pts.length-1)},${h} L${xs(0)},${h}Z`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25}/>
          <stop offset="100%" stopColor={color} stopOpacity={0}/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#','')})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={xs(pts.length-1)} cy={ys(count)} r={2.5} fill={color} stroke="#E6E3FC" strokeWidth={1.5}/>
    </svg>
  );
}

export default function TrendRadar() {
  const [period,        setPeriod]        = useState('weekly');
  const [trends,        setTrends]        = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [computing,     setComputing]     = useState(false);
  const [error,         setError]         = useState(null);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const navigate   = useNavigate();
  const radarSvgRef = useRef(null);
  const timerRef    = useRef(null);

  /* ─── data loading ─────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await analyticsAPI.getTrends(period, 50);
      setTrends(data.trends || []);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (trends.length && !selectedTrend) setSelectedTrend(trends[0]);
  }, [trends, selectedTrend]);

  useEffect(() => { setSelectedTrend(null); }, [period]);

  const handleCompute = async () => {
    setComputing(true);
    try { await analyticsAPI.computeTrends(period); await load(); }
    catch (e) { setError(e.message); }
    finally   { setComputing(false); }
  };

  /* ─── D3 Radar ─────────────────────────────────── */
  useEffect(() => {
    if (loading || !trends.length || !radarSvgRef.current) return;

    // stop previous timer
    if (timerRef.current) { timerRef.current.stop(); timerRef.current = null; }

    const svg     = d3.select(radarSvgRef.current);
    svg.selectAll('*').remove();

    const W = 560, H = 560, cx = W / 2, cy = H / 2, R = 220;

    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('height', '100%');

    /* ── defs ── */
    const defs = svg.append('defs');

    // Radar screen background radial gradient
    const bgGrad = defs.append('radialGradient').attr('id','radar-bg')
      .attr('cx','50%').attr('cy','50%').attr('r','50%');
    bgGrad.append('stop').attr('offset','0%').attr('stop-color','#C2B8FA').attr('stop-opacity',1);
    bgGrad.append('stop').attr('offset','100%').attr('stop-color','#D5CEFD').attr('stop-opacity',1);

    // Green glow filter for sweep
    const gf = defs.append('filter').attr('id','sweep-glow')
      .attr('x','-30%').attr('y','-30%').attr('width','160%').attr('height','160%');
    gf.append('feGaussianBlur').attr('stdDeviation',5).attr('result','blur');
    const feMerge = gf.append('feMerge');
    feMerge.append('feMergeNode').attr('in','blur');
    feMerge.append('feMergeNode').attr('in','SourceGraphic');

    // Blip glow filter
    const bf = defs.append('filter').attr('id','blip-glow')
      .attr('x','-50%').attr('y','-50%').attr('width','200%').attr('height','200%');
    bf.append('feGaussianBlur').attr('stdDeviation',3).attr('result','blur');
    const bfm = bf.append('feMerge');
    bfm.append('feMergeNode').attr('in','blur');
    bfm.append('feMergeNode').attr('in','SourceGraphic');

    // Per-sector fill gradients for wedges
    SECTORS.forEach((sec, i) => {
      const sg = defs.append('radialGradient').attr('id', `sec-grad-${i}`)
        .attr('cx','50%').attr('cy','50%').attr('r','50%')
        .attr('gradientUnits','userSpaceOnUse')
        .attr('cx', cx).attr('cy', cy);
      sg.append('stop').attr('offset','0%').attr('stop-color', sec.color).attr('stop-opacity',0.04);
      sg.append('stop').attr('offset','100%').attr('stop-color', sec.color).attr('stop-opacity',0.13);
    });

    // Sweep trail gradient (conic-like using linear)
    const sweepGrad = defs.append('radialGradient').attr('id','sweep-trail')
      .attr('cx','50%').attr('cy','50%').attr('r','50%')
      .attr('gradientUnits','userSpaceOnUse').attr('cx',cx).attr('cy',cy);
    sweepGrad.append('stop').attr('offset','0%').attr('stop-color','#10b981').attr('stop-opacity',0.0);
    sweepGrad.append('stop').attr('offset','100%').attr('stop-color','#10b981').attr('stop-opacity',0.0);

    /* ── background circle ── */
    svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',R+10)
      .attr('fill','url(#radar-bg)').attr('stroke','#ABA2EB').attr('stroke-width',1);

    /* ── sector wedges ── */
    const sectorCount  = SECTORS.length;
    const sectorArc    = (2 * Math.PI) / sectorCount;

    const wedgeG = svg.append('g').attr('class','wedges');
    SECTORS.forEach((sec, i) => {
      const startAngle = i * sectorArc - Math.PI / 2;
      const endAngle   = startAngle + sectorArc;
      const arcPath    = d3.arc().innerRadius(0).outerRadius(R).startAngle(startAngle).endAngle(endAngle);
      wedgeG.append('path')
        .attr('d', arcPath())
        .attr('transform', `translate(${cx},${cy})`)
        .attr('fill', `url(#sec-grad-${i})`)
        .attr('stroke', sec.color)
        .attr('stroke-opacity', 0.2)
        .attr('stroke-width', 0.5);
    });

    /* ── concentric rings ── */
    const rings = [
      { r: R * 0.3,  label: 'Stable',   labelColor: '#5D539F' },
      { r: R * 0.6,  label: 'Growing',  labelColor: '#2563EB' },
      { r: R * 0.88, label: 'Emerging', labelColor: '#059669' },
    ];
    const gridG = svg.append('g').attr('class','grid');
    rings.forEach(ring => {
      gridG.append('circle').attr('cx',cx).attr('cy',cy).attr('r',ring.r)
        .attr('fill','none').attr('stroke','#ABA2EB').attr('stroke-width',1)
        .attr('stroke-dasharray','4,4').attr('stroke-opacity',0.7);
      gridG.append('text')
        .text(ring.label.toUpperCase())
        .attr('x', cx + ring.r + 5).attr('y', cy - 5)
        .attr('fill', ring.labelColor).attr('font-size','8px').attr('font-weight','700')
        .attr('font-family','monospace').style('pointer-events','none');
    });

    /* ── sector dividers ── */
    const dividerG = svg.append('g').attr('class','dividers');
    SECTORS.forEach((sec, i) => {
      const angle = i * sectorArc - Math.PI / 2;
      dividerG.append('line')
        .attr('x1', cx).attr('y1', cy)
        .attr('x2', cx + (R+10) * Math.cos(angle))
        .attr('y2', cy + (R+10) * Math.sin(angle))
        .attr('stroke', '#ABA2EB').attr('stroke-width',1).attr('stroke-opacity',0.9);

      // Sector label
      const midAngle = angle + sectorArc / 2;
      const lR       = R + 28;
      const lx       = cx + lR * Math.cos(midAngle);
      const ly       = cy + lR * Math.sin(midAngle);
      const cosA     = Math.cos(midAngle);
      const anchor   = cosA > 0.15 ? 'start' : (cosA < -0.15 ? 'end' : 'middle');
      dividerG.append('text')
        .text(sec.name)
        .attr('x', lx).attr('y', ly + 3.5)
        .attr('text-anchor', anchor)
        .attr('fill', sec.color).attr('fill-opacity', 0.85)
        .attr('font-size','9px').attr('font-weight','800')
        .attr('font-family','monospace').style('pointer-events','none');
    });

    /* ── radar crosshair center ── */
    const crossG = svg.append('g').attr('class','crosshair').style('pointer-events','none');
    crossG.append('line').attr('x1',cx-8).attr('y1',cy).attr('x2',cx+8).attr('y2',cy)
      .attr('stroke','#10b981').attr('stroke-width',1).attr('stroke-opacity',0.5);
    crossG.append('line').attr('x1',cx).attr('y1',cy-8).attr('x2',cx).attr('y2',cy+8)
      .attr('stroke','#10b981').attr('stroke-width',1).attr('stroke-opacity',0.5);
    crossG.append('circle').attr('cx',cx).attr('cy',cy).attr('r',3)
      .attr('fill','#10b981').attr('fill-opacity',0.4);

    /* ── blip positions ── */
    const blips = [];
    const sectorGroups = {};
    trends.forEach(t => {
      const sec = classifyTopic(t.topicName);
      if (!sectorGroups[sec.name]) sectorGroups[sec.name] = [];
      sectorGroups[sec.name].push({ ...t, sec });
    });

    const maxScore = d3.max(trends, d => d.trendScore) || 10;

    SECTORS.forEach((sec, secIdx) => {
      const group = sectorGroups[sec.name] || [];
      const startAngle = secIdx * sectorArc - Math.PI / 2 + sectorArc * 0.1;
      const endAngle   = (secIdx + 1) * sectorArc - Math.PI / 2 - sectorArc * 0.1;

      group.forEach((t, idx) => {
        let minR = 10, maxR = R * 0.28;
        if (t.status === 'emerging')       { minR = R * 0.65; maxR = R * 0.87; }
        else if (t.status === 'growing')   { minR = R * 0.35; maxR = R * 0.58; }

        const ratio = Math.min(1.0, Math.max(0.0, (t.trendScore || 0) / maxScore));
        const r     = minR + ratio * (maxR - minR);

        const theta = group.length === 1
          ? (startAngle + endAngle) / 2
          : startAngle + (idx / (group.length - 1)) * (endAngle - startAngle);

        blips.push({
          id: t._id,
          topicName: t.topicName,
          publicationCount: t.publicationCount,
          growthPercent: t.growthPercent,
          totalCitations: t.totalCitations,
          trendScore: t.trendScore,
          status: t.status,
          previousCount: t.previousCount,
          color: sec.color,
          sectorName: sec.name,
          blipRadius: Math.max(4, Math.min(9, 4 + (t.publicationCount || 0) * 0.2)),
          x: cx + r * Math.cos(theta),
          y: cy + r * Math.sin(theta),
          angleRad: theta,
          data: t,
        });
      });
    });

    /* ── sweep layer ── */
    const sweepG = svg.append('g').attr('class','sweep').style('pointer-events','none');

    // Trail arc (45° wide)
    const trailArc = d3.arc().innerRadius(0).outerRadius(R)
      .startAngle(0).endAngle((45 * Math.PI) / 180);

    const trailFill = defs.append('radialGradient').attr('id','trail-fill')
      .attr('gradientUnits','userSpaceOnUse').attr('cx',cx).attr('cy',cy).attr('r',R);
    trailFill.append('stop').attr('offset','0%').attr('stop-color','#10b981').attr('stop-opacity',0.0);
    trailFill.append('stop').attr('offset','70%').attr('stop-color','#10b981').attr('stop-opacity',0.06);
    trailFill.append('stop').attr('offset','100%').attr('stop-color','#10b981').attr('stop-opacity',0.15);

    sweepG.append('path')
      .attr('d', trailArc())
      .attr('transform',`translate(${cx},${cy})`)
      .attr('fill','url(#trail-fill)');

    const sweepLine = sweepG.append('line')
      .attr('x1',cx).attr('y1',cy)
      .attr('x2', cx + R * Math.cos(0))
      .attr('y2', cy + R * Math.sin(0))
      .attr('stroke','#10b981').attr('stroke-width',1.8).attr('stroke-opacity',0.9)
      .style('filter','url(#sweep-glow)');

    /* ── echo rings layer (behind blips) ── */
    const echoG = svg.append('g').attr('class','echos').style('pointer-events','none');
    const echoData = blips.map(b => ({ ...b, active: false }));
    const echoSel = echoG.selectAll('circle').data(echoData).enter().append('circle')
      .attr('cx', d => d.x).attr('cy', d => d.y)
      .attr('r', d => d.blipRadius)
      .attr('fill','none')
      .attr('stroke', d => d.color).attr('stroke-width',1.5)
      .attr('opacity',0);

    /* ── blip groups ── */
    const blipG = svg.append('g').attr('class','blips');
    const blipGroups = blipG.selectAll('g').data(blips).enter().append('g')
      .style('cursor','pointer')
      .on('click', (event, d) => setSelectedTrend(d.data))
      .on('mouseover', handleMouseOver)
      .on('mousemove', handleMouseMove)
      .on('mouseout',  handleMouseOut);

    // status-based outer ring
    blipGroups.append('circle')
      .attr('cx', d => d.x).attr('cy', d => d.y)
      .attr('r', d => d.blipRadius + 3)
      .attr('fill','none')
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.status === 'emerging' ? 1.5 : 0.8)
      .attr('stroke-opacity', d => d.status === 'emerging' ? 0.5 : 0.25);

    // core dot
    blipGroups.append('circle')
      .attr('class','blip-core')
      .attr('cx', d => d.x).attr('cy', d => d.y)
      .attr('r', d => d.blipRadius)
      .attr('fill', d => d.color)
      .attr('stroke','#E6E3FC').attr('stroke-width',1.5)
      .style('filter','url(#blip-glow)');

    /* ── lock-on overlay ── */
    const lockG = svg.append('g').attr('class','lock-on').style('pointer-events','none');

    const drawLockOn = (blip) => {
      lockG.selectAll('*').remove();
      if (!blip) return;
      const { x, y, blipRadius: br, color } = blip;
      const r = br + 10;
      // rotating dashed ring
      lockG.append('circle')
        .attr('cx', x).attr('cy', y).attr('r', r)
        .attr('fill','none').attr('stroke','#ef4444')
        .attr('stroke-width',1.5).attr('stroke-dasharray','4,3')
        .append('animateTransform')
        .attr('attributeName','transform').attr('type','rotate')
        .attr('from',`0 ${x} ${y}`).attr('to',`360 ${x} ${y}`)
        .attr('dur','3s').attr('repeatCount','indefinite');
      // outer pulse
      lockG.append('circle')
        .attr('cx', x).attr('cy', y).attr('r', r + 6)
        .attr('fill','none').attr('stroke', color)
        .attr('stroke-width',0.75).attr('stroke-opacity',0.35);
      // crosshairs
      const arm = 7;
      [[x-r-arm,y,x-r,y],[x+r,y,x+r+arm,y],[x,y-r-arm,x,y-r],[x,y+r,x,y+r+arm]].forEach(([x1,y1,x2,y2]) => {
        lockG.append('line').attr('x1',x1).attr('y1',y1).attr('x2',x2).attr('y2',y2)
          .attr('stroke','#ef4444').attr('stroke-width',1.5);
      });
    };

    const initialBlip = blips.find(b => b.id === selectedTrend?._id) || blips[0];
    drawLockOn(initialBlip);

    /* ── labels ── */
    const labelG = svg.append('g').attr('class','labels').style('pointer-events','none');
    blips.filter(b => b.status === 'emerging' || b.blipRadius > 6).forEach(b => {
      const truncated = b.topicName.length > 14 ? b.topicName.slice(0,13)+'…' : b.topicName;
      labelG.append('text')
        .text(truncated)
        .attr('x', b.x + b.blipRadius + 5).attr('y', b.y + 3)
        .attr('fill', b.color).attr('fill-opacity', 0.75)
        .attr('font-size','7.5px').attr('font-weight','700').attr('font-family','monospace');
    });

    /* ── outer ring border ── */
    svg.append('circle').attr('cx',cx).attr('cy',cy).attr('r',R+2)
      .attr('fill','none').attr('stroke','#1e3a5f').attr('stroke-width',1.5);

    /* ── tooltip ── */
    function handleMouseOver(event, d) {
      d3.select(this).select('circle.blip-core')
        .attr('r', d.blipRadius * 1.45)
        .attr('stroke','#120E3D').attr('stroke-width',2);
      const tip = d3.select('#radar-tip');
      tip.style('opacity',1).html(`
        <div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${d.color};display:inline-block;"></span>
            <span style="color:#120E3D;font-weight:700;font-size:11px;">${d.topicName}</span>
          </div>
          <p style="color:#5D539F;font-size:10px;margin:2px 0;">${d.sectorName}</p>
          <p style="color:#5D539F;font-size:10px;margin:2px 0;">${d.publicationCount} papers · ${(d.totalCitations||0).toLocaleString()} citations</p>
          <div style="border-top:1px solid #ABA2EB;margin:6px 0;"></div>
          <p style="color:#059669;font-size:10px;font-weight:700;">Growth: +${(d.growthPercent||0).toFixed(0)}% · Score: ${(d.trendScore||0).toFixed(1)}</p>
        </div>
      `);
    }
    function handleMouseMove(event) {
      d3.select('#radar-tip')
        .style('left', `${event.pageX + 14}px`)
        .style('top',  `${event.pageY - 14}px`);
    }
    function handleMouseOut(event, d) {
      d3.select(this).select('circle.blip-core')
        .attr('r', d.blipRadius)
        .attr('stroke','#E6E3FC').attr('stroke-width',1.5);
      d3.select('#radar-tip').style('opacity',0);
    }

    /* ── animate sweep ── */
    let angleVal = 0;
    const timer = d3.timer((elapsed) => {
      angleVal = (elapsed / 14) % 360;
      const rad = (angleVal * Math.PI) / 180;

      sweepG.attr('transform',`rotate(${angleVal},${cx},${cy})`);
      sweepLine.attr('x2', cx + R * Math.cos(rad)).attr('y2', cy + R * Math.sin(rad));

      blips.forEach((b, i) => {
        let bAngleDeg = (Math.atan2(b.y - cy, b.x - cx) * 180 / Math.PI + 360) % 360;
        let diff      = (angleVal - bAngleDeg + 360) % 360;
        if (diff < 3.5 || diff > 356.5) {
          d3.select(echoSel.nodes()[i])
            .attr('opacity', 0.9).attr('r', b.blipRadius)
            .transition().duration(900).ease(d3.easeOut)
            .attr('r', b.blipRadius * 4).attr('opacity', 0);
        }
      });
    });
    timerRef.current = timer;

    return () => {
      timer.stop();
      timerRef.current = null;
    };
  }, [loading, trends]);

  // Redraw lock-on when selectedTrend changes without re-rendering whole radar
  useEffect(() => {
    if (!radarSvgRef.current) return;
    const lockG = d3.select(radarSvgRef.current).select('.lock-on');
    if (lockG.empty()) return;

    const blipNodes = d3.select(radarSvgRef.current).selectAll('g.blips > g').data();
    const blip = (blipNodes || []).find(b => b?.id === selectedTrend?._id);
    if (!blip) return;

    lockG.selectAll('*').remove();
    const { x, y, blipRadius: br, color } = blip;
    const r = br + 10;
    lockG.append('circle').attr('cx',x).attr('cy',y).attr('r',r)
      .attr('fill','none').attr('stroke','#ef4444')
      .attr('stroke-width',1.5).attr('stroke-dasharray','4,3')
      .append('animateTransform').attr('attributeName','transform').attr('type','rotate')
      .attr('from',`0 ${x} ${y}`).attr('to',`360 ${x} ${y}`)
      .attr('dur','3s').attr('repeatCount','indefinite');
    lockG.append('circle').attr('cx',x).attr('cy',y).attr('r',r+6)
      .attr('fill','none').attr('stroke',color).attr('stroke-width',0.75).attr('stroke-opacity',0.35);
    [[x-(r+7),y,x-r,y],[x+r,y,x+r+7,y],[x,y-(r+7),x,y-r],[x,y+r,x,y+r+7]].forEach(([x1,y1,x2,y2]) => {
      lockG.append('line').attr('x1',x1).attr('y1',y1).attr('x2',x2).attr('y2',y2)
        .attr('stroke','#ef4444').attr('stroke-width',1.5);
    });
  }, [selectedTrend]);

  /* ─── derived stats ─────────────────────────────── */
  const emerging  = trends.filter(t => t.status === 'emerging');
  const growing   = trends.filter(t => t.status === 'growing');
  const declining = trends.filter(t => t.status === 'declining');
  const maxCitations = Math.max(...trends.map(t => t.totalCitations || 0), 1);
  const maxPapers    = Math.max(...trends.map(t => t.publicationCount || 0), 1);

  /* ─── JSX ───────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* floating tooltip */}
      <div id="radar-tip"
        className="fixed pointer-events-none bg-brand-card/95 border border-brand-border rounded-xl p-3 shadow-2xl transition-opacity duration-100 opacity-0 z-[999] max-w-[230px]"
        style={{ fontSize: '11px' }}
      />

      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-text flex items-center gap-2.5">
            <Radio className="text-brand-primary animate-pulse" size={26} />
            Research Trend Radar
          </h1>
          <p className="text-sm text-brand-textMuted mt-1">
            Real-time sweep of emerging, growing, and declining research signals across 8 disciplines
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-brand-bg border border-brand-border rounded-xl p-1">
            {PERIODS.map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${period === p ? 'bg-brand-primary text-white shadow-md' : 'text-brand-textMuted hover:text-brand-text'}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={handleCompute} disabled={computing}
            className="flex items-center gap-2 px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold text-brand-textMuted hover:text-brand-text transition-all cursor-pointer">
            <RefreshCw size={14} className={computing ? 'animate-spin' : ''} />
            {computing ? 'Computing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tracked Topics',   value: trends.length,   color: 'text-blue-600',    bg: 'from-blue-100/60',    border: 'border-blue-200/50',    icon: <Activity size={18} className="text-blue-600"/> },
          { label: 'Emerging Signals', value: emerging.length, color: 'text-emerald-600', bg: 'from-emerald-100/60', border: 'border-emerald-200/50', icon: <Zap size={18} className="text-emerald-600"/> },
          { label: 'Active Growing',   value: growing.length,  color: 'text-indigo-600',  bg: 'from-indigo-100/60',  border: 'border-indigo-200/50',  icon: <TrendingUp size={18} className="text-indigo-600"/> },
          { label: 'Losing Traction',  value: declining.length,color: 'text-red-600',     bg: 'from-red-100/60',     border: 'border-red-200/50',     icon: <TrendingDown size={18} className="text-red-600"/> },
        ].map(s => (
          <div key={s.label} className={`glass-card rounded-2xl p-4 border ${s.border} bg-gradient-to-br ${s.bg} to-transparent`}>
            <div className="flex items-center justify-between mb-2">
              {s.icon}
              <span className={`text-3xl font-black ${s.color}`}>{loading ? '—' : s.value}</span>
            </div>
            <p className="text-xs text-brand-textMuted font-semibold">{s.label}</p>
          </div>
        ))}
      </div>

      {error && <div className="glass-card rounded-2xl p-4 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {/* ─── Main Layout: Radar + Detail ─── */}
      <div className="grid grid-cols-12 gap-6">

        {/* Radar panel */}
        <div className="col-span-12 xl:col-span-7 glass-card rounded-3xl border border-brand-border overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(194, 184, 250, 0.5) 0%, rgba(213, 206, 253, 0.5) 100%)' }}>
          <div className="p-5 border-b border-brand-border/60">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-brand-text flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                  LIVE SWEEP — {period.toUpperCase()} PERIOD
                </h2>
                <p className="text-[11px] text-brand-textMuted mt-0.5">
                  Rings: Stable → Growing → Emerging · Slices: research domains · Blips: tracked topics
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold font-mono">
                <span className="text-emerald-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>SWEEP ACTIVE</span>
                <span className="text-brand-textMuted/40">|</span>
                <span className="text-red-600 flex items-center gap-1"><Target size={11}/>LOCK-ON</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center p-4 min-h-[520px]">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"/>
                <p className="text-xs text-brand-textMuted font-mono">SCANNING SPECTRUM…</p>
              </div>
            ) : (
              <svg ref={radarSvgRef} className="w-full max-w-[560px]" style={{ aspectRatio:'1/1' }}/>
            )}
          </div>

          {/* Sector Legend */}
          <div className="px-5 pb-5">
            <div className="grid grid-cols-4 gap-1.5">
              {SECTORS.map(s => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }}/>
                  <span className="text-[9px] font-bold text-brand-textMuted truncate">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Target Detail + Top Signals */}
        <div className="col-span-12 xl:col-span-5 flex flex-col gap-5">

          {/* Target Lock Panel */}
          {selectedTrend ? (
            <div className="glass-card rounded-3xl border border-red-500/25 bg-gradient-to-br from-red-100/40 to-transparent overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-red-500/20 bg-red-500/10">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-red-600"/>
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.15em] font-mono">Target Acquired</span>
                </div>
                <StatusBadge status={selectedTrend.status}/>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-base font-black text-brand-text leading-tight">{selectedTrend.topicName}</h3>
                  <p className="text-[11px] text-brand-textMuted mt-0.5">
                    {classifyTopic(selectedTrend.topicName).name} domain
                  </p>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Publications', value: selectedTrend.publicationCount, sub: `prev: ${selectedTrend.previousCount || 0}`, color: 'text-brand-text' },
                    { label: 'Growth Rate',  value: `${selectedTrend.growthPercent >= 0 ? '+' : ''}${(selectedTrend.growthPercent||0).toFixed(0)}%`, sub: `score: ${(selectedTrend.trendScore||0).toFixed(1)}`, color: selectedTrend.growthPercent >= 0 ? 'text-emerald-600' : 'text-red-600' },
                  ].map(m => (
                    <div key={m.label} className="bg-brand-bg/50 rounded-xl p-3 border border-brand-border/50">
                      <p className="text-[10px] text-brand-textMuted font-medium mb-1">{m.label}</p>
                      <p className={`text-xl font-black ${m.color}`}>{m.value}</p>
                      <p className="text-[9px] text-brand-textMuted mt-0.5">{m.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Citation bar */}
                <div className="bg-brand-bg/50 rounded-xl p-3 border border-brand-border/50">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] text-brand-textMuted font-medium">Citation Impact</p>
                    <p className="text-xs font-bold text-blue-600">{(selectedTrend.totalCitations||0).toLocaleString()}</p>
                  </div>
                  <div className="h-1.5 bg-brand-border/40 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, ((selectedTrend.totalCitations||0) / maxCitations) * 100)}%` }}/>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-[9px] text-brand-textMuted">0</p>
                    <p className="text-[9px] text-brand-textMuted">{maxCitations.toLocaleString()}</p>
                  </div>
                </div>

                {/* Sparkline */}
                <div className="flex items-center justify-between bg-brand-bg/30 rounded-xl p-3 border border-brand-border/40">
                  <div>
                    <p className="text-[10px] text-brand-textMuted font-medium">Trajectory</p>
                    <p className="text-[9px] text-brand-textMuted mt-0.5">Publication trend</p>
                  </div>
                  <MiniSparkline
                    count={selectedTrend.publicationCount}
                    prevCount={selectedTrend.previousCount || 0}
                    color={selectedTrend.growthPercent >= 0 ? '#059669' : '#dc2626'}
                  />
                </div>

                <button
                  onClick={() => navigate(`/search?q=${encodeURIComponent(selectedTrend.topicName)}`)}
                  className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/80 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer hover:scale-[1.01] tracking-wide">
                  SEARCH LITERATURE →
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-3xl border border-brand-border p-8 flex flex-col items-center justify-center text-center">
              <Target size={32} className="text-brand-border mb-3 animate-pulse"/>
              <p className="text-sm font-bold text-brand-text">No Target Selected</p>
              <p className="text-xs text-brand-textMuted mt-1">Click any blip on the radar to lock on</p>
            </div>
          )}

          {/* Top Emerging Signals mini list */}
          {emerging.length > 0 && (
            <div className="glass-card rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-100/40 to-transparent p-5">
              <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Zap size={12}/>EMERGING HORIZON
              </h3>
              <div className="space-y-2">
                {emerging.slice(0,4).map(t => (
                  <button key={t._id} onClick={() => setSelectedTrend(t)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${selectedTrend?._id === t._id ? 'border-emerald-500/40 bg-emerald-500/15' : 'border-brand-border/60 hover:border-emerald-500/30 bg-brand-bg/30'}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse"/>
                      <span className="text-xs font-bold text-brand-text truncate">{t.topicName}</span>
                    </div>
                    <span className="text-emerald-600 text-[10px] font-black shrink-0 ml-2">
                      +{(t.growthPercent||0).toFixed(0)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Topic Sweep Log (bottom grid) ─── */}
      <div>
        <h2 className="text-base font-bold text-brand-text mb-4 flex items-center gap-2">
          <Radio className="text-brand-primary" size={18}/>
          Signal Intelligence Log
          <span className="text-xs text-brand-textMuted font-normal">({trends.length} topics tracked)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading
            ? Array(6).fill(0).map((_,i) => (
                <div key={i} className="glass-card rounded-2xl p-5 border border-brand-border h-36 animate-pulse bg-brand-border/20"/>
              ))
            : trends.slice(0,50).map((t) => {
                const sec = classifyTopic(t.topicName);
                const pctCitations = Math.min(100, ((t.totalCitations||0)/maxCitations)*100);
                const pctPapers    = Math.min(100, ((t.publicationCount||0)/maxPapers)*100);
                return (
                  <button
                    key={t._id}
                    onClick={() => setSelectedTrend(t)}
                    className={`glass-card rounded-2xl p-4 border text-left transition-all cursor-pointer group hover:scale-[1.01] ${
                      selectedTrend?._id === t._id
                        ? 'border-brand-primary shadow-lg bg-brand-primary/5'
                        : 'border-brand-border hover:border-brand-primary/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: sec.color }}/>
                        <p className="text-sm font-bold text-brand-text group-hover:text-brand-accent transition-colors truncate" title={t.topicName}>
                          {t.topicName}
                        </p>
                      </div>
                      <StatusBadge status={t.status}/>
                    </div>

                    <div className="space-y-2">
                      {/* Papers bar */}
                      <div>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-brand-textMuted">Papers</span>
                          <span className="text-brand-text font-bold">{t.publicationCount}</span>
                        </div>
                        <div className="h-1 bg-brand-border/40 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width:`${pctPapers}%`, backgroundColor: sec.color, opacity: 0.7 }}/>
                        </div>
                      </div>

                      {/* Citation bar */}
                      <div>
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-brand-textMuted">Citations</span>
                          <span className="text-blue-600 font-bold">{(t.totalCitations||0).toLocaleString()}</span>
                        </div>
                        <div className="h-1 bg-brand-border/40 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-blue-400 transition-all duration-500"
                            style={{ width:`${pctCitations}%` }}/>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-brand-border/40">
                      <span className="text-[10px] text-brand-textMuted font-mono">{sec.name}</span>
                      <span className={`text-xs font-black ${t.growthPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.growthPercent >= 0 ? '+' : ''}{(t.growthPercent||0).toFixed(0)}%
                      </span>
                    </div>
                  </button>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}
