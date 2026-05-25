/**
 * LineChart — multi-series time-series chart built on Visx primitives.
 * Adds drag-to-zoom on the X axis, a nearest-x hover overlay that drives
 * a tooltip showing every series' value at the cursor, and a
 * monotone-X curve so trend lines stay readable. Used on the dashboard,
 * every profile page, and the /charts playground.
 */
import { AxisBottom, AxisLeft } from "@visx/axis";
import { curveMonotoneX } from "@visx/curve";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { localPoint } from "@visx/event";
import { scaleLinear } from "@visx/scale";
import { Bar, Circle, Line, LinePath } from "@visx/shape";
import {
    useTooltip,
    useTooltipInPortal,
    defaultStyles,
} from "@visx/tooltip";
import type React from "react";
import { useCallback, useMemo, useState } from "react";

import { formatThousands } from "../../lib/formatNumber";
import {
    CHART_AXIS_COLOR,
    CHART_GRID_COLOR,
    CHART_LABEL_COLOR,
    chartColor,
} from "./colorScale";

export interface LineChartPoint {
    x: number;
    y: number;
}

export interface LineChartSeries {
    name: string;
    data: LineChartPoint[];
    colorIndex?: number;
}

interface LineChartProps {
    series: LineChartSeries[];
    width: number;
    height: number;
    xLabel?: string;
    yLabel?: string;
    formatX?: (value: number) => string;
    formatY?: (value: number) => string;
    /** Optional zoom domain that overrides the auto-computed X extent. */
    zoomDomain?: [number, number] | null;
    /** Called with the new domain when the user drags to select a range. */
    onZoom?: (domain: [number, number]) => void;
    /** Called when the user double-clicks to reset the zoom. */
    onResetZoom?: () => void;
}

/** Clamp a number to the closed interval ``[lower, upper]``. */
function clamp(value: number, lower: number, upper: number): number {
    if (value < lower) return lower;
    if (value > upper) return upper;
    return value;
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

interface HoverPayload {
    xValue: number;
    rows: {
        seriesName: string;
        value: number | null;
        colorIndex: number;
    }[];
}

/**
 * Crosshair-style line chart with a generous full-area hover overlay.
 *
 * Hovering anywhere over the plot area snaps a vertical crosshair to the
 * nearest x value in the union of all series, renders a highlight dot per
 * series at that x, and shows a multi-series tooltip listing every value
 * at that point. This avoids the "must hit a tiny dot" problem of the
 * previous per-point hover targets and works between data points too.
 */
export function LineChart({
    series,
    width,
    height,
    xLabel,
    yLabel,
    formatX = (value) => `${value}`,
    formatY = formatThousands,
    zoomDomain = null,
    onZoom,
    onResetZoom,
}: LineChartProps) {
    const clipPathId = useMemo(
        () => `chart-clip-${Math.random().toString(36).slice(2, 11)}`,
        [],
    );
    const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
    const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

    const sortedXValues = useMemo(() => {
        const collected = new Set<number>();
        for (const single of series) {
            for (const point of single.data) {
                collected.add(point.x);
            }
        }
        return Array.from(collected).sort((a, b) => a - b);
    }, [series]);

    const { xExtent, yExtent } = useMemo(() => {
        const ys: number[] = [];
        const lowerX = zoomDomain ? zoomDomain[0] : undefined;
        const upperX = zoomDomain ? zoomDomain[1] : undefined;
        for (const single of series) {
            for (const point of single.data) {
                if (lowerX != null && point.x < lowerX) continue;
                if (upperX != null && point.x > upperX) continue;
                ys.push(point.y);
            }
        }
        const xExtentRange: [number, number] = zoomDomain
            ? zoomDomain
            : sortedXValues.length
              ? [sortedXValues[0], sortedXValues[sortedXValues.length - 1]]
              : [0, 1];
        const yExtentRange: [number, number] = ys.length
            ? [0, Math.max(...ys)]
            : [0, 1];
        return { xExtent: xExtentRange, yExtent: yExtentRange };
    }, [series, sortedXValues, zoomDomain]);

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
                domain: yExtent,
                range: [innerHeight, 0],
                nice: true,
            }),
        [yExtent, innerHeight],
    );

    const valueLookups = useMemo(() => {
        return series.map((single) => {
            const map = new Map<number, number>();
            for (const point of single.data) {
                map.set(point.x, point.y);
            }
            return map;
        });
    }, [series]);

    const {
        tooltipOpen,
        tooltipLeft,
        tooltipTop,
        tooltipData,
        showTooltip,
        hideTooltip,
    } = useTooltip<HoverPayload>();

    const { containerRef, TooltipInPortal } = useTooltipInPortal({
        detectBounds: true,
        scroll: true,
    });

    const [dragStartX, setDragStartX] = useState<number | null>(null);
    const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);

    const isDragging = dragStartX !== null && dragCurrentX !== null;

    const handleMouseMove = useCallback(
        (event: React.MouseEvent<SVGRectElement>) => {
            const point = localPoint(event);
            if (!point) return;
            const relativeX = clamp(point.x - MARGIN.left, 0, innerWidth);
            if (dragStartX !== null) {
                setDragCurrentX(relativeX);
                hideTooltip();
                return;
            }
            if (sortedXValues.length === 0) return;
            const dataX = xScale.invert(relativeX);
            let nearest = sortedXValues[0];
            let nearestDistance = Math.abs(dataX - nearest);
            for (const candidate of sortedXValues) {
                const distance = Math.abs(dataX - candidate);
                if (distance < nearestDistance) {
                    nearest = candidate;
                    nearestDistance = distance;
                }
            }
            const rows = series.map((single, index) => ({
                seriesName: single.name,
                value: valueLookups[index].get(nearest) ?? null,
                colorIndex: single.colorIndex ?? index,
            }));
            showTooltip({
                tooltipData: { xValue: nearest, rows },
                tooltipLeft: MARGIN.left + xScale(nearest),
                tooltipTop: MARGIN.top,
            });
        },
        [
            series,
            sortedXValues,
            valueLookups,
            xScale,
            showTooltip,
            dragStartX,
            hideTooltip,
            innerWidth,
        ],
    );

    const handleMouseDown = useCallback(
        (event: React.MouseEvent<SVGRectElement>) => {
            if (!onZoom) return;
            const point = localPoint(event);
            if (!point) return;
            const relativeX = clamp(point.x - MARGIN.left, 0, innerWidth);
            setDragStartX(relativeX);
            setDragCurrentX(relativeX);
            hideTooltip();
        },
        [onZoom, hideTooltip, innerWidth],
    );

    const handleMouseUp = useCallback(() => {
        if (dragStartX === null || dragCurrentX === null || !onZoom) {
            setDragStartX(null);
            setDragCurrentX(null);
            return;
        }
        const clampedStart = clamp(dragStartX, 0, innerWidth);
        const clampedCurrent = clamp(dragCurrentX, 0, innerWidth);
        const xValueA = xScale.invert(clampedStart);
        const xValueB = xScale.invert(clampedCurrent);
        const lower = Math.min(xValueA, xValueB);
        const upper = Math.max(xValueA, xValueB);
        if (upper - lower >= 1) {
            onZoom([Math.round(lower), Math.round(upper)]);
        }
        setDragStartX(null);
        setDragCurrentX(null);
    }, [dragStartX, dragCurrentX, onZoom, xScale, innerWidth]);

    const handleMouseLeave = useCallback(() => {
        hideTooltip();
        setDragStartX(null);
        setDragCurrentX(null);
    }, [hideTooltip]);

    const handleDoubleClick = useCallback(() => {
        setDragStartX(null);
        setDragCurrentX(null);
        if (onResetZoom) onResetZoom();
    }, [onResetZoom]);

    if (innerWidth <= 0 || innerHeight <= 0) {
        return null;
    }

    const crosshairX = tooltipData ? xScale(tooltipData.xValue) : null;

    return (
        <>
            <svg
                ref={containerRef}
                width={width}
                height={height}
                style={{ overflow: "visible" }}
            >
                <defs>
                    <clipPath id={clipPathId}>
                        <rect
                            x={0}
                            y={0}
                            width={innerWidth}
                            height={innerHeight}
                        />
                    </clipPath>
                </defs>
                <Group left={MARGIN.left} top={MARGIN.top}>
                    <GridRows
                        scale={yScale}
                        width={innerWidth}
                        stroke={CHART_GRID_COLOR}
                        strokeDasharray="2,2"
                        numTicks={5}
                    />
                    <Group clipPath={`url(#${clipPathId})`}>
                    {series.map((single, seriesIndex) => {
                        const colorIndex = single.colorIndex ?? seriesIndex;
                        const colour = chartColor(colorIndex);
                        const cycle = Math.floor(colorIndex / 6);
                        const dashArray =
                            cycle === 0 ? undefined : cycle === 1 ? "6,4" : "2,3";
                        return (
                            <Group key={single.name}>
                                <LinePath<LineChartPoint>
                                    data={single.data}
                                    x={(point) => xScale(point.x)}
                                    y={(point) => yScale(point.y)}
                                    stroke={colour}
                                    strokeWidth={1.75}
                                    strokeDasharray={dashArray}
                                    curve={curveMonotoneX}
                                />
                                {single.data.map((point) => (
                                    <Circle
                                        key={`${single.name}-${point.x}`}
                                        cx={xScale(point.x)}
                                        cy={yScale(point.y)}
                                        r={2.5}
                                        fill={colour}
                                        stroke="#F5F1E8"
                                        strokeWidth={1}
                                        style={{ pointerEvents: "none" }}
                                    />
                                ))}
                            </Group>
                        );
                    })}

                    {crosshairX !== null && tooltipData ? (
                        <>
                            <Line
                                from={{ x: crosshairX, y: 0 }}
                                to={{ x: crosshairX, y: innerHeight }}
                                stroke={CHART_AXIS_COLOR}
                                strokeWidth={1}
                                strokeDasharray="2,3"
                                pointerEvents="none"
                            />
                            {tooltipData.rows.map((row) =>
                                row.value === null ? null : (
                                    <Circle
                                        key={row.seriesName}
                                        cx={crosshairX}
                                        cy={yScale(row.value)}
                                        r={5}
                                        fill={chartColor(row.colorIndex)}
                                        stroke="#F5F1E8"
                                        strokeWidth={2}
                                        pointerEvents="none"
                                    />
                                ),
                            )}
                        </>
                    ) : null}
                    </Group>

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

                    {isDragging && dragStartX !== null && dragCurrentX !== null ? (
                        <g clipPath={`url(#${clipPathId})`}>
                            <rect
                                x={clamp(Math.min(dragStartX, dragCurrentX), 0, innerWidth)}
                                y={0}
                                width={clamp(
                                    Math.abs(dragCurrentX - dragStartX),
                                    0,
                                    innerWidth -
                                        clamp(
                                            Math.min(dragStartX, dragCurrentX),
                                            0,
                                            innerWidth,
                                        ),
                                )}
                                height={innerHeight}
                                fill="#14213D"
                                fillOpacity={0.08}
                                stroke="#14213D"
                                strokeOpacity={0.3}
                                strokeDasharray="2,2"
                                pointerEvents="none"
                            />
                        </g>
                    ) : null}

                    <Bar
                        x={0}
                        y={0}
                        width={innerWidth}
                        height={innerHeight}
                        fill="transparent"
                        onMouseMove={handleMouseMove}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onDoubleClick={handleDoubleClick}
                        style={onZoom ? { cursor: "crosshair" } : undefined}
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
                                    {row.value === null ? "—" : formatY(row.value)}
                                </strong>
                            </div>
                        ))}
                    </div>
                </TooltipInPortal>
            ) : null}
        </>
    );
}
