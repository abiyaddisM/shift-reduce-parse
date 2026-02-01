"use client";

import * as React from "react";
import { useParserStore } from "@/store/parser-store";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParsingAction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { END_MARKER } from "@/lib/sets";

function formatAction(action: ParsingAction): string {
    switch (action.type) {
        case 'SHIFT': return `s${action.payload}`;
        case 'REDUCE': return `r${action.payload}`;
        case 'ACCEPT': return `acc`;
        case 'GOTO': return `${action.payload}`;
        case 'ERROR': return `err`;
        default: return '';
    }
}

export function ParsingTableView() {
    const { parsingTable, grammar, canonicalCollection, tableType, setTableType } = useParserStore();

    if (!parsingTable || !grammar || !canonicalCollection) {
        return (
            <Card className="w-full h-full min-h-[300px] flex items-center justify-center text-muted-foreground">
                No table generated yet.
            </Card>
        );
    }

    // Columns: Terminals (Action) + NonTerminals (Goto)
    // Remove epsilon from terminals, add $
    const terminals = Array.from(grammar.terminals).filter(t => t !== 'epsilon' && t !== 'ε').sort();
    terminals.push(END_MARKER);

    const nonTerminals = Array.from(grammar.nonTerminals).filter(nt => nt !== grammar.augmentedStartSymbol).sort();

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Parsing Table ({tableType})</CardTitle>
                <Tabs value={tableType} onValueChange={(v: any) => setTableType(v)}>
                    <TabsList>
                        <TabsTrigger value="LR0">LR(0)</TabsTrigger>
                        <TabsTrigger value="SLR1">SLR(1)</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                <div className="overflow-auto max-h-[500px]">
                    <Table className="border border-collapse w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead rowSpan={2} className="w-[80px] text-center border">State</TableHead>
                                <TableHead colSpan={terminals.length} className="text-center border bg-muted/50">Action</TableHead>
                                <TableHead colSpan={nonTerminals.length} className="text-center border bg-muted/50">Goto</TableHead>
                            </TableRow>
                            <TableRow>
                                {terminals.map(t => (
                                    <TableHead key={t} className="text-center border min-w-[50px]">{t}</TableHead>
                                ))}
                                {nonTerminals.map(nt => (
                                    <TableHead key={nt} className="text-center border min-w-[50px]">{nt}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {canonicalCollection.states.map((state) => {
                                return (
                                    <TableRow key={state.id}>
                                        <TableCell className="text-center font-medium border">{state.id}</TableCell>

                                        {/* Action Columns */}
                                        {terminals.map(t => {
                                            const row = parsingTable.action[state.id];
                                            const actions = row ? row[t] : [];
                                            const hasConflict = actions && actions.length > 1;
                                            const cellText = actions ? actions.map(formatAction).join('/') : '';

                                            return (
                                                <TableCell
                                                    key={t}
                                                    className={cn(
                                                        "text-center border p-2",
                                                        hasConflict ? "bg-red-100 text-red-700 font-bold" : ""
                                                    )}
                                                >
                                                    {cellText || '-'}
                                                </TableCell>
                                            );
                                        })}

                                        {/* Goto Columns */}
                                        {nonTerminals.map(nt => {
                                            const gotoState = parsingTable.goto[state.id]?.[nt];
                                            return (
                                                <TableCell key={nt} className="text-center border">
                                                    {gotoState !== undefined ? gotoState : '-'}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                <div className="mt-4 p-2 bg-slate-100 text-xs font-mono text-muted-foreground">
                    Debug: States: {canonicalCollection.states.length},
                    Terminals: {terminals.length} ({terminals.join(', ')}),
                    NonTerminals: {nonTerminals.length} ({nonTerminals.join(', ')}),
                    Actions Recorded: {Object.keys(parsingTable.action).length}.
                    State 0 Actions: {JSON.stringify(parsingTable.action[0] || {})}
                </div>
            </CardContent>
        </Card>
    );
}
