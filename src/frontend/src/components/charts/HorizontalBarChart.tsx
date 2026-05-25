/**
 * HorizontalBarChart — horizontal bars sorted by magnitude, useful when
 * the X-axis labels are long (publisher names, country names). Used by
 * the top-N publishers variant on /charts.
 */
import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { GridColumns } from "@visx/grid";
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

export interface HorizontalBarDatum {
    category: string;
    value: number;
    colorIndex?: number;
    secondary?: string;
}

interface HorizontalBarChartProps {
    data: HorizontalBarDatum[];
    width: number;
    height: number;
    xLabel?: string;
    yLabel?: string;
    formatValue?: (value: number) => string;
}

const MARGIN = { top: 16, right: 32, bottom: 64, left: 200 };

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

/**
 * Top-N horizontal bar chart.
 *
 * Categories run down the Y axis, values along the X axis. Useful for
 * leaderboards where long category labels would clash with a vertical
 * bar layout. Includes generous full-area hover with band-snapping.
 */
export function HorizontalBarChart({
    data,
    width,
    height,
    xLabel,
    yLabel,
    formatValue = formatThousands,
}: HorizontalBarChartProps) {
    const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
    const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

    const maxValue = useMemo(
        () => data.reduce((current, entry) => Math.max(current, entry.value), 0),
        [data],
    );

    const yScale = useMemo(
        () =>
            scaleBand<string>({
                domain: data.map((entry) => entry.category),
                range: [0, innerHeight],
                padding: 0.2,
            }),
        [data, innerHeight],
    );

    const xScale = useMemo(
        () =>
            scaleLinear<number>({
                domain: [0, maxValue || 1],
                range: [0, innerWidth],
                nice: true,
            }),
        [maxValue, innerWidth],
    );

    const {
        tooltipOpen,
        tooltipLeft,
        tooltipTop,
        tooltipData,
        showTooltip,
        hideTooltip,
    } = useTooltip<HorizontalBarDatum>();
    const { containerRef, TooltipInPortal } = useTooltipInPortal({
        detectBounds: true,
        scroll: true,
    });

    const handleMouseMove = useCallback(
        (event: React.MouseEvent<SVGRectElement>) => {
            const point = localPoint(event);
            if (!point || data.length === 0) return;
            const relativeY = point.y - MARGIN.top;
            const index = Math.max(
                0,
                Math.min(
                    data.length - 1,
                    Math.floor((relativeY / innerHeight) * data.length),
                ),
            );
            const entry = data[index];
            showTooltip({
                tooltipData: entry,
                tooltipLeft: MARGIN.left + xScale(entry.value),
                tooltipTop: MARGIN.top + (yScale(entry.category) ?? 0),
            });
        },
        [data, innerHeight, xScale, yScale, showTooltip],
    );

    if (innerWidth <= 0 || innerHeight <= 0 || data.length === 0) {
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
                    <GridColumns
                        scale={xScale}
                        height={innerHeight}
                        stroke={CHART_GRID_COLOR}
                        strokeDasharray="2,2"
                        numTicks={5}
                    />
                    {data.map((entry, index) => {
                        const colour = chartColor(entry.colorIndex ?? index);
                        const yPos = yScale(entry.category) ?? 0;
                        const barWidth = xScale(entry.value);
                        const isActive =
                            tooltipData != null &&
                            tooltipData.category === entry.category;
                        return (
                            <Bar
                                key={entry.category}
                                x={0}
                                y={yPos}
                                width={barWidth}
                                height={yScale.bandwidth()}
                                fill={colour}
                                fillOpacity={isActive ? 1 : 0.85}
                                pointerEvents="none"
                            />
                        );
                    })}

                    <AxisLeft
                        scale={yScale}
                        stroke={CHART_AXIS_COLOR}
                        tickStroke={CHART_AXIS_COLOR}
                        tickLabelProps={() => ({
                            fill: CHART_LABEL_COLOR,
                            fontSize: 11,
                            fontFamily: "Inter, system-ui, sans-serif",
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
                            dx: -180,
                            angle: -90,
                        }}
                    />
                    <AxisBottom
                        top={innerHeight}
                        scale={xScale}
                        stroke={CHART_AXIS_COLOR}
                        tickStroke={CHART_AXIS_COLOR}
                        numTicks={5}
                        tickFormat={(value) => formatValue(value as number)}
                        tickLabelProps={() => ({
                            fill: CHART_LABEL_COLOR,
                            fontSize: 11,
                            fontFamily: "JetBrains Mono, ui-monospace, monospace",
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
                    <strong className="text-ink">{tooltipData.category}</strong>
                    {tooltipData.secondary ? (
                        <div className="text-caption uppercase tracking-wide text-smoke mt-1">
                            {tooltipData.secondary}
                        </div>
                    ) : null}
                    <div className="font-mono tabular-nums mt-1">
                        {xLabel ? `${xLabel}: ` : ""}
                        <span className="text-ink">{formatValue(tooltipData.value)}</span>
                    </div>
                </TooltipInPortal>
            ) : null}
        </>
    );
}
