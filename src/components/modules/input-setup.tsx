"use client";

import * as React from "react";
import { useParserStore } from "@/store/parser-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download, Play, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function InputSetup() {
    const {
        grammarInput,
        setGrammarInput,
        inputString,
        setInputString,
        processGrammar,
        tableType,
        setTableType,
        error
    } = useParserStore();

    const handleProcess = () => {
        processGrammar();
    };

    React.useEffect(() => {
        processGrammar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    const handleSave = () => {
        const config = {
            grammarInput,
            inputString
        };
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "parser-config.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target?.result as string);
                if (config.grammarInput) setGrammarInput(config.grammarInput);
                if (config.inputString) setInputString(config.inputString);
            } catch (err) {
                console.error("Failed to load config", err);
            }
        };
        reader.readAsText(file);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>
                    Define your grammar and input string to start the simulation.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="grammar">Grammar Rules</Label>
                    <Textarea
                        id="grammar"
                        placeholder="E -> E + T | T..."
                        className="font-mono h-48 resize-y"
                        value={grammarInput}
                        onChange={(e) => setGrammarInput(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="input">Input String</Label>
                    <Textarea
                        id="input"
                        placeholder="id + id * id"
                        className="font-mono h-12 resize-none"
                        value={inputString}
                        onChange={(e) => setInputString(e.target.value)}
                    />
                </div>

                <div className="flex items-center space-x-4">
                    <Label>Table Type:</Label>
                    <Tabs value={tableType} onValueChange={(v: any) => setTableType(v)}>
                        <TabsList>
                            <TabsTrigger value="LR0">LR(0)</TabsTrigger>
                            <TabsTrigger value="SLR1">SLR(1)</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

            </CardContent>
            <CardFooter className="flex justify-between">
                <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={handleSave}>
                        <Download className="mr-2 h-4 w-4" /> Save
                    </Button>
                    <div className="relative">
                        <Button variant="outline" size="sm" className="relative cursor-pointer">
                            <Upload className="mr-2 h-4 w-4" /> Load
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleLoad}
                                accept=".json"
                            />
                        </Button>
                    </div>
                </div>
                <Button onClick={handleProcess}>
                    <Play className="mr-2 h-4 w-4" /> Process Grammar
                </Button>
            </CardFooter>
        </Card>
    );
}
