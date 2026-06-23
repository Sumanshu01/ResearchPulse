import React, { useState, useEffect, useCallback, useRef } from 'react';
import { analyticsAPI } from '../services/api.js';
import { useNavigate } from 'react-router-dom';
import { Hash, Layers, TrendingUp, Zap, BookOpen, Network, BarChart3 } from 'lucide-react';
import * as d3 from 'd3';

const CLUSTER_COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#84cc16'];

// Predefined academic research topic interconnections
const RELATIONSHIPS = [
  { source: 'AI & Machine Learning', target: 'Data & Knowledge', weight: 3 },
  { source: 'AI & Machine Learning', target: 'Emerging AI Protocols', weight: 4 },
  { source: 'AI & Machine Learning', target: 'Robotics & Automation', weight: 3 },
  { source: 'AI & Machine Learning', target: 'Quantum & Physics', weight: 2 },
  { source: 'AI & Machine Learning', target: 'Biomedical & Health', weight: 2 },
  { source: 'Data & Knowledge', target: 'Security & Privacy', weight: 2 },
  { source: 'Data & Knowledge', target: 'Climate & Environment', weight: 1 },
  { source: 'Emerging AI Protocols', target: 'Security & Privacy', weight: 3 },
  { source: 'Security & Privacy', target: 'Quantum & Physics', weight: 3 },
  { source: 'Robotics & Automation', target: 'Quantum & Physics', weight: 1 },
  { source: 'Robotics & Automation', target: 'Security & Privacy', weight: 2 },
  { source: 'Climate & Environment', target: 'Biomedical & Health', weight: 1 },
];

export default function TopicExplorer() {
  const [clusters, setClusters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('network'); // 'network' or 'galaxy'
  const navigate = useNavigate();
  const svgRef = useRef(null);
  const galaxySvgRef = useRef(null);

  const fetchClusters = useCallback(() => {
    setLoading(true);
    setError(null);
    analyticsAPI.getTopicClusters()
      .then(d => {
        const list = d?.clusters || [];
        setClusters(list);
        if (list.length) {
          setSelected(list[0]);
        } else {
          setSelected(null);
        }
      })
      .catch(err => {
        console.error('Failed to load topic clusters:', err);
        setError(err?.message || 'Failed to load topic clusters. Please check if the backend is running.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchClusters();
  }, [fetchClusters]);

  // Handle D3 Force-Directed Network Graph Initialization
  useEffect(() => {
    if (viewMode !== 'network' || !clusters.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // clear canvas

    const width = svgRef.current.clientWidth || 800;
    const height = 360;
    svg.attr("viewBox", `0 0 ${width} ${height}`)
       .attr("width", "100%")
       .attr("height", height);

    // Build D3 Nodes representing topic clusters
    const nodes = clusters.map((c, i) => ({
      ...c,
      id: c.clusterName,
      color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
      radius: Math.max(12, Math.min(30, 12 + (c.paperCount || 0) * 1.5))
    }));

    // Build D3 Links from predefined relationships
    const links = RELATIONSHIPS.filter(r => 
      nodes.some(n => n.id === r.source) && nodes.some(n => n.id === r.target)
    ).map(r => ({
      source: r.source,
      target: r.target,
      weight: r.weight
    }));

    // Define force simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(140))
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => d.radius + 20));

    // Render path lines (edges)
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#374151")
      .attr("stroke-opacity", 0.3)
      .attr("stroke-width", d => d.weight * 1.5)
      .style("transition", "stroke 0.2s, stroke-opacity 0.2s");

    // Render node container groups
    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    // Outer glow for emerging clusters
    node.filter(d => d.isEmerging)
      .append("circle")
      .attr("r", d => d.radius + 6)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .style("filter", "drop-shadow(0px 0px 4px rgba(16, 185, 129, 0.4))")
      .attr("class", "emerging-glow");

    // Primary circle element representing each node
    node.append("circle")
      .attr("class", "node-circle")
      .attr("r", d => d.radius)
      .attr("fill", d => d.color)
      .attr("opacity", 0.85)
      .attr("stroke", d => selected?.clusterName === d.clusterName ? "#120E3D" : "rgba(18,14,61,0.15)")
      .attr("stroke-width", d => selected?.clusterName === d.clusterName ? 3.5 : 1.5)
      .style("transition", "stroke 0.25s, stroke-width 0.25s, opacity 0.2s")
      .on("click", (event, d) => {
        setSelected(d);
      })
      .on("mouseover", handleMouseOver)
      .on("mousemove", handleMouseMove)
      .on("mouseout", handleMouseOut);

    // Label text below circles
    node.append("text")
      .text(d => d.clusterName)
      .attr("x", 0)
      .attr("y", d => d.radius + 15)
      .attr("text-anchor", "middle")
      .attr("fill", "#5D539F")
      .attr("font-size", "10px")
      .attr("font-weight", "600")
      .style("pointer-events", "none")
      .style("transition", "fill 0.2s");

    // Simulation tick callback
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("transform", d => {
          // Constrain coordinates to fit inside bounds
          d.x = Math.max(d.radius + 10, Math.min(width - d.radius - 10, d.x));
          d.y = Math.max(d.radius + 10, Math.min(height - d.radius - 24, d.y));
          return `translate(${d.x}, ${d.y})`;
        });
    });

    // Interactive Drag Event handlers
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    // Drag move updates target coordinates
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    // Release updates coordinates back to simulate
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Hover Highlight and Tooltip Handlers
    function handleMouseOver(event, d) {
      node.selectAll("circle.node-circle")
        .style("opacity", o => o.id === d.id || isNeighbor(d, o) ? 1 : 0.2);

      node.selectAll("text")
        .attr("fill", o => o.id === d.id || isNeighbor(d, o) ? "#120E3D" : "#5D539F");

      link
        .style("stroke-opacity", o => o.source.id === d.id || o.target.id === d.id ? 0.8 : 0.05)
        .attr("stroke", o => o.source.id === d.id || o.target.id === d.id ? d.color : "#ABA2EB");

      const tooltip = d3.select("#network-tooltip");
      tooltip
        .style("opacity", 1)
        .html(`
          <div class="space-y-1.5">
            <p class="font-bold text-brand-text text-xs">${d.clusterName}</p>
            <p class="text-brand-textMuted text-[10px]">${d.paperCount} papers · ${d.totalCitations?.toLocaleString()} citations</p>
            <div class="flex flex-wrap gap-1 mt-1">
              ${d.topics.slice(0, 3).map(t => `<span class="px-1.5 py-0.5 bg-brand-border text-brand-textMuted rounded text-[9px]">#${t}</span>`).join('')}
            </div>
            ${d.isEmerging ? '<span class="text-emerald-600 font-bold text-[9px] mt-1.5 block">⚡ Emerging cluster</span>' : ''}
          </div>
        `);
    }

    function handleMouseMove(event) {
      d3.select("#network-tooltip")
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 12}px`);
    }

    function handleMouseOut() {
      node.selectAll("circle.node-circle")
        .style("opacity", 0.85);

      node.selectAll("text")
        .attr("fill", "#5D539F");

      link
        .style("stroke-opacity", 0.3)
        .attr("stroke", "#ABA2EB");

      d3.select("#network-tooltip").style("opacity", 0);
    }

    function isNeighbor(a, b) {
      return links.some(l => 
        (l.source.id === a.id && l.target.id === b.id) || 
        (l.source.id === b.id && l.target.id === a.id)
      );
    }

    return () => simulation.stop();
  }, [viewMode, clusters]);

  // Handle D3 Concept Galaxy Map Initialization
  useEffect(() => {
    if (viewMode !== 'galaxy' || !clusters.length || !galaxySvgRef.current) return;

    const svg = d3.select(galaxySvgRef.current);
    svg.selectAll("*").remove(); // clear canvas

    const width = galaxySvgRef.current.clientWidth || 800;
    const height = 450;
    svg.attr("viewBox", `0 0 ${width} ${height}`)
       .attr("width", "100%")
       .attr("height", height);

    // Setup coordinates scale based on actual ranges
    const maxTrend = d3.max(clusters, d => d.trendScore) || 10;
    const maxLogCitations = d3.max(clusters, d => Math.log1p(d.totalCitations || 0)) || 5;

    // margins
    const margin = { top: 40, right: 60, bottom: 60, left: 80 };

    const xScale = d3.scaleLinear()
      .domain([0, maxTrend * 1.15])
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([0, maxLogCitations * 1.2])
      .range([height - margin.bottom, margin.top]);

    // Gridlines container
    const gridG = svg.append("g").attr("class", "gridlines");

    // Y Gridlines (horizontal)
    const yTicks = yScale.ticks(6);
    yTicks.forEach(t => {
      gridG.append("line")
        .attr("x1", margin.left)
        .attr("y1", yScale(t))
        .attr("x2", width - margin.right)
        .attr("y2", yScale(t))
        .attr("stroke", "#ABA2EB")
        .attr("stroke-opacity", 0.5)
        .attr("stroke-dasharray", "3,3");
    });

    // X Gridlines (vertical)
    const xTicks = xScale.ticks(8);
    xTicks.forEach(t => {
      gridG.append("line")
        .attr("x1", xScale(t))
        .attr("y1", margin.top)
        .attr("x2", xScale(t))
        .attr("y2", height - margin.bottom)
        .attr("stroke", "#ABA2EB")
        .attr("stroke-opacity", 0.5)
        .attr("stroke-dasharray", "3,3");
    });

    // Draw Axes Lines
    const axesG = svg.append("g").attr("class", "axes");

    // X-Axis line
    axesG.append("line")
      .attr("x1", margin.left - 10)
      .attr("y1", height - margin.bottom)
      .attr("x2", width - margin.right + 10)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "#ABA2EB")
      .attr("stroke-width", 1.5);

    // Y-Axis line
    axesG.append("line")
      .attr("x1", margin.left)
      .attr("y1", margin.top - 10)
      .attr("x2", margin.left)
      .attr("y2", height - margin.bottom + 10)
      .attr("stroke", "#ABA2EB")
      .attr("stroke-width", 1.5);

    // Axis tick numbers
    xTicks.forEach(t => {
      axesG.append("text")
        .text(t.toFixed(0))
        .attr("x", xScale(t))
        .attr("y", height - margin.bottom + 20)
        .attr("text-anchor", "middle")
        .attr("fill", "#5D539F")
        .attr("font-size", "9px")
        .attr("font-family", "sans-serif");
    });

    yTicks.forEach(t => {
      const citationEquivalent = Math.round(Math.expm1(t));
      axesG.append("text")
        .text(citationEquivalent.toLocaleString())
        .attr("x", margin.left - 12)
        .attr("y", yScale(t) + 3)
        .attr("text-anchor", "end")
        .attr("fill", "#5D539F")
        .attr("font-size", "9px")
        .attr("font-family", "sans-serif");
    });

    // X-Axis Title
    axesG.append("text")
      .text("Research Velocity (Trend Score) →")
      .attr("x", width - margin.right)
      .attr("y", height - margin.bottom + 38)
      .attr("text-anchor", "end")
      .attr("fill", "#5D539F")
      .attr("font-size", "11px")
      .attr("font-weight", "600");

    // Y-Axis Title
    axesG.append("text")
      .text("Intellectual Impact (Citations) →")
      .attr("x", margin.left)
      .attr("y", margin.top - 20)
      .attr("text-anchor", "start")
      .attr("fill", "#5D539F")
      .attr("font-size", "11px")
      .attr("font-weight", "600");

    // Define gradients for halos in <defs>
    const defs = svg.append("defs");

    // Drop shadow filter for active cores
    const filter = defs.append("filter")
      .attr("id", "core-shadow")
      .attr("x", "-30%")
      .attr("y", "-30%")
      .attr("width", "160%")
      .attr("height", "160%");
    filter.append("feGaussianBlur")
      .attr("stdDeviation", 6)
      .attr("result", "blur");
    filter.append("feComposite")
      .attr("in", "SourceGraphic")
      .attr("in2", "blur")
      .attr("operator", "over");

    // Construct Galaxy nodes (cluster cores and topic stars)
    const nodes = [];
    const links = [];

    clusters.forEach((c, i) => {
      const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
      const targetX = xScale(c.trendScore || 0);
      const targetY = yScale(Math.log1p(c.totalCitations || 0));
      const coreId = c.clusterName;

      // Define gradient for this cluster
      const grad = defs.append("radialGradient")
        .attr("id", `halo-grad-${i}`)
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", color).attr("stop-opacity", 0.35);
      grad.append("stop").attr("offset", "55%").attr("stop-color", color).attr("stop-opacity", 0.1);
      grad.append("stop").attr("offset", "100%").attr("stop-color", color).attr("stop-opacity", 0);

      // Core Node
      const coreNode = {
        isCluster: true,
        id: coreId,
        x: targetX,
        y: targetY,
        fx: targetX, // Pin core to coordinates!
        fy: targetY,
        radius: Math.max(16, Math.min(30, 16 + (c.paperCount || 0) * 0.8)),
        haloRadius: Math.max(50, Math.min(130, 50 + (c.paperCount || 0) * 2.2)),
        color,
        clusterName: c.clusterName,
        data: c,
        indexInList: i
      };
      nodes.push(coreNode);

      // Orbital Topic Nodes (up to 4 topics per cluster to avoid clutter)
      const topicsList = (c.topics || []).slice(0, 4);
      topicsList.forEach((topicName, j) => {
        const topicId = `${coreId}__${topicName}`;
        const angle = (j * 2 * Math.PI) / topicsList.length;
        const initialOrbitDist = coreNode.radius + 35;
        
        const topicNode = {
          isCluster: false,
          id: topicId,
          label: topicName,
          clusterName: c.clusterName,
          x: targetX + initialOrbitDist * Math.cos(angle),
          y: targetY + initialOrbitDist * Math.sin(angle),
          radius: 5,
          color,
          parentCore: coreNode
        };
        nodes.push(topicNode);

        // Link topic to core
        links.push({
          source: coreId,
          target: topicId,
          distance: coreNode.radius + 40
        });
      });
    });

    // Run force simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.distance).strength(0.85))
      .force("charge", d3.forceManyBody().strength(d => d.isCluster ? -150 : -45))
      .force("collision", d3.forceCollide().radius(d => d.radius + (d.isCluster ? 22 : 12)).strength(0.95))
      .force("x", d3.forceX(d => d.isCluster ? d.fx : d.parentCore.x).strength(d => d.isCluster ? 1.0 : 0.05))
      .force("y", d3.forceY(d => d.isCluster ? d.fy : d.parentCore.y).strength(d => d.isCluster ? 1.0 : 0.05))
      .alphaDecay(0.04);

    // Draw Halos (background density clouds)
    const halo = svg.append("g")
      .attr("class", "halos")
      .selectAll("circle")
      .data(nodes.filter(n => n.isCluster))
      .enter().append("circle")
      .attr("r", d => d.haloRadius)
      .attr("fill", d => `url(#halo-grad-${d.indexInList})`)
      .style("pointer-events", "none")
      .style("transition", "opacity 0.25s");

    // Draw Link lines
    const link = svg.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#ABA2EB")
      .attr("stroke-opacity", 0.35)
      .attr("stroke-width", 0.75)
      .attr("stroke-dasharray", "2,3")
      .style("transition", "stroke-opacity 0.25s");

    // Draw Nodes Container Groups
    const nodeG = svg.append("g").attr("class", "nodes");

    const node = nodeG.selectAll("g")
      .data(nodes)
      .enter().append("g")
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
      );

    // Outer glow ring for emerging cluster cores
    node.filter(d => d.isCluster && d.data.isEmerging)
      .append("circle")
      .attr("r", d => d.radius + 6)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-opacity", 0.45)
      .attr("stroke-width", 1.5)
      .style("filter", "drop-shadow(0px 0px 4px rgba(16, 185, 129, 0.4))")
      .attr("class", "emerging-glow-ring");

    // Primary Core Circle or Topic Star Dot
    node.append("circle")
      .attr("class", d => d.isCluster ? "core-circle" : "topic-circle")
      .attr("r", d => d.radius)
      .attr("fill", d => d.isCluster ? d.color : "#E6E3FC")
      .attr("fill-opacity", d => d.isCluster ? 0.9 : 1.0)
      .attr("stroke", d => d.isCluster 
        ? (selected?.clusterName === d.clusterName ? "#120E3D" : "rgba(18,14,61,0.25)")
        : d.color
      )
      .attr("stroke-width", d => d.isCluster 
        ? (selected?.clusterName === d.clusterName ? 4 : 2)
        : 2
      )
      .style("transition", "stroke 0.25s, stroke-width 0.25s, fill-opacity 0.25s")
      .on("click", (event, d) => {
        if (d.isCluster) {
          setSelected(d.data);
        } else {
          // Navigate to search
          navigate(`/search?q=${encodeURIComponent(d.label)}`);
        }
      })
      .on("mouseover", handleMouseOver)
      .on("mousemove", handleMouseMove)
      .on("mouseout", handleMouseOut);

    // Draw Core Labels and Topic Labels
    const labelsG = svg.append("g").attr("class", "labels");

    const label = labelsG.selectAll("g")
      .data(nodes)
      .enter().append("g")
      .style("pointer-events", "none");

    // Core Label Texts (bold, slightly above the node)
    label.filter(d => d.isCluster)
      .append("text")
      .text(d => d.clusterName)
      .attr("text-anchor", "middle")
      .attr("fill", "#120E3D")
      .attr("font-size", "10px")
      .attr("font-weight", "700")
      .attr("dy", d => -d.radius - 8)
      .style("transition", "fill 0.25s");

    // Topic Label Texts (medium, below the node)
    label.filter(d => !d.isCluster)
      .append("text")
      .text(d => d.label)
      .attr("text-anchor", "middle")
      .attr("fill", "#5D539F")
      .attr("font-size", "8.5px")
      .attr("font-weight", "500")
      .attr("dy", 12)
      .style("transition", "fill 0.25s");

    // Simulation Tick Listener
    simulation.on("tick", () => {
      // Keep nodes constrained to map boundary
      nodes.forEach(n => {
        if (n.isCluster) {
          n.x = Math.max(margin.left + n.radius + 10, Math.min(width - margin.right - n.radius - 10, n.x));
          n.y = Math.max(margin.top + n.radius + 10, Math.min(height - margin.bottom - n.radius - 10, n.y));
        } else {
          // Constrain topics within their parent's general bounding circle of 100px to prevent escaping
          const dx = n.x - n.parentCore.x;
          const dy = n.y - n.parentCore.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 100;
          if (dist > maxDist) {
            n.x = n.parentCore.x + (dx / dist) * maxDist;
            n.y = n.parentCore.y + (dy / dist) * maxDist;
          }
          n.x = Math.max(margin.left + n.radius + 5, Math.min(width - margin.right - n.radius - 5, n.x));
          n.y = Math.max(margin.top + n.radius + 5, Math.min(height - margin.bottom - n.radius - 5, n.y));
        }
      });

      // Update positions of links
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      // Update positions of node circles
      node
        .attr("transform", d => `translate(${d.x}, ${d.y})`);

      // Update positions of text labels
      label
        .attr("transform", d => `translate(${d.x}, ${d.y})`);
    });

    // Drag handlers
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.2).restart();
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      if (d.isCluster) {
        // Snap back to coordinate axis position!
        d.fx = xScale(d.data.trendScore || 0);
        d.fy = yScale(Math.log1p(d.data.totalCitations || 0));
      } else {
        d.fx = null;
        d.fy = null;
      }
    }

    // Hover Highlight triggers
    function handleMouseOver(event, d) {
      const activeClusterName = d.clusterName;

      // Dim unrelated nodes and labels
      node.selectAll("circle.core-circle")
        .style("opacity", o => o.clusterName === activeClusterName ? 1.0 : 0.15);

      node.selectAll("circle.topic-circle")
        .style("opacity", o => o.clusterName === activeClusterName ? 1.0 : 0.15)
        .attr("stroke-width", o => o.id === d.id ? 3.5 : 2)
        .style("fill-opacity", o => o.id === d.id ? 0.3 : 1.0);

      label.selectAll("text")
        .attr("fill", o => o.clusterName === activeClusterName 
          ? (o.isCluster ? "#120E3D" : (o.id === d.id ? "#5850EC" : "#5D539F"))
          : "#ABA2EB"
        )
        .attr("font-size", o => o.id === d.id ? "10px" : (o.isCluster ? "10px" : "8.5px"));

      link
        .style("stroke-opacity", o => o.source.clusterName === activeClusterName ? 0.75 : 0.05)
        .attr("stroke", o => o.source.clusterName === activeClusterName ? d.color : "#ABA2EB");

      halo
        .style("opacity", o => o.clusterName === activeClusterName ? 1.2 : 0.1);

      // Tooltip positioning
      const tooltip = d3.select("#network-tooltip");
      tooltip
        .style("opacity", 1);

      if (d.isCluster) {
        tooltip.html(`
          <div class="space-y-1.5">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${d.color}"></span>
              <p class="font-bold text-brand-text text-xs">${d.clusterName}</p>
            </div>
            <p class="text-brand-textMuted text-[10px]">${d.data.paperCount} papers · ${d.data.totalCitations?.toLocaleString()} citations</p>
            <p class="text-[9.5px] text-brand-accent font-semibold">Growth Score: ${(d.data.trendScore || 0).toFixed(1)}</p>
            ${d.data.isEmerging ? '<span class="text-emerald-600 font-bold text-[9px] mt-1.5 block">⚡ Emerging cluster</span>' : ''}
          </div>
        `);
      } else {
        tooltip.html(`
          <div class="space-y-1">
            <p class="font-bold text-brand-text text-xs"># ${d.label}</p>
            <p class="text-brand-textMuted text-[10px]">Part of: ${d.clusterName}</p>
            <div class="h-[1px] bg-brand-border/40 my-1"></div>
            <p class="text-[9px] text-brand-accent font-semibold">⚡ Click to search papers</p>
          </div>
        `);
      }
    }

    function handleMouseMove(event) {
      d3.select("#network-tooltip")
        .style("left", `${event.pageX + 15}px`)
        .style("top", `${event.pageY - 15}px`);
    }

    function handleMouseOut() {
      node.selectAll("circle.core-circle").style("opacity", 0.9);
      node.selectAll("circle.topic-circle")
        .style("opacity", 1.0)
        .attr("stroke-width", 2)
        .style("fill-opacity", 1.0);

      label.selectAll("text")
        .attr("fill", o => o.isCluster ? "#120E3D" : "#5D539F")
        .attr("font-size", o => o.isCluster ? "10px" : "8.5px");

      link
        .style("stroke-opacity", 0.25)
        .attr("stroke", "#ABA2EB");

      halo
        .style("opacity", 1.0);

      d3.select("#network-tooltip").style("opacity", 0);
    }

    return () => simulation.stop();
  }, [viewMode, clusters]);

  // Synchronize CSS styling of Selected Node border (both Network and Galaxy modes)
  useEffect(() => {
    if (!clusters.length) return;

    if (viewMode === 'network' && svgRef.current) {
      const svg = d3.select(svgRef.current);
      svg.selectAll("circle.node-circle")
        .transition().duration(250)
        .attr("stroke", d => selected?.clusterName === d.clusterName ? "#120E3D" : "rgba(18,14,61,0.15)")
        .attr("stroke-width", d => selected?.clusterName === d.clusterName ? 3.5 : 1.5)
        .style("filter", d => selected?.clusterName === d.clusterName ? "drop-shadow(0px 0px 8px rgba(99, 102, 241, 0.35))" : "none");
    }

    if (viewMode === 'galaxy' && galaxySvgRef.current) {
      const svg = d3.select(galaxySvgRef.current);
      svg.selectAll("circle.core-circle")
        .transition().duration(250)
        .attr("stroke", d => selected?.clusterName === d.clusterName ? "#120E3D" : "rgba(18,14,61,0.25)")
        .attr("stroke-width", d => selected?.clusterName === d.clusterName ? 4 : 2)
        .style("filter", d => selected?.clusterName === d.clusterName ? "url(#core-shadow)" : "none");
    }
  }, [selected, clusters, viewMode]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-3">
      <div className="w-12 h-12 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-brand-textMuted text-sm">Building topic clusters…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
      <div className="text-red-700 bg-red-100 border border-red-200 p-6 rounded-2xl max-w-md">
        <p className="text-sm font-semibold">{error}</p>
      </div>
      <button
        onClick={fetchClusters}
        id="retry-clusters-btn"
        className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/80 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-brand-primary/25"
      >
        Retry Connection
      </button>
    </div>
  );

  if (clusters.length === 0) return (
    <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
      <div className="text-brand-textMuted bg-brand-bg/30 border border-brand-border p-6 rounded-2xl max-w-md">
        <p className="text-sm font-semibold text-brand-text">No topic clusters computed yet.</p>
        <p className="text-xs mt-1 text-brand-textMuted/80">The system needs some research papers indexed first. Please seed the database from the Advanced Search page.</p>
      </div>
      <button
        onClick={() => navigate('/search')}
        id="go-to-search-btn"
        className="px-6 py-2.5 bg-brand-primary hover:bg-brand-primary/80 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-brand-primary/25"
      >
        Go to Advanced Search
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Absolute floating tooltip for D3 Maps */}
      <div id="network-tooltip" className="absolute pointer-events-none bg-brand-card/95 border border-brand-border rounded-xl p-3 text-xs shadow-2xl transition-opacity duration-150 opacity-0 z-50 max-w-[220px]" />

      {/* Header and Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-text flex items-center gap-2">
            <Layers className="text-brand-primary" size={26} /> Topic Explorer
          </h1>
          <p className="text-sm text-brand-textMuted mt-1">Discover research topic clusters and their interdisciplinary connections</p>
        </div>
        <div className="flex bg-brand-bg border border-brand-border rounded-xl p-1">
          <button
            onClick={() => setViewMode('network')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'network'
                ? 'bg-brand-primary text-white shadow-md'
                : 'text-brand-textMuted hover:text-brand-text'
            }`}
          >
            <Network size={14} />
            <span>Network Landscape</span>
          </button>
          <button
            onClick={() => setViewMode('galaxy')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'galaxy'
                ? 'bg-brand-primary text-white shadow-md'
                : 'text-brand-textMuted hover:text-brand-text'
            }`}
          >
            <BarChart3 size={14} />
            <span>Concept Galaxy Map</span>
          </button>
        </div>
      </div>

      {/* Active Visualization Mode */}
      {viewMode === 'network' ? (
        <div className="glass-card rounded-3xl p-6 border border-brand-border relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-brand-text mb-0.5">Research Topic Landscape</h2>
              <p className="text-xs text-brand-textMuted">
                Nodes represent topic clusters (size = paper volume). Lines represent interdisciplinary research pathways. Drag to explore.
              </p>
            </div>
          </div>
          <div className="relative w-full border border-brand-border/60 bg-brand-bg/40 rounded-2xl overflow-hidden min-h-[360px] flex items-center justify-center">
            <svg ref={svgRef} className="w-full h-[360px]" />
            
            {/* Graph Legend */}
            <div className="absolute bottom-4 right-4 flex items-center gap-4 bg-brand-bg/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-brand-border text-[10px] text-brand-textMuted">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-emerald-500 bg-emerald-500/20" />
                <span>Emerging Cluster</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full border border-brand-border bg-brand-border/80" />
                <span>Size = Paper Volume</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* D3 Concept Galaxy Map View */
        <div className="glass-card rounded-3xl p-6 border border-brand-border relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-brand-text mb-0.5">Topic Semantic Galaxy Map</h2>
              <p className="text-xs text-brand-textMuted">
                X-Axis = Research Velocity (Growth Trend) · Y-Axis = Intellectual Impact (Citations equivalent). Halo size = publication volume. Click topic stars to search.
              </p>
            </div>
          </div>
          <div className="relative w-full border border-brand-border/60 bg-brand-bg/40 rounded-2xl overflow-hidden min-h-[450px] flex items-center justify-center">
            <svg ref={galaxySvgRef} className="w-full h-[450px]" />
            
            {/* Graph Legend */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 bg-brand-bg/80 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-brand-border text-[10px] text-brand-textMuted shadow-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-emerald-500 bg-emerald-500/20" />
                <span>Emerging Cluster</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border border-brand-primary bg-brand-primary/20" />
                <span>Cluster Core Star</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border-2 border-brand-accent bg-brand-bg" />
                <span>Subtopic Star (Click to Search)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cluster grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {clusters.map((c, i) => (
          <button key={c._id} onClick={() => setSelected(c)}
            id={`cluster-btn-${c._id}`}
            className={`glass-card rounded-2xl p-4 border text-left transition-all hover:scale-[1.02] ${selected?._id === c._id ? 'border-brand-primary shadow-lg shadow-brand-primary/20' : 'border-brand-border hover:border-brand-primary/40'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[i % CLUSTER_COLORS.length] }} />
              {c.isEmerging && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Zap size={8} />Emerging</span>}
            </div>
            <p className="text-sm font-bold text-brand-text">{c.clusterName}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-brand-textMuted">
              <span className="flex items-center gap-1"><BookOpen size={10} />{c.paperCount} papers</span>
              <span className="flex items-center gap-1"><TrendingUp size={10} />{(c.trendScore || 0).toFixed(1)}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected cluster detail */}
      {selected && (
        <div className="glass-card rounded-3xl p-6 border border-brand-primary/30 shadow-lg shadow-brand-primary/10">
          <div className="flex items-center gap-3 mb-4">
            <Layers size={20} className="text-brand-primary" />
            <h2 className="text-lg font-bold text-brand-text">{selected.clusterName}</h2>
            {selected.isEmerging && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded-full flex items-center gap-1"><Zap size={9} />Emerging</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-brand-textMuted uppercase tracking-wider mb-3">Topics in this cluster</p>
              <div className="flex flex-wrap gap-2">
                {(selected.topics || []).map(t => (
                  <button key={t} onClick={() => navigate(`/search?q=${encodeURIComponent(t)}`)}
                    id={`topic-btn-${t.replace(/\s+/g, '-').toLowerCase()}`}
                    className="flex items-center gap-1 px-3 py-1.5 bg-brand-border/40 border border-brand-border rounded-xl text-xs text-brand-textMuted hover:text-brand-text hover:border-brand-accent/40 transition-all cursor-pointer">
                    <Hash size={11} className="text-brand-accent" />{t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-brand-textMuted uppercase tracking-wider mb-3">Research Gaps Identified</p>
              <div className="space-y-2">
                {(selected.researchGaps || []).map((g, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-brand-text">
                    <span className="text-brand-accent mt-0.5 shrink-0">▸</span>{g}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

