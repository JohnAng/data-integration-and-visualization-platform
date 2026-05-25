/**
 * BarChart — grouped bar chart with one X-axis category per cluster and
 * multiple coloured bars per series. Used by the publisher x quartile
 * chart and by the venue-metrics chart, where each cluster represents a
 * publisher / venue and each bar is one metric.
 */
import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { defaultStyles, useTooltip, useTooltipInPortal } from "@visx/tooltip";
import type React from "react";
import { useCallback, useMemo } from "react";

import { formatThousands } from "../../lib/formatNumber";
import {
    CHART_AXIS_COLOR,
    CHART_GRID_COLOR,
    CHART_LABEL_COLOR,
    chartColor,
} from "./colorScale";

export interface BarGroupDatum {
    category: string;
    values: { seriesName: string; value: number; colorIndex?: number }[];
}

interface BarChartProps {
    data: BarGroupDatum[];
    width: number;
    height: number;
    xLabel?: string;
    yLabel?: string;
    formatY?: (value: number) => string;
}

const MARGIN = { top: 16, right: 16, bottom: 132, left: 64 };

const TOOLTIP_STYLES: React.CSSProperties = {
    ...defaultStyles,
    backgroundColor: "#F5F1E8",
    border: "1px solid #C8C0AE",
    color: "#1A1A1A",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 12,
    padding: "8px 12px",
    borderRadius: 4,
};

interface TooltipDatum {
    category: string;
    rows: { seriesName: string; value: number; colorIndex: number }[];
}

export function BarChart({
    data,
    width,
    height,
    xLabel,
    yLabel,
    formatY = formatThousands,
}: BarChartProps) {
    const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
    const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

    const seriesNames = useMemo(() => {
        const collected = new Set<string>();
        for (const group of data) {
            for (const v of group.values) {
                collected.add(v.seriesName);
            }
        }
        return Array.from(collected);
    }, [data]);

    const maxValue = useMemo(
        () =>
            data.reduce(
                (currentMax, group) =>
                    group.values.reduce(
                        (m, v) => (v.value > m ? v.value : m),
                        currentMax,
                    ),
                0,
            ),
        [data],
    );

    const categoryScale = useMemo(
        () =>
            scaleBand<string>({
                domain: data.map((group) => group.category),
                range: [0, innerWidth],
                padding: 0.2,
            }),
        [data, innerWidth],
    );

    const seriesScale = useMemo(
        () =>
            scaleBand<string>({
                domain: seriesNames,
                range: [0, categoryScale.bandwidth()],
                padding: 0.1,
            }),
        [seriesNames, categoryScale],
    );

    const yScale = useMemo(
        () =>
            scaleLinear<number>({
                domain: [0, maxValue || 1],
                range: [innerHeight, 0],
                nice: true,
            }),
        [maxValue, innerHeight],
    );

    const {
        tooltipOpen,
        tooltipLeft,
        tooltipTop,
        tooltipData,
        showTooltip,
        hideTooltip,
    } = useTooltip<TooltipDatum>();
    const { containerRef, TooltipInPortal } = useTooltipInPortal({
        detectBounds: true,
        scroll: true,
    });

    const categoryStep = useMemo(() => {
        const step = categoryScale.step();
        return step > 0 ? step : 1;
    }, [categoryScale]);

    const handleMouseMove = useCallback(
        (event: React.MouseEvent<SVGRectElement>) => {
            const point = localPoint(event);
            if (!point || data.length === 0) return;
            const relativeX = point.x - MARGIN.left;
            const indexFloat = relativeX / categoryStep;
            const index = Math.max(
                0,
                Math.min(data.length - 1, Math.floor(indexFloat)),
            );
            const group = data[index];
            const rows = group.values.map((entry, entryIndex) => ({
                seriesName: entry.seriesName,
                value: entry.value,
                colorIndex: entry.colorIndex ?? entryIndex,
            }));
            const groupLeft = categoryScale(group.category) ?? 0;
            showTooltip({
                tooltipData: { category: group.category, rows },
                tooltipLeft:
                    MARGIN.left + groupLeft + categoryScale.bandwidth() / 2,
                tooltipTop: MARGIN.top,
            });
        },
        [categoryScale, categoryStep, data, showTooltip],
    );

    if (innerWidth <= 0 || innerHeight <= 0) {
        return null;
    }

    const highlightLeft = tooltipData
        ? (categoryScale(tooltipData.category) ?? null)
        : null;

    return (
        <>
            <svg
                ref={containerRef}
                width={width}
                height={height}
                style={{ overflow: "visible" }}
            >
                <Group left={MARGIN.left} top={MARGIN.top}>
                    <GridRows
                        scale={yScale}
                        width={innerWidth}
                        stroke={CHART_GRID_COLOR}
                        strokeDasharray="2,2"
                        numTicks={5}
                    />
                    {highlightLeft !== null ? (
                        <rect
                            x={highlightLeft - (categoryStep - categoryScale.bandwidth()) / 2}
                            y={0}
                            width={categoryStep}
                            height={innerHeight}
                            fill={CHART_GRID_COLOR}
                            opacity={0.35}
                            pointerEvents="none"
                        />
                    ) : null}
                    {data.map((group) => {
                        const groupLeft = categoryScale(group.category) ?? 0;
                        return (
                            <Group key={group.category} left={groupLeft}>
                                {group.values.map((v, valueIndex) => {
                                    const barWidth = seriesScale.bandwidth();
                                    const barHeight = innerHeight - yScale(v.value);
                                    const barLeft = seriesScale(v.seriesName) ?? 0;
                                    const colour = chartColor(
                                        v.colorIndex ?? valueIndex,
                                    );
                                    return (
                                        <Bar
                                            key={v.seriesName}
                                            x={barLeft}
                                            y={yScale(v.value)}
                                            width={barWidth}
                                            height={barHeight}
                                            fill={colour}
                                            pointerEvents="none"
                                        />
                                    );
                                })}
                            </Group>
                        );
                    })}
                    <AxisBottom
                        top={innerHeight}
                        scale={categoryScale}
                        stroke={CHART_AXIS_COLOR}
                        tickStroke={CHART_AXIS_COLOR}
                        tickLabelProps={() => ({
                            fill: CHART_LABEL_COLOR,
                            fontSize: 11,
                            fontFamily: "Inter, system-ui, sans-serif",
                            textAnchor: "end",
                            angle: -35,
                            dx: -4,
                            dy: 4,
                        })}
                        label={xLabel}
                        labelProps={{
                            fill: CHART_LABEL_COLOR,
                            fontSize: 12,
                            fontFamily: "Inter, system-ui, sans-serif",
                            textAnchor: "middle",
                            dy: 116,
                        }}
                    />
                    <AxisLeft
                        scale={yScale}
                        stroke={CHART_AXIS_COLOR}
                        tickStroke={CHART_AXIS_COLOR}
                        numTicks={5}
                        tickFormat={(value) => formatY(value as number)}
                        tickLabelProps={() => ({
                            fill: CHART_LABEL_COLOR,
                            fontSize: 11,
                            fontFamily: "JetBrains Mono, ui-monospace, monospace",
                            textAnchor: "end",
                            dx: -4,
                            dy: 4,
                        })}
                        label={yLabel}
                        labelProps={{
                            fill: CHART_LABEL_COLOR,
                            fontSize: 12,
                            fontFamily: "Inter, system-ui, sans-serif",
                            textAnchor: "middle",
                            dx: -36,
                            angle: -90,
                        }}
                    />
                    <Bar
                        x={0}
                        y={0}
                        width={innerWidth}
                        height={innerHeight}
                        fill="transparent"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={hideTooltip}
                    />
                </Group>
            </svg>

            {tooltipOpen && tooltipData ? (
                <TooltipInPortal
                    top={tooltipTop}
                    left={tooltipLeft}
                    style={TOOLTIP_STYLES}
                >
                    <div className="text-caption uppercase tracking-wide text-smoke mb-2">
                        {tooltipData.category}
                    </div>
                    <div className="flex flex-col gap-1">
                        {tooltipData.rows.map((row) => (
                            <div
                                key={row.seriesName}
                                className="flex items-center gap-2 font-mono tabular-nums"
                            >
                                <span
                                    className="inline-block size-2 rounded-xs"
                                    style={{
                                        backgroundColor: chartColor(row.colorIndex),
                                    }}
                                />
                                <span className="text-slate flex-1">
                                    {row.seriesName}
                                </span>
                                <strong className="text-ink">
                                    {formatY(row.value)}
                                </strong>
                            </div>
                        ))}
                    </div>
                </TooltipInPortal>
            ) : null}
        </>
    );
}
