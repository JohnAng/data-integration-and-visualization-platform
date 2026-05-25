/**
 * Heatmap — two-dimensional grid with a single navy gradient encoding
 * the magnitude of a numeric value per (row, column) cell. Used to
 * visualise article density per subject area × year and per Field of
 * Research × year on the /charts playground.
 */
import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { defaultStyles, useTooltip, useTooltipInPortal } from "@visx/tooltip";
import type React from "react";
import { useCallback, useMemo } from "react";

import {
    CHART_AXIS_COLOR,
    CHART_LABEL_COLOR,
} from "./colorScale";

export interface HeatmapCell {
    row: string;
    column: string | number;
    value: number;
}

interface HeatmapProps {
    cells: HeatmapCell[];
    width: number;
    height: number;
    xLabel?: string;
    yLabel?: string;
    formatValue?: (value: number) => string;
    formatColumn?: (value: string | number) => string;
}

const MARGIN = { top: 16, right: 24, bottom: 72, left: 220 };

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

const COLOR_LOW = "#F5F1E8";
const COLOR_HIGH = "#14213D";

interface TooltipDatum extends HeatmapCell {}

/**
 * Categorical heatmap rendered as a band-scaled grid of rectangles.
 *
 * Cells with value zero render as the lightest paper colour, the highest
 * value renders as deep navy, and intermediate values interpolate
 * linearly between the two endpoints. A generous full-area mouse
 * overlay snaps to the nearest cell so analysts can hover anywhere on
 * the chart instead of trying to land inside narrow rectangles.
 */
export function Heatmap({
    cells,
    width,
    height,
    xLabel,
    yLabel,
    formatValue = (value) => value.toLocaleString(),
    formatColumn = (value) => String(value),
}: HeatmapProps) {
    const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
    const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

    const rowDomain = useMemo(() => {
        const collected: string[] = [];
        const seen = new Set<string>();
        for (const cell of cells) {
            if (!seen.has(cell.row)) {
                seen.add(cell.row);
                collected.push(cell.row);
            }
        }
        return collected;
    }, [cells]);

    const columnDomain = useMemo(() => {
        const collected: (string | number)[] = [];
        const seen = new Set<string | number>();
        for (const cell of cells) {
            if (!seen.has(cell.column)) {
                seen.add(cell.column);
                collected.push(cell.column);
            }
        }
        collected.sort((a, b) => {
            if (typeof a === "number" && typeof b === "number") return a - b;
            return String(a).localeCompare(String(b));
        });
        return collected;
    }, [cells]);

    const maxValue = useMemo(
        () => cells.reduce((current, cell) => Math.max(current, cell.value), 0),
        [cells],
    );

    const columnScale = useMemo(
        () =>
            scaleBand<string | number>({
                domain: columnDomain,
                range: [0, innerWidth],
                padding: 0.04,
            }),
        [columnDomain, innerWidth],
    );

    const rowScale = useMemo(
        () =>
            scaleBand<string>({
                domain: rowDomain,
                range: [0, innerHeight],
                padding: 0.04,
            }),
        [rowDomain, innerHeight],
    );

    const colorScale = useMemo(
        () =>
            scaleLinear<string>({
                domain: [0, maxValue || 1],
                range: [COLOR_LOW, COLOR_HIGH],
            }),
        [maxValue],
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

    const cellByKey = useMemo(() => {
        const map = new Map<string, HeatmapCell>();
        for (const cell of cells) {
            map.set(`${cell.row}::${cell.column}`, cell);
        }
        return map;
    }, [cells]);

    const handleMouseMove = useCallback(
        (event: React.MouseEvent<SVGRectElement>) => {
            const point = localPoint(event);
            if (!point) return;
            const relativeX = point.x - MARGIN.left;
            const relativeY = point.y - MARGIN.top;
            const columnIndex = Math.floor(
                (relativeX / innerWidth) * columnDomain.length,
            );
            const rowIndex = Math.floor(
                (relativeY / innerHeight) * rowDomain.length,
            );
            if (
                columnIndex < 0 ||
                columnIndex >= columnDomain.length ||
                rowIndex < 0 ||
                rowIndex >= rowDomain.length
            ) {
                hideTooltip();
                return;
            }
            const row = rowDomain[rowIndex];
            const column = columnDomain[columnIndex];
            const cell =
                cellByKey.get(`${row}::${column}`) ?? { row, column, value: 0 };
            showTooltip({
                tooltipData: cell,
                tooltipLeft: MARGIN.left + (columnScale(column) ?? 0) + columnScale.bandwidth() / 2,
                tooltipTop: MARGIN.top + (rowScale(row) ?? 0) + rowScale.bandwidth() / 2,
            });
        },
        [
            innerWidth,
            innerHeight,
            columnDomain,
            rowDomain,
            cellByKey,
            columnScale,
            rowScale,
            showTooltip,
            hideTooltip,
        ],
    );

    if (innerWidth <= 0 || innerHeight <= 0 || cells.length === 0) {
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
                    {rowDomain.map((row) => {
                        const yPosition = rowScale(row) ?? 0;
                        return columnDomain.map((column) => {
                            const cell = cellByKey.get(`${row}::${column}`);
                            const value = cell?.value ?? 0;
                            const xPosition = columnScale(column) ?? 0;
                            return (
                                <Bar
                                    key={`${row}::${column}`}
                                    x={xPosition}
                                    y={yPosition}
                                    width={columnScale.bandwidth()}
                                    height={rowScale.bandwidth()}
                                    fill={value > 0 ? colorScale(value) : COLOR_LOW}
                                    stroke="#F5F1E8"
                                    strokeWidth={0.5}
                                    pointerEvents="none"
                                />
                            );
                        });
                    })}

                    <AxisBottom
                        top={innerHeight}
                        scale={columnScale}
                        stroke={CHART_AXIS_COLOR}
                        tickStroke={CHART_AXIS_COLOR}
                        tickFormat={(value) => formatColumn(value)}
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
                            dy: 52,
                        }}
                    />
                    <AxisLeft
                        scale={rowScale}
                        stroke={CHART_AXIS_COLOR}
                        tickStroke={CHART_AXIS_COLOR}
                        tickFormat={(value) => String(value)}
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
                            dx: -140,
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
                    <div className="text-caption uppercase tracking-wide text-smoke mb-1">
                        {tooltipData.row}
                    </div>
                    <div className="font-mono tabular-nums text-slate">
                        {formatColumn(tooltipData.column)}:{" "}
                        <span className="text-ink">
                            {formatValue(tooltipData.value)}
                        </span>
                    </div>
                </TooltipInPortal>
            ) : null}
        </>
    );
}
