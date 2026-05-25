/**
 * ScatterPlot — 2D point cloud with optional log scales on either axis,
 * a per-point colour key and an optional size scale. Used by the
 * authors-vs-articles plot and the journal-metrics plot where the X and
 * Y axes are user-selectable across 10 numeric metrics.
 */
import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleLinear, scaleLog, scaleSqrt } from "@visx/scale";
import { Bar, Circle } from "@visx/shape";
import { defaultStyles, useTooltip, useTooltipInPortal } from "@visx/tooltip";
import type React from "react";
import { useCallback, useMemo } from "react";

import {
    CHART_AXIS_COLOR,
    CHART_GRID_COLOR,
    CHART_LABEL_COLOR,
    chartColor,
} from "./colorScale";

export interface ScatterPoint {
    id: string | number;
    label: string;
    x: number;
    y: number;
    group?: string;
    size?: number | null;
}

export type ScatterScale = "linear" | "log";

interface ScatterPlotProps {
    points: ScatterPoint[];
    width: number;
    height: number;
    xLabel?: string;
    yLabel?: string;
    sizeLabel?: string;
    formatX?: (value: number) => string;
    formatY?: (value: number) => string;
    formatSize?: (value: number) => string;
    groupColorIndex?: (group: string | undefined) => number;
    xScaleType?: ScatterScale;
    yScaleType?: ScatterScale;
}

const MARGIN = { top: 16, right: 24, bottom: 72, left: 72 };
const MIN_RADIUS = 3;
const MAX_RADIUS = 14;

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
 * Scatter plot with rich parametric control.
 *
 * Supports per-axis linear / log scales, optional point-size encoding
 * (bubble chart), categorical colour-by via ``groupColorIndex``, and a
 * generous nearest-point hover overlay that works between points and
 * highlights the active one. The component clamps non-positive values
 * to the lower domain bound when a log scale is requested so a single
 * zero or negative entry cannot blank the chart.
 */
export function ScatterPlot({
    points,
    width,
    height,
    xLabel,
    yLabel,
    sizeLabel,
    formatX = (value: number) => value.toLocaleString(),
    formatY = (value: number) => value.toLocaleString(),
    formatSize = (value: number) => value.toLocaleString(),
    groupColorIndex,
    xScaleType = "linear",
    yScaleType = "linear",
}: ScatterPlotProps) {
    const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
    const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

    const { xExtent, yExtent, sizeExtent, hasSizeEncoding } = useMemo(() => {
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const sizes = points
            .map((p) => p.size)
            .filter((value): value is number => value != null && Number.isFinite(value));
        return {
            xExtent: xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 1],
            yExtent: ys.length ? [Math.min(...ys), Math.max(...ys)] : [0, 1],
            sizeExtent: sizes.length
                ? [Math.min(...sizes), Math.max(...sizes)]
                : [0, 1],
            hasSizeEncoding: sizes.length > 0,
        };
    }, [points]);

    const xScale = useMemo(() => {
        if (xScaleType === "log") {
            const lowerBound = Math.max(xExtent[0], 1);
            return scaleLog<number>({
                domain: [lowerBound, Math.max(xExtent[1], lowerBound * 10)],
                range: [0, innerWidth],
                nice: true,
            });
        }
        return scaleLinear<number>({
            domain: xExtent,
            range: [0, innerWidth],
            nice: true,
        });
    }, [xExtent, innerWidth, xScaleType]);

    const yScale = useMemo(() => {
        if (yScaleType === "log") {
            const lowerBound = Math.max(yExtent[0], 1);
            return scaleLog<number>({
                domain: [lowerBound, Math.max(yExtent[1], lowerBound * 10)],
                range: [innerHeight, 0],
                nice: true,
            });
        }
        return scaleLinear<number>({
            domain: yExtent,
            range: [innerHeight, 0],
            nice: true,
        });
    }, [yExtent, innerHeight, yScaleType]);

    const sizeScale = useMemo(() => {
        if (!hasSizeEncoding) return null;
        return scaleSqrt<number>({
            domain: sizeExtent,
            range: [MIN_RADIUS, MAX_RADIUS],
        });
    }, [sizeExtent, hasSizeEncoding]);

    const resolveRadius = useCallback(
        (point: ScatterPoint, isActive: boolean) => {
            if (sizeScale && point.size != null && Number.isFinite(point.size)) {
                const baseRadius = sizeScale(point.size);
                return isActive ? baseRadius + 2 : baseRadius;
            }
            return isActive ? 6 : 4;
        },
        [sizeScale],
    );

    const {
        tooltipOpen,
        tooltipLeft,
        tooltipTop,
        tooltipData,
        showTooltip,
        hideTooltip,
    } = useTooltip<ScatterPoint>();
    const { containerRef, TooltipInPortal } = useTooltipInPortal({
        detectBounds: true,
        scroll: true,
    });

    const scaledPoints = useMemo(() => {
        return points
            .map((point) => {
                const validX =
                    xScaleType === "log" ? point.x > 0 : Number.isFinite(point.x);
                const validY =
                    yScaleType === "log" ? point.y > 0 : Number.isFinite(point.y);
                if (!validX || !validY) return null;
                return {
                    point,
                    cx: xScale(point.x),
                    cy: yScale(point.y),
                };
            })
            .filter((entry): entry is { point: ScatterPoint; cx: number; cy: number } =>
                entry !== null,
            );
    }, [points, xScale, yScale, xScaleType, yScaleType]);

    const handleMouseMove = useCallback(
        (event: React.MouseEvent<SVGRectElement>) => {
            const target = localPoint(event);
            if (!target || scaledPoints.length === 0) return;
            const relativeX = target.x - MARGIN.left;
            const relativeY = target.y - MARGIN.top;
            let nearest: typeof scaledPoints[number] | null = null;
            let nearestDistance = Number.POSITIVE_INFINITY;
            for (const candidate of scaledPoints) {
                const distance = Math.hypot(
                    candidate.cx - relativeX,
                    candidate.cy - relativeY,
                );
                if (distance < nearestDistance) {
                    nearest = candidate;
                    nearestDistance = distance;
                }
            }
            if (nearest === null || nearestDistance > 50) {
                hideTooltip();
                return;
            }
            showTooltip({
                tooltipData: nearest.point,
                tooltipLeft: MARGIN.left + nearest.cx,
                tooltipTop: MARGIN.top + nearest.cy,
            });
        },
        [scaledPoints, showTooltip, hideTooltip],
    );

    if (innerWidth <= 0 || innerHeight <= 0) {
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
                    {scaledPoints.map(({ point, cx, cy }) => {
                        const colour = chartColor(
                            groupColorIndex ? groupColorIndex(point.group) : 0,
                        );
                        const isActive =
                            tooltipData != null && tooltipData.id === point.id;
                        return (
                            <Circle
                                key={point.id}
                                cx={cx}
                                cy={cy}
                                r={resolveRadius(point, isActive)}
                                fill={colour}
                                fillOpacity={isActive ? 0.95 : 0.55}
                                stroke="#F5F1E8"
                                strokeWidth={isActive ? 2 : 1}
                                pointerEvents="none"
                            />
                        );
                    })}
                    <AxisBottom
                        top={innerHeight}
                        scale={xScale}
                        stroke={CHART_AXIS_COLOR}
                        tickStroke={CHART_AXIS_COLOR}
                        numTicks={xScaleType === "log" ? 6 : 6}
                        tickFormat={(value) => formatX(value as number)}
                        tickLabelProps={() => ({
                            fill: CHART_LABEL_COLOR,
                            fontSize: 11,
                            fontFamily: "JetBrains Mono, ui-monospace, monospace",
                            textAnchor: "middle",
                            dy: 4,
                        })}
                        label={
                            xLabel
                                ? xScaleType === "log"
                                    ? `${xLabel} (log)`
                                    : xLabel
                                : undefined
                        }
                        labelProps={{
                            fill: CHART_LABEL_COLOR,
                            fontSize: 12,
                            fontFamily: "Inter, system-ui, sans-serif",
                            textAnchor: "middle",
                            dy: 52,
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
                        label={
                            yLabel
                                ? yScaleType === "log"
                                    ? `${yLabel} (log)`
                                    : yLabel
                                : undefined
                        }
                        labelProps={{
                            fill: CHART_LABEL_COLOR,
                            fontSize: 12,
                            fontFamily: "Inter, system-ui, sans-serif",
                            textAnchor: "middle",
                            dx: -52,
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
                    <strong className="text-ink">{tooltipData.label}</strong>
                    {tooltipData.group ? (
                        <div className="text-caption uppercase tracking-wide text-smoke mt-1">
                            {tooltipData.group}
                        </div>
                    ) : null}
                    <div className="font-mono tabular-nums mt-1 text-slate">
                        {xLabel ? `${xLabel}: ` : ""}
                        <span className="text-ink">{formatX(tooltipData.x)}</span>
                    </div>
                    <div className="font-mono tabular-nums text-slate">
                        {yLabel ? `${yLabel}: ` : ""}
                        <span className="text-ink">{formatY(tooltipData.y)}</span>
                    </div>
                    {tooltipData.size != null && Number.isFinite(tooltipData.size) ? (
                        <div className="font-mono tabular-nums text-slate">
                            {sizeLabel ? `${sizeLabel}: ` : "Size: "}
                            <span className="text-ink">{formatSize(tooltipData.size)}</span>
                        </div>
                    ) : null}
                </TooltipInPortal>
            ) : null}
        </>
    );
}
