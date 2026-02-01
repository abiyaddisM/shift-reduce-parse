"use client";

import { InputSetup } from "@/components/modules/input-setup";
import { ParsingTableView } from "@/components/modules/parsing-table";
import { SimulationDeck } from "@/components/modules/simulation-deck";
import { VisualizationGraph } from "@/components/modules/visualization-graph";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function Home() {
    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-[1400px] mx-auto space-y-8">


                <Separator />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Input & Configuration */}
                    <div className="lg:col-span-4 space-y-8">
                        <section>
                            <InputSetup />
                        </section>

                        <section>
                            <div className="bg-white rounded-xl shadow-sm border p-1">
                                <SimulationDeck />
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Visualization & Tables */}
                    <div className="lg:col-span-8 space-y-8">
                        <Tabs defaultValue="graph" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="graph">Canonical State Machine</TabsTrigger>
                                <TabsTrigger value="table">Parsing Table</TabsTrigger>
                            </TabsList>
                            <TabsContent value="graph" className="mt-4">
                                <VisualizationGraph />
                            </TabsContent>
                            <TabsContent value="table" className="mt-4">
                                <ParsingTableView />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
