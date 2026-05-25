/**
 * StackedArea — stacked area chart showing how the share of several
 * series evolves across time. Used by the publication composition
 * variant on /charts to break down journal vs conference articles per
 * year.
 */
import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { AreaStack, Bar } from "@visx/shape";
import {
    defaultStyles,
    useTooltip,
    useTooltipInPortal,
} from "@visx/tooltip";
import type React from "react";
import { useCallback, useMemo } from "react";

import { formatThousands } from "../../lib/formatNumber";
import {
    CHART_AXIS_COLOR,
    CHART_GRID_COLOR,
    CHART_LABEL_COLOR,
    chartColor,
} from "./colorScale";

export interface StackedAreaSeries {
    name: string;
    colorIndex: number;
}

export interface StackedAreaPoint {
    x: number;
    /** Map from series name to numeric value at this x. */
    values: Record<string, number>;
}

interface StackedAreaProps {
    series: StackedAreaSeries[];
    points: StackedAreaPoint[];
    width: number;
    height: number;
    xLabel?: string;
    yLabel?: string;
    formatX?: (value: number) => string;
    formatY?: (value: number) => string;
}

const MARGIN = { top: 16, right: 24, bottom: 64, left: 64 };

const TOOLTIP_STYLES: React.CSSProperties = {
    ...defaultStyles,
    backgroundColor: "#F5F1E8",
    border: "1px solid #C8C0AE",
    color: "#1A1A1A",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 12,
    padding: "8px 12px",
    borderRadius: 4,
    boxShadow: "0 4px 12px rgba(20, 33, 61, 0.12)",
};

interface TooltipDatum {
    xValue: number;
    total: number;
    rows: { seriesName: string; value: number; colorIndex: number }[];
}

/**
 * Stacked area chart with full-area nearest-x hover.
 *
 * Each series is rendered as a coloured band stacked above the
 * previous, with smooth fills and a per-series tooltip aggregating
 * every value at the hovered X plus the running total.
 */
export function StackedArea({
    series,
    points,
    width,
    height,
    xLabel,
    yLabel,
    formatX = (value) => `${value}`,
    formatY = formatThousands,
}: StackedAreaProps) {
    const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
    const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

    const sortedXValues = useMemo(
        () => points.map((point) => point.x).sort((a, b) => a - b),
        [points],
    );

    const xExtent: [number, number] = sortedXValues.length
        ? [sortedXValues[0], sortedXValues[sortedXValues.length - 1]]
        : [0, 1];

    const yMax = useMemo(() => {
        return points.reduce((current, point) => {
            const totalAtX = series.reduce(
                (sum, entry) => sum + (point.values[entry.name] ?? 0),
                0,
            );
            return totalAtX > current ? totalAtX : current;
        }, 0);
    }, [points, series]);

    const xScale = useMemo(
        () =>
            scaleLinear<number>({
                domain: xExtent,
                range: [0, innerWidth],
            }),
        [xExtent, innerWidth],
    );
    const yScale = useMemo(
        () =>
            scaleLinear<number>({
                domain: [0, yMax || 1],
                range: [innerHeight, 0],
                nice: true,
            }),
        [yMax, innerHeight],
    );

    const keys = useMemo(() => series.map((entry) => entry.name), [series]);
    const colorByKey = useMemo(() => {
        const map = new Map<string, number>();
        for (const entry of series) {
            map.set(entry.name, entry.colorIndex);
        }
        return map;
    }, [series]);

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

    const handleMouseMove = useCallback(
        (event: React.MouseEvent<SVGRectElement>) => {
            const point = localPoint(event);
            if (!point || sortedXValues.length === 0) return;
            const relativeX = point.x - MARGIN.left;
            const dataX = xScale.invert(relativeX);
            let nearestX = sortedXValues[0];
            let nearestDistance = Math.abs(dataX - nearestX);
            for (const candidate of sortedXValues) {
                const distance = Math.abs(dataX - candidate);
                if (distance < nearestDistance) {
                    nearestX = candidate;
                    nearestDistance = distance;
                }
            }
            const sample = points.find((entry) => entry.x === nearestX);
            if (!sample) return;
            const rows = series.map((entry) => ({
                seriesName: entry.name,
                value: sample.values[entry.name] ?? 0,
                colorIndex: entry.colorIndex,
            }));
            const total = rows.reduce((sum, row) => sum + row.value, 0);
            showTooltip({
                tooltipData: { xValue: nearestX, total, rows },
                tooltipLeft: MARGIN.left + xScale(nearestX),
                tooltipTop: MARGIN.top,
            });
        },
        [points, series, sortedXValues, xScale, showTooltip],
    );

    if (innerWidth <= 0 || innerHeight <= 0 || points.length === 0) {
        return null;
    }

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
                    <AreaStack<StackedAreaPoint>
                        data={points}
                        keys={keys}
                        value={(point, key) => point.values[key] ?? 0}
                        x={(stackPoint) => xScale(stackPoint.data.x)}
                        y0={(stackPoint) => yScale(stackPoint[0])}
                        y1={(stackPoint) => yScale(stackPoint[1])}
                    >
                        {({ stacks, path }) =>
                            stacks.map((stack) => (
                                <path
                                    key={`stack-${stack.key}`}
                                    d={path(stack) || ""}
                                    fill={chartColor(colorByKey.get(stack.key) ?? 0)}
                                    fillOpacity={0.85}
                                    stroke="#F5F1E8"
                                    strokeWidth={0.75}
                                />
                            ))
                        }
                    </AreaStack>

                    {tooltipData ? (
                        <line
                            x1={xScale(tooltipData.xValue)}
                            x2={xScale(tooltipData.xValue)}
                            y1={0}
                            y2={innerHeight}
                            stroke={CHART_AXIS_COLOR}
                            strokeWidth={1}
                            strokeDasharray="2,3"
                            pointerEvents="none"
                        />
                    ) : null}

                    <AxisBottom
                        top={innerHeight}
                        scale={xScale}
                        stroke={CHART_AXIS_COLOR}
                        tickStroke={CHART_AXIS_COLOR}
                        tickFormat={(value) => formatX(value as number)}
                        tickLabelProps={() => ({
                            fill: CHART_LABEL_COLOR,
                            fontSize: 11,
                            fontFamily: "Inter, system-ui, sans-serif",
                            textAnchor: "middle",
                            dy: 4,
                        })}
                        label={xLabel}
                        labelProps={{
                            fill: CHART_LABEL_COLOR,
                            fontSize: 12,
                            fontFamily: "Inter, system-ui, sans-serif",
                            textAnchor: "middle",
                            dy: 48,
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
                            dx: -44,
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
                    <div className="text-caption uppercase tracking-wide text-smoke mb-1 font-mono">
                        {formatX(tooltipData.xValue)}
                    </div>
                    <div className="flex flex-col gap-1">
                        {tooltipData.rows.map((row) => (
                            <div
                                key={row.seriesName}
                                className="flex items-center gap-2 font-mono tabular-nums"
                            >
                                <span
                                    className="inline-block size-2 rounded-xs"
                                    style={{ backgroundColor: chartColor(row.colorIndex) }}
                                />
                                <span className="text-slate flex-1">{row.seriesName}</span>
                                <strong className="text-ink">
                                    {formatY(row.value)}
                                </strong>
                            </div>
                        ))}
                        <div className="flex items-center justify-between gap-2 font-mono tabular-nums pt-1 border-t border-hairline mt-1">
                            <span className="text-caption uppercase tracking-wide text-smoke">
                                Total
                            </span>
                            <strong className="text-ink">{formatY(tooltipData.total)}</strong>
                        </div>
                    </div>
                </TooltipInPortal>
            ) : null}
        </>
    );
}
