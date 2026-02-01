"use client";

import * as React from "react";
import { useParserStore } from "@/store/parser-store";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
    Play,
    Pause,
    SkipForward,
    SkipBack,
    RotateCcw
} from "lucide-react";
import { ParsingAction } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

function formatAction(action: ParsingAction | null): string {
    if (!action) return "Start";
    switch (action.type) {
        case 'SHIFT': return `Shift to State ${action.payload}`;
        case 'REDUCE': return `Reduce by Prod ${action.payload}`;
        case 'ACCEPT': return `Accept!`;
        case 'ERROR': return `Syntax Error`;
        default: return '';
    }
}

export function SimulationDeck() {
    const {
        simulationSteps,
        currentStepIndex,
        stepForward,
        stepBackward,
        resetSimulation,
        isPlaying,
        togglePlay,
        playbackSpeed,
        setPlaybackSpeed,
        grammar,
        parsingTable
    } = useParserStore();

    const currentStep = simulationSteps[currentStepIndex];

    // Auto-play effect
    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                // If we are at the end, stop playing
                const current = useParserStore.getState().currentStepIndex;
                const total = useParserStore.getState().simulationSteps.length;
                const currentAction = useParserStore.getState().simulationSteps[current]?.actionTaken;

                // If the LAST step was accept or error, stop. 
                // But stepForward creates a NEXT step. 
                // We stop if the CURRENT state is terminal (Accept/Error already taken).

                if (currentAction?.type === 'ACCEPT' || currentAction?.type === 'ERROR') {
                    useParserStore.getState().togglePlay();
                    return;
                }

                stepForward();
            }, playbackSpeed);
        }
        return () => clearInterval(interval);
    }, [isPlaying, playbackSpeed, stepForward]);

    React.useEffect(() => {
        // Scroll log to bottom
        const logContainer = document.getElementById('action-log');
        if (logContainer) {
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }, [currentStepIndex]);


    if (!currentStep) {
        return (
            <Card className="h-full flex items-center justify-center text-muted-foreground">
                No simulation active. Load a grammar and input to start.
            </Card>
        );
    }

    // Combine stack and symbol stack for visualization
    // Stack: [0, 5, 2]
    // SymStack: [$, id, E]
    // We want to show pairs. Base is (0, $)
    const stackItems = currentStep.stack.map((stateId, idx) => ({
        stateId,
        symbol: currentStep.symbolStack[idx]
    }));

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Controls */}
            <Card>
                <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="icon" onClick={resetSimulation}>
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={stepBackward} disabled={currentStepIndex <= 0}>
                            <SkipBack className="h-4 w-4" />
                        </Button>
                        <Button variant={isPlaying ? "destructive" : "default"} size="icon" onClick={togglePlay}>
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={stepForward}>
                            <SkipForward className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex items-center space-x-4 w-1/3">
                        <span className="text-sm font-medium">Speed: {playbackSpeed}ms</span>
                        <Slider
                            value={[playbackSpeed]}
                            min={100}
                            max={2000}
                            step={100}
                            onValueChange={(v) => setPlaybackSpeed(v[0])}
                        />
                    </div>
                    <div>
                        <Badge variant={
                            currentStep.actionTaken?.type === 'ERROR' ? 'destructive' :
                                currentStep.actionTaken?.type === 'ACCEPT' ? 'default' : 'secondary'
                        }>
                            Step: {currentStepIndex}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
                {/* Stack Visualization */}
                <Card className="flex flex-col min-h-0">
                    <CardHeader className="py-2">
                        <CardTitle className="text-sm">Stack</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col-reverse justify-start overflow-auto p-4 bg-slate-50 rounded-b-lg">
                        <AnimatePresence>
                            {stackItems.map((item, idx) => (
                                <motion.div
                                    key={`${idx}-${item.stateId}-${item.symbol}`}
                                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex items-center justify-center p-2 mb-2 bg-white border shadow-sm rounded-md last:border-primary last:border-2"
                                >
                                    <span className="font-mono text-muted-foreground mr-2">{item.symbol}</span>
                                    <Badge variant="outline">State {item.stateId}</Badge>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {stackItems.length === 0 && <div className="text-center text-muted-foreground mt-4">Empty Stack</div>}
                    </CardContent>
                </Card>

                {/* Input & Log */}
                <div className="flex flex-col gap-4 min-h-0">
                    {/* Input Buffer */}
                    <Card>
                        <CardHeader className="py-2">
                            <CardTitle className="text-sm">Input Buffer</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 flex flex-wrap gap-2">
                            {currentStep.input.map((token, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "px-2 py-1 border rounded font-mono text-sm",
                                        i === 0 ? "bg-primary text-primary-foreground font-bold shadow-md" : "bg-muted"
                                    )}
                                >
                                    {token}
                                </div>
                            ))}
                            {currentStep.input.length === 0 && (
                                <span className="text-muted-foreground italic">End of input</span>
                            )}
                        </CardContent>
                    </Card>

                    {/* Action Log */}
                    <Card className="flex-1 flex flex-col min-h-0">
                        <CardHeader className="py-2">
                            <CardTitle className="text-sm">Action Log</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 p-0">
                            <ScrollArea className="h-full w-full p-4" id="action-log">
                                <div className="space-y-2">
                                    {simulationSteps.slice(0, currentStepIndex + 1).map((step, i) => (
                                        <div key={i} className="flex items-start text-sm border-b pb-2 last:border-0 last:bg-slate-50 last:p-2 last:rounded">
                                            <div className="w-8 font-bold text-muted-foreground mr-2">{i}.</div>
                                            <div className="flex-1">
                                                <div className="font-medium">{formatAction(step.actionTaken)}</div>
                                                {step.actionTaken?.type === 'REDUCE' && grammar && (
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        {(() => {
                                                            const prod = grammar.productions.find(p => p.id === step.actionTaken!.payload);
                                                            return prod ? `${prod.lhs} -> ${prod.rhs.join(' ')}` : '';
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Utility import for cn
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
