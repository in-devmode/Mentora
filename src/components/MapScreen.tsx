import React, { useState, useMemo, useEffect } from 'react';
import { NavBar } from './NavBar';
import { ConceptStatusChip } from './StatusChip';
import { MathView } from './MathView';
import { CONCEPTS, Concept } from '../data/concepts';
import { SessionState, getConceptAttempts, ConceptStatus } from '../lib/engine';
import { ArrowRight, X, LayoutGrid, Network, Info } from 'lucide-react';

interface MapScreenProps {
  session: SessionState;
  onNavigate: (path: string) => void;
  onReset: () => void;
}

interface NodeLayout {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const NODE_LAYOUTS: Record<string, NodeLayout> = {
  squares: { id: 'squares', x: 20, y: 20, w: 185, h: 72 },
  gcf: { id: 'gcf', x: 20, y: 120, w: 185, h: 72 },
  fractions: { id: 'fractions', x: 20, y: 220, w: 185, h: 72 },
  domain: { id: 'domain', x: 20, y: 320, w: 185, h: 72 },
  'limit-notation': { id: 'limit-notation', x: 20, y: 420, w: 185, h: 72 },

  'diff-squares': { id: 'diff-squares', x: 275, y: 70, w: 185, h: 72 },
  cancel: { id: 'cancel', x: 275, y: 220, w: 185, h: 72 },
  'limit-sub': { id: 'limit-sub', x: 275, y: 420, w: 185, h: 72 },

  simplify: { id: 'simplify', x: 530, y: 200, w: 185, h: 72 },

  'limit-factor': { id: 'limit-factor', x: 785, y: 310, w: 185, h: 72 },
};

const EDGES: { from: string; to: string }[] = [
  { from: 'squares', to: 'diff-squares' },
  { from: 'gcf', to: 'diff-squares' },
  { from: 'fractions', to: 'cancel' },
  { from: 'diff-squares', to: 'simplify' },
  { from: 'cancel', to: 'simplify' },
  { from: 'domain', to: 'simplify' },
  { from: 'limit-notation', to: 'limit-sub' },
  { from: 'simplify', to: 'limit-factor' },
  { from: 'limit-sub', to: 'limit-factor' },
];

export const MapScreen: React.FC<MapScreenProps> = ({
  session,
  onNavigate,
  onReset,
}) => {
  // Mobile defaults to list view (< 640px)
  const [viewMode, setViewMode] = useState<'graph' | 'list'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 'list';
    }
    return 'graph';
  });

  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);

  // Compute downstream paths from any Likely gap to "Limits by factoring"
  const { hasGaps, highlightedNodeIds, highlightedEdgeIds } = useMemo(() => {
    const gapConceptIds = Object.keys(session.concepts).filter(
      (cId) => session.concepts[cId]?.status === 'likely_gap'
    );

    if (gapConceptIds.length === 0) {
      return {
        hasGaps: false,
        highlightedNodeIds: new Set<string>(),
        highlightedEdgeIds: new Set<string>(),
      };
    }

    const highNodes = new Set<string>();
    const highEdges = new Set<string>();

    // Forward map: parent -> children
    const childrenMap: Record<string, string[]> = {};
    for (const edge of EDGES) {
      if (!childrenMap[edge.from]) childrenMap[edge.from] = [];
      childrenMap[edge.from].push(edge.to);
    }

    // DFS to find paths reaching 'limit-factor'
    function findPaths(current: string, visited: Set<string>): boolean {
      if (current === 'limit-factor') {
        visited.add(current);
        return true;
      }

      let reachesGoal = false;
      const children = childrenMap[current] || [];
      for (const next of children) {
        const nextVisited = new Set(visited);
        nextVisited.add(current);
        if (findPaths(next, nextVisited)) {
          reachesGoal = true;
          highNodes.add(current);
          highNodes.add(next);
          highEdges.add(`${current}->${next}`);
        }
      }
      return reachesGoal;
    }

    for (const gapId of gapConceptIds) {
      highNodes.add(gapId);
      findPaths(gapId, new Set());
    }

    return {
      hasGaps: true,
      highlightedNodeIds: highNodes,
      highlightedEdgeIds: highEdges,
    };
  }, [session.concepts]);

  const selectedConcept: Concept | null = selectedConceptId
    ? CONCEPTS[selectedConceptId]
    : null;

  const selectedConceptState = selectedConceptId
    ? session.concepts[selectedConceptId]
    : null;

  const conceptAttempts = useMemo(() => {
    if (!selectedConceptId) return [];
    return getConceptAttempts(session, selectedConceptId);
  }, [selectedConceptId, session]);

  // Grouped concepts for List view
  const conceptGroups = [
    {
      title: 'Foundational arithmetic & algebra',
      conceptIds: ['squares', 'gcf', 'fractions', 'domain', 'limit-notation'],
    },
    {
      title: 'Rational expressions',
      conceptIds: ['diff-squares', 'cancel', 'simplify'],
    },
    {
      title: 'Introductory limits',
      conceptIds: ['limit-sub', 'limit-factor'],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#16181D] flex flex-col justify-between selection:bg-[#E9EDF8]">
      <NavBar currentPath="/map" onNavigate={onNavigate} hasActiveSession={session.phase !== 'completed'} />

      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-8 md:py-10 w-full flex-1">
        {/* Title & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E6E1D8]">
          <div className="text-left space-y-1">
            <h1 className="font-serif text-[30px] md:text-[34px] font-medium text-[#16181D] tracking-tight">
              Knowledge Map
            </h1>
            <p className="text-[14px] text-[#4B505A] max-w-[60ch]">
              Prerequisite progression from foundational algebra to limits by factoring.
              {hasGaps && ' Paths affected by identified gaps are highlighted.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('graph')}
              className={`h-[36px] px-3.5 rounded-[6px] border text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'graph'
                  ? 'bg-[#16181D] text-white border-[#16181D]'
                  : 'bg-white text-[#4B505A] border-[#E6E1D8] hover:text-[#16181D]'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-[36px] px-3.5 rounded-[6px] border text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#16181D] text-white border-[#16181D]'
                  : 'bg-white text-[#4B505A] border-[#E6E1D8] hover:text-[#16181D]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>

        {/* Legend in words */}
        <div className="py-4 border-b border-[#E6E1D8] text-left">
          <div className="text-[12px] font-mono uppercase tracking-wider text-[#666B75] mb-2">
            Status legend
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[13px]">
            <div className="flex items-start gap-2">
              <ConceptStatusChip status="not_assessed" className="shrink-0 mt-0.5" />
              <span className="text-[#666B75]">No questions attempted yet.</span>
            </div>
            <div className="flex items-start gap-2">
              <ConceptStatusChip status="developing" className="shrink-0 mt-0.5" />
              <span className="text-[#666B75]">Attempted; one independent success.</span>
            </div>
            <div className="flex items-start gap-2">
              <ConceptStatusChip status="likely_gap" className="shrink-0 mt-0.5" />
              <span className="text-[#666B75]">Slip on diagnostic probe question.</span>
            </div>
            <div className="flex items-start gap-2">
              <ConceptStatusChip status="demonstrated" className="shrink-0 mt-0.5" />
              <span className="text-[#666B75]">2+ independent correct answers.</span>
            </div>
          </div>
        </div>

        {/* Main Content Area: Graph or List + Side Panel */}
        <div className="pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Visual: SVG or List */}
          <div className={selectedConceptId ? 'lg:col-span-8' : 'lg:col-span-12'}>
            {viewMode === 'graph' ? (
              <div className="rounded-[10px] border border-[#E6E1D8] bg-[#FFFFFF] p-4 sm:p-6 overflow-x-auto">
                <svg
                  viewBox="0 0 1000 520"
                  className="w-full h-auto min-w-[760px] select-none"
                  aria-label="Knowledge Concept Dependency Graph"
                >
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#666B75" />
                    </marker>

                    <marker
                      id="arrow-highlight"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#A23B22" />
                    </marker>

                    <marker
                      id="arrow-dimmed"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#E6E1D8" />
                    </marker>
                  </defs>

                  {/* Edges */}
                  {EDGES.map((edge) => {
                    const fromNode = NODE_LAYOUTS[edge.from];
                    const toNode = NODE_LAYOUTS[edge.to];
                    if (!fromNode || !toNode) return null;

                    const edgeId = `${edge.from}->${edge.to}`;
                    const isHighlighted = highlightedEdgeIds.has(edgeId);
                    const isDimmed = hasGaps && !isHighlighted;

                    const startX = fromNode.x + fromNode.w;
                    const startY = fromNode.y + fromNode.h / 2;
                    const endX = toNode.x;
                    const endY = toNode.y + toNode.h / 2;
                    const deltaX = endX - startX;
                    const controlX = startX + deltaX * 0.5;

                    const pathD = `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX - 3} ${endY}`;

                    return (
                      <path
                        key={edgeId}
                        d={pathD}
                        fill="none"
                        stroke={isHighlighted ? '#A23B22' : isDimmed ? '#E6E1D8' : '#666B75'}
                        strokeWidth={isHighlighted ? 2.2 : 1.5}
                        markerEnd={
                          isHighlighted
                            ? 'url(#arrow-highlight)'
                            : isDimmed
                            ? 'url(#arrow-dimmed)'
                            : 'url(#arrow)'
                        }
                        className="transition-all duration-200"
                        style={{
                          opacity: isDimmed ? 0.35 : 1,
                        }}
                      />
                    );
                  })}

                  {/* Nodes */}
                  {Object.values(NODE_LAYOUTS).map((node) => {
                    const c = CONCEPTS[node.id];
                    const cState = session.concepts[node.id];
                    if (!c) return null;

                    const isSelected = selectedConceptId === node.id;
                    const isHighlighted = highlightedNodeIds.has(node.id);
                    const isDimmed = hasGaps && !isHighlighted;
                    const isGap = cState?.status === 'likely_gap';

                    return (
                      <foreignObject
                        key={node.id}
                        x={node.x}
                        y={node.y}
                        width={node.w}
                        height={node.h}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedConceptId(node.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedConceptId(node.id);
                            }
                          }}
                          className={`w-full h-full p-2.5 rounded-[8px] border text-left flex flex-col justify-between cursor-pointer transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#27408B] ${
                            isSelected
                              ? 'border-[#27408B] bg-[#E9EDF8]/40 ring-1 ring-[#27408B]'
                              : isGap
                              ? 'border-[#A23B22] bg-[#FFFFFF]'
                              : isHighlighted
                              ? 'border-[#16181D] bg-[#FFFFFF]'
                              : 'border-[#E6E1D8] bg-[#FFFFFF] hover:border-[#16181D]'
                          }`}
                          style={{
                            opacity: isDimmed ? 0.35 : 1,
                          }}
                        >
                          <div className="text-[13px] font-medium leading-tight text-[#16181D] truncate">
                            {c.title}
                          </div>

                          <div className="pt-1">
                            <ConceptStatusChip status={cState?.status || 'not_assessed'} />
                          </div>
                        </div>
                      </foreignObject>
                    );
                  })}
                </svg>
              </div>
            ) : (
              /* Grouped List View */
              <div className="space-y-6 text-left">
                {conceptGroups.map((group) => (
                  <div
                    key={group.title}
                    className="rounded-[10px] border border-[#E6E1D8] bg-[#FFFFFF] p-5 space-y-3"
                  >
                    <div className="text-[12px] font-mono uppercase tracking-wider text-[#666B75] border-b border-[#E6E1D8] pb-2">
                      {group.title}
                    </div>

                    <div className="divide-y divide-[#E6E1D8]/60">
                      {group.conceptIds.map((cId) => {
                        const c = CONCEPTS[cId];
                        const cState = session.concepts[cId];
                        if (!c) return null;

                        const isSelected = selectedConceptId === cId;
                        const isGap = cState?.status === 'likely_gap';

                        return (
                          <div
                            key={cId}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedConceptId(cId)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setSelectedConceptId(cId);
                              }
                            }}
                            className={`py-3 px-2 flex items-center justify-between cursor-pointer transition-colors rounded-[4px] ${
                              isSelected
                                ? 'bg-[#E9EDF8]'
                                : isGap
                                ? 'bg-[#F9E4DD]/30 hover:bg-[#F9E4DD]/50'
                                : 'hover:bg-[#FAF8F4]'
                            }`}
                          >
                            <div>
                              <div className="text-[14px] font-medium text-[#16181D]">
                                {c.title}
                              </div>
                              <div className="text-[12px] text-[#666B75]">
                                {c.prerequisites.length === 0
                                  ? 'No prerequisites'
                                  : `Prerequisites: ${c.prerequisites
                                      .map((p) => CONCEPTS[p]?.title || p)
                                      .join(', ')}`}
                              </div>
                            </div>

                            <ConceptStatusChip status={cState?.status || 'not_assessed'} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side Panel for Concept Detail */}
          {selectedConcept && selectedConceptState && (
            <aside
              className="lg:col-span-4 rounded-[10px] border border-[#E6E1D8] bg-[#FFFFFF] p-6 text-left space-y-5 sticky top-24"
              role="region"
              aria-label={`Concept details: ${selectedConcept.title}`}
            >
              <div className="flex items-start justify-between border-b border-[#E6E1D8] pb-3">
                <div>
                  <div className="text-[11px] font-mono text-[#666B75] uppercase tracking-wider">
                    Concept Details
                  </div>
                  <h3 className="font-serif text-[20px] font-medium text-[#16181D]">
                    {selectedConcept.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedConceptId(null)}
                  className="p-1 rounded-[4px] text-[#666B75] hover:text-[#16181D] hover:bg-[#EEECE7] transition-colors cursor-pointer"
                  aria-label="Close details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status in words */}
              <div className="space-y-1.5">
                <div className="text-[12px] font-mono text-[#666B75] uppercase">
                  Status in words
                </div>
                <div className="flex items-center gap-3">
                  <ConceptStatusChip status={selectedConceptState.status} />
                  <span className="text-[13px] text-[#4B505A]">
                    {selectedConceptState.status === 'not_assessed' &&
                      'Not assessed in this check session yet.'}
                    {selectedConceptState.status === 'developing' &&
                      'Demonstrated on one problem; needs one more independent success.'}
                    {selectedConceptState.status === 'likely_gap' &&
                      'Possible gap indicated by an incorrect diagnostic response.'}
                    {selectedConceptState.status === 'demonstrated' &&
                      'Demonstrated independently across 2+ problems.'}
                  </span>
                </div>
              </div>

              {/* Prerequisites */}
              <div className="space-y-1.5">
                <div className="text-[12px] font-mono text-[#666B75] uppercase">
                  Prerequisites
                </div>
                <div className="text-[13px] text-[#4B505A]">
                  {selectedConcept.prerequisites.length === 0 ? (
                    <span>Foundational (no prior concepts required).</span>
                  ) : (
                    <ul className="list-disc list-inside space-y-1">
                      {selectedConcept.prerequisites.map((prereqId) => (
                        <li key={prereqId}>
                          <button
                            type="button"
                            onClick={() => setSelectedConceptId(prereqId)}
                            className="text-[#27408B] hover:underline cursor-pointer"
                          >
                            {CONCEPTS[prereqId]?.title || prereqId}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Attempts behind it (from events) */}
              <div className="space-y-1.5">
                <div className="text-[12px] font-mono text-[#666B75] uppercase">
                  Attempts behind this status
                </div>
                {conceptAttempts.length === 0 ? (
                  <p className="text-[13px] text-[#666B75] italic">
                    No questions attempted for this concept yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 text-[13px]">
                    {conceptAttempts.map(({ event, question }) => (
                      <div
                        key={event.id}
                        className="p-2 rounded-[6px] border border-[#E6E1D8] bg-[#FAF8F4] space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#666B75]">
                          <span>{question.id}</span>
                          <span
                            className={
                              event.correct ? 'text-[#1F6B47]' : 'text-[#A23B22]'
                            }
                          >
                            {event.correct ? 'Correct' : 'Not yet'}
                          </span>
                        </div>
                        <div className="text-[12px] text-[#16181D]">
                          Answer: <span className="font-mono">{event.answer}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommended next step */}
              <div className="space-y-1.5 pt-2 border-t border-[#E6E1D8]">
                <div className="text-[12px] font-mono text-[#666B75] uppercase">
                  Recommended next step
                </div>
                <p className="text-[13px] text-[#16181D] leading-relaxed">
                  {selectedConceptState.status === 'likely_gap' &&
                    `Focus on ${selectedConcept.title}. Review the focused lesson rule and complete a guided practice problem.`}
                  {selectedConceptState.status === 'developing' &&
                    'Developing — one more independent success is needed to call it demonstrated.'}
                  {selectedConceptState.status === 'demonstrated' &&
                    'Prerequisite demonstrated. You are ready to advance to downstream concepts.'}
                  {selectedConceptState.status === 'not_assessed' &&
                    'Complete a learning check to diagnose understanding of this concept.'}
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('/check')}
                    className="h-[36px] px-4 rounded-[6px] bg-[#16181D] text-white text-[13px] font-medium hover:bg-[#2C313A] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Go to Check</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E6E1D8] py-6 text-[13px] text-[#666B75]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="max-w-[65ch] text-left">
            Prototype for algebra and introductory limits. Mentora tests hypotheses and can be wrong; it doesn't replace a teacher.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="text-[#666B75] hover:text-[#16181D] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Back to overview
            </button>
            <span className="text-[#E6E1D8]">·</span>
            <button
              type="button"
              onClick={onReset}
              className="text-[#666B75] hover:text-[#16181D] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Start over
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
