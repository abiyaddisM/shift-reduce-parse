"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Edge,
    Node,
    Position,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useParserStore } from '@/store/parser-store';
import { CanonicalState, LR0Item } from '@/lib/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Helper to layout graph (simple implementation or use dagre)
// For simplicity, we'll try a basic layout or let user drag.
// Ideally usage of 'dagre' or 'elkjs' for auto layout.
// Since we don't have dagre installed, we will do a naive layered layout based on state ID or just random positions to start,
// but since states are generated BFS, State ID roughly corresponds to depth.
// We can arrange them in a grid.

const LAYOUT_WIDTH = 250;
const LAYOUT_HEIGHT = 150;
const COLS = 4;

const getNodePosition = (index: number) => {
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    return { x: col * LAYOUT_WIDTH, y: row * LAYOUT_HEIGHT };
};

export function VisualizationGraph() {
    const { canonicalCollection } = useParserStore();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const [selectedState, setSelectedState] = useState<CanonicalState | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        if (!canonicalCollection) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const newNodes: Node[] = canonicalCollection.states.map((state) => ({
            id: state.id.toString(),
            position: getNodePosition(state.id),
            data: { label: `State ${state.id}`, stateData: state },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            style: {
                background: '#fff',
                border: '1px solid #777',
                borderRadius: '8px',
                width: 100,
                textAlign: 'center',
                fontWeight: 'bold'
            }
        }));

        const newEdges: Edge[] = [];
        canonicalCollection.states.forEach((state) => {
            Object.entries(state.transitions).forEach(([symbol, targetId]) => {
                newEdges.push({
                    id: `e${state.id}-${symbol}-${targetId}`,
                    source: state.id.toString(),
                    target: targetId.toString(),
                    label: symbol,
                    type: 'smoothstep',
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                    },
                    style: { strokeWidth: 2 }
                });
            });
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }, [canonicalCollection, setNodes, setEdges]);

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        const state = node.data.stateData as CanonicalState;
        setSelectedState(state);
        setIsDialogOpen(true);
    }, []);

    return (
        <Card className="h-[600px] flex flex-col">
            <CardHeader>
                <CardTitle>LR(0) Canonical Collection</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 basis-0">
                <div className="h-full w-full border rounded-md bg-slate-50">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={onNodeClick}
                        fitView
                    >
                        <Controls />
                        <MiniMap />
                        <Background gap={12} size={1} />
                    </ReactFlow>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>State {selectedState?.id}</DialogTitle>
                            <DialogDescription>
                                Items in this state.
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                            {selectedState?.items.map((item, idx) => (
                                <div key={idx} className="mb-2 font-mono text-sm border-b pb-1 last:border-0">
                                    <span className="text-muted-foreground mr-2">{item.production.lhs} &rarr;</span>
                                    {item.production.rhs.map((sym, i) => (
                                        <React.Fragment key={i}>
                                            {i === item.dotPosition && <span className="font-bold text-red-500 text-lg">·</span>}
                                            <span className="mx-1">{sym}</span>
                                        </React.Fragment>
                                    ))}
                                    {item.dotPosition === item.production.rhs.length && <span className="font-bold text-red-500 text-lg">·</span>}
                                </div>
                            ))}
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
