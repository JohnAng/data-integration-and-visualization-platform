/**
 * Charts playground route ("/charts") — sidebar picker selects one of
 * twelve chart variants (Line / Bar / Scatter / Heatmap / StackedArea /
 * HorizontalBarChart) and the right column renders it. Filters are
 * Zod-validated search params so URL is the single source of truth.
 *
 * NOTE: this file is large because it owns the configuration of every
 * variant. A "split chart variants into separate files" entry exists
 * in docs/REFACTOR.md and is scheduled for the last-minute-refactoring
 * branch after the submission window.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";

import {
    useAuthorsVsArticlesChart,
    useCorpusTotals,
    useFieldOfResearchYearlyChart,
    useFilterOptions,
    useJournalMetricsChart,
    usePublisherQuartileChart,
    useSubjectAreaYearlyChart,
    useVenueComparisonChart,
    useVenueMetricsChart,
    useYearSummaries,
} from "../api/queries";
import { BarChart, type BarGroupDatum } from "../components/charts/BarChart";
import { ChartFrame } from "../components/charts/ChartFrame";
import { Heatmap, type HeatmapCell } from "../components/charts/Heatmap";
import {
    HorizontalBarChart,
    type HorizontalBarDatum,
} from "../components/charts/HorizontalBarChart";
import { InteractiveLegend } from "../components/charts/InteractiveLegend";
import { LineChart, type LineChartSeries } from "../components/charts/LineChart";
import {
    StackedArea,
    type StackedAreaPoint,
    type StackedAreaSeries,
} from "../components/charts/StackedArea";
import {
    ScatterPlot,
    type ScatterPoint,
} from "../components/charts/ScatterPlot";
import { CheckboxList, type CheckboxListOption } from "../components/filters/CheckboxList";
import { SelectFilter } from "../components/filters/SelectFilter";
import { VenuePicker } from "../components/filters/VenuePicker";
import { YearRangeFilter } from "../components/filters/YearRangeFilter";
import { AppShell, PageContainer } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { formatThousands } from "../lib/formatNumber";

const CHART_TYPES = [
    { value: "subject_area_yearly", label: "Line · subject area yearly" },
    { value: "for_yearly", label: "Line · Field of Research yearly" },
    { value: "venue_comparison", label: "Line · venue comparison" },
    { value: "publisher_quartile", label: "Bar · publisher quartile" },
    { value: "venue_metrics", label: "Bar · venue metrics" },
    { value: "authors_vs_articles", label: "Scatter · authors vs articles" },
    { value: "journal_metrics", label: "Scatter · journal metrics" },
    { value: "subject_area_heatmap", label: "Heatmap · subject area × year" },
    { value: "for_heatmap", label: "Heatmap · Field of Research × year" },
    { value: "publication_composition", label: "Stacked area · publication composition" },
    { value: "cumulative_growth", label: "Line · cumulative corpus growth" },
    { value: "top_publishers", label: "Bar · top publishers (horizontal)" },
] as const;

type ChartType = (typeof CHART_TYPES)[number]["value"];

const VENUE_COMPARISON_METRICS = [
    { value: "articles_count", label: "Articles" },
    { value: "distinct_authors", label: "Distinct authors" },
    { value: "total_authors", label: "Total authorships" },
] as const;

type VenueComparisonMetric = (typeof VENUE_COMPARISON_METRICS)[number]["value"];

const SERIES_VOLUME_METRICS = [
    { value: "articles_count", label: "Articles" },
    { value: "distinct_venues", label: "Distinct venues" },
] as const;

type SeriesVolumeMetric = (typeof SERIES_VOLUME_METRICS)[number]["value"];

const JOURNAL_METRIC_AXIS_OPTIONS = [
    { value: "total_documents", label: "Total documents", format: "thousands" },
    { value: "total_documents_3y", label: "Documents (3y)", format: "thousands" },
    { value: "total_references", label: "Total references", format: "thousands" },
    { value: "total_citations_3y", label: "Citations (3y)", format: "thousands" },
    { value: "citable_documents_3y", label: "Citable docs (3y)", format: "thousands" },
    { value: "citations_per_document_2y", label: "Cites / doc (2y)", format: "decimal" },
    { value: "references_per_document", label: "Refs / doc", format: "decimal" },
    { value: "sjr_index", label: "SJR index", format: "decimal" },
    { value: "citation_score", label: "Citation score", format: "decimal" },
    { value: "h_index", label: "H-index", format: "thousands" },
] as const;

type JournalMetricAxis = (typeof JOURNAL_METRIC_AXIS_OPTIONS)[number]["value"];

const JOURNAL_METRIC_AXIS_VALUES = JOURNAL_METRIC_AXIS_OPTIONS.map((o) => o.value) as [
    JournalMetricAxis,
    ...JournalMetricAxis[],
];

const chartsSearchSchema = z.object({
    chart: z
        .enum([
            "subject_area_yearly",
            "for_yearly",
            "venue_comparison",
            "publisher_quartile",
            "venue_metrics",
            "authors_vs_articles",
            "journal_metrics",
            "subject_area_heatmap",
            "for_heatmap",
            "publication_composition",
            "cumulative_growth",
            "top_publishers",
        ])
        .default("subject_area_yearly"),
    subject_area: z.string().optional(),
    subject_areas: z.string().optional(),
    primary_for: z.string().optional(),
    primary_fors: z.string().optional(),
    venue_type: z.enum(["journal", "conference"]).default("conference"),
    venue_ids: z.string().optional(),
    quartile: z.enum(["Q1", "Q2", "Q3", "Q4"]).optional(),
    start_year: z.coerce.number().int().min(1900).max(2100).optional(),
    end_year: z.coerce.number().int().min(1900).max(2100).optional(),
    granularity: z.enum(["year", "five_year", "decade"]).default("year"),
    venue_y_metric: z
        .enum(["articles_count", "distinct_authors", "total_authors"])
        .default("articles_count"),
    series_y_metric: z
        .enum(["articles_count", "distinct_venues"])
        .default("articles_count"),
    scatter_x: z.enum(JOURNAL_METRIC_AXIS_VALUES).default("total_documents"),
    scatter_y: z.enum(JOURNAL_METRIC_AXIS_VALUES).default("citations_per_document_2y"),
    scatter_size: z.enum(JOURNAL_METRIC_AXIS_VALUES).optional(),
    scatter_x_scale: z.enum(["linear", "log"]).default("linear"),
    scatter_y_scale: z.enum(["linear", "log"]).default("linear"),
    scatter_color_by: z
        .enum(["none", "best_quartile", "best_subject_area", "publisher"])
        .default("best_quartile"),
    minimum_articles: z.coerce.number().int().min(0).max(100_000).default(0),
    publisher: z.string().optional(),
});

export const Route = createFileRoute("/charts")({
    component: ChartsPage,
    validateSearch: (search) => chartsSearchSchema.parse(search),
});

function ChartsPage() {
    const search = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });

    const totalsQuery = useCorpusTotals();
    const yearsQuery = useYearSummaries({});
    // /api/years returns rows already trimmed of any partial last year,
    // so the last row's year is the latest complete year in the corpus.
    const corpusYears = {
        earliest: totalsQuery.data?.earliest_year ?? undefined,
        latestComplete:
            (yearsQuery.data?.length ?? 0) > 0
                ? yearsQuery.data![yearsQuery.data!.length - 1].year
                : (totalsQuery.data?.latest_year ?? undefined),
    };

    const setSearch = (updates: Partial<typeof search>) =>
        navigate({
            search: (previous) => ({ ...previous, ...updates }),
            replace: true,
            resetScroll: false,
        });

    const reset = () =>
        navigate({
            search: () => ({
                chart: search.chart,
                venue_type: "conference",
                venue_y_metric: "articles_count",
                series_y_metric: "articles_count",
                scatter_x: "total_documents",
                scatter_y: "citations_per_document_2y",
                scatter_x_scale: "linear",
                scatter_y_scale: "linear",
                scatter_color_by: "best_quartile",
                minimum_articles: 0,
                granularity: "year",
            }),
            replace: true,
            resetScroll: false,
        });

    return (
        <AppShell>
            <PageContainer width="wide">
                <PageHeader
                    eyebrow="Charts"
                    title="Visualization playground"
                    lede="Switch between the chart families and tune the filters in the sidebar. Every dataset comes from a single backend endpoint; the UI is a thin rendering surface."
                />

                <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
                    <ChartSidebar
                        search={search}
                        onChange={setSearch}
                        onReset={reset}
                        corpusYears={corpusYears}
                    />

                    <div className="min-w-0">
                        <ChartRenderer
                            search={search}
                            corpusYears={corpusYears}
                        />
                    </div>
                </div>
            </PageContainer>
        </AppShell>
    );
}

interface SidebarProps {
    search: ReturnType<typeof Route.useSearch>;
    onChange: (updates: Partial<ReturnType<typeof Route.useSearch>>) => void;
    onReset: () => void;
    corpusYears: { earliest: number | undefined; latestComplete: number | undefined };
}

function ChartSidebar({ search, onChange, onReset, corpusYears }: SidebarProps) {
    const optionsQuery = useFilterOptions();
    const subjectAreas = optionsQuery.data?.subject_areas ?? [];
    const fieldsOfResearch = optionsQuery.data?.fields_of_research ?? [];

    const selectedVenueIds = useMemo(() => {
        if (!search.venue_ids) return [];
        return search.venue_ids
            .split(/[,\s]+/)
            .map((token) => Number.parseInt(token, 10))
            .filter((value) => Number.isFinite(value) && value > 0);
    }, [search.venue_ids]);

    const updateVenueIds = (next: number[]) =>
        onChange({ venue_ids: next.length ? next.join(",") : undefined });

    const selectedSubjectAreas = useMemo(
        () =>
            (search.subject_areas ?? "")
                .split(/\|/)
                .map((token) => token.trim())
                .filter((token) => token.length > 0),
        [search.subject_areas],
    );

    const selectedPrimaryFors = useMemo(
        () =>
            (search.primary_fors ?? "")
                .split(/[,\s]+/)
                .map((token) => token.trim())
                .filter((token) => token.length > 0),
        [search.primary_fors],
    );

    const updateSubjectAreas = (next: string[]) =>
        onChange({ subject_areas: next.length ? next.join("|") : undefined });

    const updatePrimaryFors = (next: string[]) =>
        onChange({ primary_fors: next.length ? next.join(",") : undefined });

    const subjectAreaOptions: CheckboxListOption[] = subjectAreas.map((value) => ({
        value,
        label: value,
    }));

    const fieldOfResearchOptions: CheckboxListOption[] = fieldsOfResearch.map(
        (entry) => ({
            value: entry.code,
            label: entry.description ?? entry.code,
            secondary: `Code ${entry.code}`,
        }),
    );

    return (
        <Card className="self-start sticky top-24">
            <p className="text-caption uppercase tracking-wide text-smoke mb-3">
                Data set
            </p>
            <SelectFilter
                value={search.chart}
                onChange={(value) => onChange({ chart: value as ChartType })}
                options={CHART_TYPES.map((c) => ({ value: c.value, label: c.label }))}
                placeholder="Pick a chart"
                ariaLabel="Chart type"
                className="mb-6"
            />

            {(search.chart === "subject_area_yearly" ||
                search.chart === "subject_area_heatmap") && (
                <FilterRow label="Subject areas (leave empty for top-N)">
                    <CheckboxList
                        options={subjectAreaOptions}
                        selected={selectedSubjectAreas}
                        onChange={updateSubjectAreas}
                        searchPlaceholder="Filter subject areas…"
                        isLoading={optionsQuery.isPending}
                        emptyMessage="No subject areas match that filter."
                    />
                </FilterRow>
            )}

            {search.chart === "journal_metrics" && (
                <FilterRow label="Subject area">
                    <SelectFilter
                        value={search.subject_area}
                        onChange={(value) =>
                            onChange({ subject_area: value || undefined })
                        }
                        options={subjectAreas.map((value) => ({
                            value,
                            label: value,
                        }))}
                        placeholder="All subject areas"
                        ariaLabel="Filter by subject area"
                    />
                </FilterRow>
            )}

            {(search.chart === "for_yearly" || search.chart === "for_heatmap") && (
                <FilterRow label="Fields of Research (leave empty for top-N)">
                    <CheckboxList
                        options={fieldOfResearchOptions}
                        selected={selectedPrimaryFors}
                        onChange={updatePrimaryFors}
                        searchPlaceholder="Filter by code or description…"
                        isLoading={optionsQuery.isPending}
                        emptyMessage="No Fields of Research match that filter."
                    />
                </FilterRow>
            )}

            {showsVenueSelection(search.chart) && (
                <>
                    <FilterRow label="Venue type">
                        <SelectFilter
                            value={search.venue_type}
                            onChange={(value) =>
                                onChange({
                                    venue_type: (value as "journal" | "conference") ?? "conference",
                                    venue_ids: undefined,
                                })
                            }
                            options={[
                                { value: "journal", label: "Journals" },
                                { value: "conference", label: "Conferences" },
                            ]}
                            placeholder="Conferences"
                        />
                    </FilterRow>
                    {showsVenueIds(search.chart) && (
                        <FilterRow label="Pick venues (up to 20)">
                            <VenuePicker
                                venueType={search.venue_type}
                                selected={selectedVenueIds}
                                onChange={updateVenueIds}
                                maximumSelections={20}
                            />
                        </FilterRow>
                    )}
                </>
            )}

            {showsQuartile(search.chart) && (
                <FilterRow label="Quartile">
                    <SelectFilter
                        value={search.quartile}
                        onChange={(value) =>
                            onChange({
                                quartile: value as "Q1" | "Q2" | "Q3" | "Q4" | undefined,
                            })
                        }
                        options={[
                            { value: "Q1", label: "Q1" },
                            { value: "Q2", label: "Q2" },
                            { value: "Q3", label: "Q3" },
                            { value: "Q4", label: "Q4" },
                        ]}
                        placeholder="All quartiles"
                    />
                </FilterRow>
            )}

            {showsYearRange(search.chart) && (
                <>
                    <FilterRow label="Year range">
                        <YearRangeFilter
                            startYear={search.start_year ?? corpusYears.earliest}
                            endYear={search.end_year ?? corpusYears.latestComplete}
                            minYear={corpusYears.earliest}
                            maxYear={corpusYears.latestComplete}
                            onApply={(range) =>
                                onChange({
                                    start_year: range.startYear,
                                    end_year: range.endYear,
                                })
                            }
                        />
                    </FilterRow>
                    <FilterRow label="Time granularity">
                        <SelectFilter
                            value={search.granularity}
                            onChange={(value) =>
                                onChange({
                                    granularity:
                                        (value as
                                            | "year"
                                            | "five_year"
                                            | "decade") ?? "year",
                                })
                            }
                            options={[
                                { value: "year", label: "Per year" },
                                { value: "five_year", label: "Per 5-year bucket" },
                                { value: "decade", label: "Per decade" },
                            ]}
                            placeholder="Per year"
                        />
                    </FilterRow>
                </>
            )}

            {search.chart === "venue_comparison" && (
                <FilterRow label="Y-axis metric">
                    <SelectFilter
                        value={search.venue_y_metric}
                        onChange={(value) =>
                            onChange({
                                venue_y_metric:
                                    (value as VenueComparisonMetric) ?? "articles_count",
                            })
                        }
                        options={VENUE_COMPARISON_METRICS.map((m) => ({
                            value: m.value,
                            label: m.label,
                        }))}
                        placeholder="Articles"
                    />
                </FilterRow>
            )}

            {(search.chart === "subject_area_yearly" ||
                search.chart === "for_yearly") && (
                <FilterRow label="Y-axis metric">
                    <SelectFilter
                        value={search.series_y_metric}
                        onChange={(value) =>
                            onChange({
                                series_y_metric:
                                    (value as SeriesVolumeMetric) ?? "articles_count",
                            })
                        }
                        options={[
                            { value: "articles_count", label: "Articles" },
                            {
                                value: "distinct_venues",
                                label:
                                    search.chart === "subject_area_yearly"
                                        ? "Distinct journals"
                                        : "Distinct conferences",
                            },
                        ]}
                        placeholder="Articles"
                    />
                </FilterRow>
            )}

            {search.chart === "journal_metrics" && (
                <>
                    <FilterRow label="X-axis metric">
                        <SelectFilter
                            value={search.scatter_x}
                            onChange={(value) =>
                                onChange({
                                    scatter_x:
                                        (value as JournalMetricAxis) ?? "total_documents",
                                })
                            }
                            options={JOURNAL_METRIC_AXIS_OPTIONS.map((o) => ({
                                value: o.value,
                                label: o.label,
                            }))}
                            placeholder="Total documents"
                        />
                    </FilterRow>
                    <FilterRow label="Y-axis metric">
                        <SelectFilter
                            value={search.scatter_y}
                            onChange={(value) =>
                                onChange({
                                    scatter_y:
                                        (value as JournalMetricAxis) ??
                                        "citations_per_document_2y",
                                })
                            }
                            options={JOURNAL_METRIC_AXIS_OPTIONS.map((o) => ({
                                value: o.value,
                                label: o.label,
                            }))}
                            placeholder="Cites / doc (2y)"
                        />
                    </FilterRow>
                    <FilterRow label="Point size (optional)">
                        <SelectFilter
                            value={search.scatter_size}
                            onChange={(value) =>
                                onChange({
                                    scatter_size: value
                                        ? (value as JournalMetricAxis)
                                        : undefined,
                                })
                            }
                            options={JOURNAL_METRIC_AXIS_OPTIONS.map((o) => ({
                                value: o.value,
                                label: o.label,
                            }))}
                            placeholder="Uniform size"
                        />
                    </FilterRow>
                    <FilterRow label="Colour points by">
                        <SelectFilter
                            value={search.scatter_color_by}
                            onChange={(value) =>
                                onChange({
                                    scatter_color_by:
                                        (value as typeof search.scatter_color_by) ??
                                        "best_quartile",
                                })
                            }
                            options={[
                                { value: "best_quartile", label: "Quartile" },
                                { value: "best_subject_area", label: "Subject area" },
                                { value: "publisher", label: "Publisher" },
                                { value: "none", label: "No colour grouping" },
                            ]}
                            placeholder="Quartile"
                        />
                    </FilterRow>
                </>
            )}

            {(search.chart === "journal_metrics" ||
                search.chart === "authors_vs_articles") && (
                <>
                    <FilterRow label="X-axis scale">
                        <SelectFilter
                            value={search.scatter_x_scale}
                            onChange={(value) =>
                                onChange({
                                    scatter_x_scale:
                                        (value as "linear" | "log") ?? "linear",
                                })
                            }
                            options={[
                                { value: "linear", label: "Linear" },
                                { value: "log", label: "Logarithmic" },
                            ]}
                            placeholder="Linear"
                        />
                    </FilterRow>
                    <FilterRow label="Y-axis scale">
                        <SelectFilter
                            value={search.scatter_y_scale}
                            onChange={(value) =>
                                onChange({
                                    scatter_y_scale:
                                        (value as "linear" | "log") ?? "linear",
                                })
                            }
                            options={[
                                { value: "linear", label: "Linear" },
                                { value: "log", label: "Logarithmic" },
                            ]}
                            placeholder="Linear"
                        />
                    </FilterRow>
                </>
            )}

            {search.chart === "authors_vs_articles" && (
                <FilterRow label="Minimum total articles">
                    <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={5}
                        value={search.minimum_articles}
                        onChange={(event) => {
                            const next = Number.parseInt(event.target.value, 10);
                            onChange({
                                minimum_articles: Number.isFinite(next) && next > 0 ? next : 0,
                            });
                        }}
                        className="h-10 w-full px-3 bg-cream border border-hairline rounded-sm font-mono tabular-nums text-body text-ink hover:border-smoke focus-visible:border-ochre focus-visible:outline-none"
                    />
                </FilterRow>
            )}

            <Button
                type="button"
                variant="tertiary"
                size="sm"
                onClick={onReset}
                className="px-0"
            >
                Reset filters
            </Button>
        </Card>
    );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <p className="text-caption uppercase tracking-wide text-smoke mb-2">
                {label}
            </p>
            {children}
        </div>
    );
}

interface RendererProps {
    search: ReturnType<typeof Route.useSearch>;
    corpusYears: { earliest: number | undefined; latestComplete: number | undefined };
}

function ChartRenderer({ search, corpusYears }: RendererProps) {
    switch (search.chart) {
        case "subject_area_yearly":
            return (
                <SubjectAreaYearlyChart
                    search={search}
                    corpusYears={corpusYears}
                />
            );
        case "for_yearly":
            return (
                <FieldOfResearchYearlyChart
                    search={search}
                    corpusYears={corpusYears}
                />
            );
        case "venue_comparison":
            return (
                <VenueComparisonChart
                    search={search}
                    corpusYears={corpusYears}
                />
            );
        case "publisher_quartile":
            return <PublisherQuartileBars />;
        case "venue_metrics":
            return <VenueMetricsChart search={search} />;
        case "authors_vs_articles":
            return <AuthorsVsArticlesScatter search={search} />;
        case "journal_metrics":
            return <JournalMetricsScatter search={search} />;
        case "subject_area_heatmap":
            return (
                <SubjectAreaHeatmap search={search} corpusYears={corpusYears} />
            );
        case "for_heatmap":
            return (
                <FieldOfResearchHeatmap search={search} corpusYears={corpusYears} />
            );
        case "publication_composition":
            return <PublicationCompositionChart />;
        case "cumulative_growth":
            return <CumulativeGrowthChart />;
        case "top_publishers":
            return <TopPublishersChart />;
    }
}

const MAX_SERIES = 10;

function rankSeriesByTotal(series: LineChartSeries[]): LineChartSeries[] {
    const ranked = [...series].sort((a, b) => totalOfSeries(b) - totalOfSeries(a));
    return ranked
        .slice(0, MAX_SERIES)
        .map((entry, index) => ({ ...entry, colorIndex: index }));
}

function totalOfSeries(series: LineChartSeries): number {
    return series.data.reduce((sum, point) => sum + point.y, 0);
}

function SubjectAreaYearlyChart({ search, corpusYears }: RendererProps) {
    const effectiveEndYear = search.end_year ?? corpusYears.latestComplete;
    const subjectAreas = (search.subject_areas ?? "")
        .split(/\|/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
    const query = useSubjectAreaYearlyChart({
        subject_areas: subjectAreas.length ? subjectAreas : undefined,
        start_year: search.start_year,
        end_year: effectiveEndYear,
        granularity: search.granularity,
    });
    const metric = search.series_y_metric;
    const yLabel = metric === "distinct_venues" ? "Distinct journals" : "Articles";
    const { visibleSeries, totalSeries } = useMemo(() => {
        const rows = query.data ?? [];
        const grouped = new Map<string, { x: number; y: number }[]>();
        for (const row of rows) {
            if (!grouped.has(row.best_subject_area)) {
                grouped.set(row.best_subject_area, []);
            }
            const y =
                metric === "distinct_venues" ? row.distinct_journals : row.articles_count;
            grouped.get(row.best_subject_area)!.push({ x: row.year, y });
        }
        const rawSeries: LineChartSeries[] = Array.from(grouped.entries()).map(
            ([name, data]) => ({
                name,
                data: data.sort((a, b) => a.x - b.x),
                colorIndex: 0,
            }),
        );
        const ranked =
            subjectAreas.length > 0 || rawSeries.length <= MAX_SERIES
                ? rawSeries.map((entry, index) => ({ ...entry, colorIndex: index }))
                : rankSeriesByTotal(rawSeries);
        return { visibleSeries: ranked, totalSeries: rawSeries.length };
    }, [query.data, subjectAreas, metric]);

    const truncated = totalSeries > visibleSeries.length;
    const metricLabel = metric === "distinct_venues" ? "distinct journals" : "articles";

    const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
    const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
    const renderedSeries = useMemo(
        () => visibleSeries.filter((entry) => !hiddenSeries.has(entry.name)),
        [visibleSeries, hiddenSeries],
    );

    const granularityLabel =
        search.granularity === "decade"
            ? "decade"
            : search.granularity === "five_year"
              ? "5-year bucket"
              : "year";

    return (
        <ChartFrame
            title="Subject area yearly summary"
            height={460}
            isLoading={query.isPending}
            isEmpty={visibleSeries.length === 0}
            caption={
                truncated
                    ? `Showing the ${visibleSeries.length} subject areas with the highest total ${metricLabel} per ${granularityLabel} in this range (${totalSeries} total). Drag on the chart to zoom in; click legend items to toggle. Tick checkboxes in the sidebar to drill into specific areas.`
                    : `Per-${granularityLabel} ${metricLabel} per Kaggle subject area. Drag on the chart to zoom in; click legend items to toggle.`
            }
            footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <InteractiveLegend
                        items={visibleSeries.map((entry, index) => ({
                            key: entry.name,
                            label: entry.name,
                            colorIndex: entry.colorIndex ?? index,
                        }))}
                        hidden={hiddenSeries}
                        onToggle={(key) =>
                            setHiddenSeries((current) => {
                                const next = new Set(current);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                            })
                        }
                        onShowAll={() => setHiddenSeries(new Set())}
                        onShowOnly={(key) =>
                            setHiddenSeries(
                                new Set(
                                    visibleSeries
                                        .map((entry) => entry.name)
                                        .filter((name) => name !== key),
                                ),
                            )
                        }
                    />
                    {zoomDomain ? (
                        <div className="flex items-center gap-2 text-caption">
                            <span className="uppercase tracking-wide text-smoke">
                                Zoomed
                            </span>
                            <span className="font-mono tabular-nums text-ink">
                                {zoomDomain[0]} – {zoomDomain[1]}
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoomDomain(null)}
                                className="ml-1 px-2 py-0.5 border border-hairline rounded-sm bg-cream text-ink hover:bg-linen hover:border-ochre transition-colors duration-100"
                            >
                                Reset
                            </button>
                        </div>
                    ) : (
                        <span className="text-caption uppercase tracking-wide text-smoke">
                            Drag to zoom · Double-click to reset
                        </span>
                    )}
                </div>
            }
        >
            {({ width, height }) => (
                <LineChart
                    width={width}
                    height={height}
                    xLabel="Year"
                    yLabel={yLabel}
                    series={renderedSeries}
                    zoomDomain={zoomDomain}
                    onZoom={setZoomDomain}
                    onResetZoom={() => setZoomDomain(null)}
                />
            )}
        </ChartFrame>
    );
}

function FieldOfResearchYearlyChart({ search, corpusYears }: RendererProps) {
    const effectiveEndYear = search.end_year ?? corpusYears.latestComplete;
    const primaryFors = (search.primary_fors ?? "")
        .split(/[,\s]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
    const query = useFieldOfResearchYearlyChart({
        primary_fors: primaryFors.length ? primaryFors : undefined,
        start_year: search.start_year,
        end_year: effectiveEndYear,
        granularity: search.granularity,
    });
    const metric = search.series_y_metric;
    const yLabel = metric === "distinct_venues" ? "Distinct conferences" : "Articles";
    const { visibleSeries, totalSeries } = useMemo(() => {
        const rows = query.data ?? [];
        const grouped = new Map<string, { x: number; y: number }[]>();
        const labels = new Map<string, string>();
        for (const row of rows) {
            labels.set(
                row.primary_for,
                row.primary_for_description ?? row.primary_for,
            );
            if (!grouped.has(row.primary_for)) grouped.set(row.primary_for, []);
            const y =
                metric === "distinct_venues"
                    ? row.distinct_conferences
                    : row.articles_count;
            grouped.get(row.primary_for)!.push({ x: row.year, y });
        }
        const rawSeries: LineChartSeries[] = Array.from(grouped.entries()).map(
            ([code, data]) => ({
                name: labels.get(code) ?? code,
                data: data.sort((a, b) => a.x - b.x),
                colorIndex: 0,
            }),
        );
        const ranked =
            primaryFors.length > 0 || rawSeries.length <= MAX_SERIES
                ? rawSeries.map((entry, index) => ({ ...entry, colorIndex: index }))
                : rankSeriesByTotal(rawSeries);
        return { visibleSeries: ranked, totalSeries: rawSeries.length };
    }, [query.data, primaryFors, metric]);

    const truncated = totalSeries > visibleSeries.length;
    const metricLabel = metric === "distinct_venues" ? "distinct conferences" : "articles";

    const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
    const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
    const renderedSeries = useMemo(
        () => visibleSeries.filter((entry) => !hiddenSeries.has(entry.name)),
        [visibleSeries, hiddenSeries],
    );
    const granularityLabel =
        search.granularity === "decade"
            ? "decade"
            : search.granularity === "five_year"
              ? "5-year bucket"
              : "year";

    return (
        <ChartFrame
            title="Field of Research yearly summary"
            height={460}
            isLoading={query.isPending}
            isEmpty={visibleSeries.length === 0}
            caption={
                truncated
                    ? `Showing the ${visibleSeries.length} Fields of Research with the highest total ${metricLabel} per ${granularityLabel} (${totalSeries} total). Drag on the chart to zoom in; click legend items to toggle.`
                    : `Per-${granularityLabel} ${metricLabel} per iCore primary Field of Research. Drag on the chart to zoom in; click legend items to toggle.`
            }
            footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <InteractiveLegend
                        items={visibleSeries.map((entry, index) => ({
                            key: entry.name,
                            label: entry.name,
                            colorIndex: entry.colorIndex ?? index,
                        }))}
                        hidden={hiddenSeries}
                        onToggle={(key) =>
                            setHiddenSeries((current) => {
                                const next = new Set(current);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                            })
                        }
                        onShowAll={() => setHiddenSeries(new Set())}
                        onShowOnly={(key) =>
                            setHiddenSeries(
                                new Set(
                                    visibleSeries
                                        .map((entry) => entry.name)
                                        .filter((name) => name !== key),
                                ),
                            )
                        }
                    />
                    {zoomDomain ? (
                        <div className="flex items-center gap-2 text-caption">
                            <span className="uppercase tracking-wide text-smoke">
                                Zoomed
                            </span>
                            <span className="font-mono tabular-nums text-ink">
                                {zoomDomain[0]} – {zoomDomain[1]}
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoomDomain(null)}
                                className="ml-1 px-2 py-0.5 border border-hairline rounded-sm bg-cream text-ink hover:bg-linen hover:border-ochre transition-colors duration-100"
                            >
                                Reset
                            </button>
                        </div>
                    ) : (
                        <span className="text-caption uppercase tracking-wide text-smoke">
                            Drag to zoom · Double-click to reset
                        </span>
                    )}
                </div>
            }
        >
            {({ width, height }) => (
                <LineChart
                    width={width}
                    height={height}
                    xLabel="Year"
                    yLabel={yLabel}
                    series={renderedSeries}
                    zoomDomain={zoomDomain}
                    onZoom={setZoomDomain}
                    onResetZoom={() => setZoomDomain(null)}
                />
            )}
        </ChartFrame>
    );
}

function parseVenueIds(raw: string | undefined): number[] {
    if (!raw) return [];
    return raw
        .split(/[,\s]+/)
        .map((token) => Number.parseInt(token, 10))
        .filter((value) => Number.isFinite(value) && value > 0)
        .slice(0, 20);
}

function VenueComparisonChart({ search, corpusYears }: RendererProps) {
    const effectiveEndYear = search.end_year ?? corpusYears.latestComplete;
    const venueIds = useMemo(() => parseVenueIds(search.venue_ids), [search.venue_ids]);
    const query = useVenueComparisonChart({
        venue_type: search.venue_type,
        venue_ids: venueIds,
        start_year: search.start_year,
        end_year: effectiveEndYear,
        granularity: search.granularity,
    });

    const metric = search.venue_y_metric;
    const metricLabel =
        VENUE_COMPARISON_METRICS.find((m) => m.value === metric)?.label ?? "Articles";

    const series: LineChartSeries[] = useMemo(() => {
        const rows = query.data ?? [];
        const grouped = new Map<number, { name: string; data: { x: number; y: number }[] }>();
        for (const row of rows) {
            if (!grouped.has(row.venue_id)) {
                grouped.set(row.venue_id, { name: row.venue_title, data: [] });
            }
            const y =
                metric === "distinct_authors"
                    ? row.distinct_authors
                    : metric === "total_authors"
                      ? row.total_authors
                      : row.articles_count;
            grouped.get(row.venue_id)!.data.push({ x: row.year, y });
        }
        return Array.from(grouped.values()).map((entry, index) => ({
            name: entry.name,
            data: entry.data.sort((a, b) => a.x - b.x),
            colorIndex: index,
        }));
    }, [query.data, metric]);

    const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
    const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
    const renderedSeries = useMemo(
        () => series.filter((entry) => !hiddenSeries.has(entry.name)),
        [series, hiddenSeries],
    );
    const granularityLabel =
        search.granularity === "decade"
            ? "decade"
            : search.granularity === "five_year"
              ? "5-year bucket"
              : "year";

    return (
        <ChartFrame
            title="Venue comparison"
            height={460}
            isLoading={venueIds.length > 0 && query.isPending}
            isEmpty={venueIds.length === 0 || series.length === 0}
            emptyMessage={
                venueIds.length === 0
                    ? "Pick one or more venues in the sidebar to compare them."
                    : "No data points for the selected venues."
            }
            caption={`${metricLabel} per ${granularityLabel} for the venues you select. Up to 20 series. Drag on the chart to zoom in; click legend items to toggle.`}
            footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <InteractiveLegend
                        items={series.map((entry, index) => ({
                            key: entry.name,
                            label: entry.name,
                            colorIndex: entry.colorIndex ?? index,
                        }))}
                        hidden={hiddenSeries}
                        onToggle={(key) =>
                            setHiddenSeries((current) => {
                                const next = new Set(current);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                            })
                        }
                        onShowAll={() => setHiddenSeries(new Set())}
                        onShowOnly={(key) =>
                            setHiddenSeries(
                                new Set(
                                    series
                                        .map((entry) => entry.name)
                                        .filter((name) => name !== key),
                                ),
                            )
                        }
                    />
                    {zoomDomain ? (
                        <div className="flex items-center gap-2 text-caption">
                            <span className="uppercase tracking-wide text-smoke">
                                Zoomed
                            </span>
                            <span className="font-mono tabular-nums text-ink">
                                {zoomDomain[0]} – {zoomDomain[1]}
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoomDomain(null)}
                                className="ml-1 px-2 py-0.5 border border-hairline rounded-sm bg-cream text-ink hover:bg-linen hover:border-ochre transition-colors duration-100"
                            >
                                Reset
                            </button>
                        </div>
                    ) : (
                        <span className="text-caption uppercase tracking-wide text-smoke">
                            Drag to zoom · Double-click to reset
                        </span>
                    )}
                </div>
            }
        >
            {({ width, height }) => (
                <LineChart
                    width={width}
                    height={height}
                    xLabel="Year"
                    yLabel={metricLabel}
                    series={renderedSeries}
                    zoomDomain={zoomDomain}
                    onZoom={setZoomDomain}
                    onResetZoom={() => setZoomDomain(null)}
                />
            )}
        </ChartFrame>
    );
}

function PublisherQuartileBars() {
    const query = usePublisherQuartileChart();
    const { data, totalsByCategory } = useMemo(() => {
        const rows = query.data ?? [];
        const totals = new Map<string, number>();
        for (const row of rows) {
            totals.set(row.publisher, (totals.get(row.publisher) ?? 0) + row.journal_count);
        }
        const topTen = Array.from(totals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        const tone: Record<string, number> = { Q1: 3, Q2: 0, Q3: 1, Q4: 2 };
        const totalsByCategoryMap = new Map<string, number>();
        const dataset: BarGroupDatum[] = topTen.map(([publisher, total]) => {
            const truncated =
                publisher.length > 24 ? `${publisher.slice(0, 22)}…` : publisher;
            const category = `${truncated} · ${formatThousands(total)}`;
            totalsByCategoryMap.set(category, total);
            return {
                category,
                values: ["Q1", "Q2", "Q3", "Q4"].map((quartile, index) => ({
                    seriesName: quartile,
                    value:
                        rows.find(
                            (row) =>
                                row.publisher === publisher &&
                                row.best_quartile === quartile,
                        )?.journal_count ?? 0,
                    colorIndex: tone[quartile] ?? index,
                })),
            };
        });
        return { data: dataset, totalsByCategory: totalsByCategoryMap };
    }, [query.data]);

    const grandTotal = useMemo(
        () => Array.from(totalsByCategory.values()).reduce((sum, n) => sum + n, 0),
        [totalsByCategory],
    );

    return (
        <ChartFrame
            title="Publisher quartile distribution"
            height={500}
            isLoading={query.isPending}
            isEmpty={data.length === 0}
            caption={
                grandTotal > 0
                    ? `Top ten publishers by total indexed journals (${formatThousands(grandTotal)} journals shown), broken down by best journal quartile. Each X-axis label shows the publisher's total.`
                    : "Top ten publishers by total indexed journals, broken down by best journal quartile."
            }
            legend={[
                { label: "Q1", colorIndex: 3 },
                { label: "Q2", colorIndex: 0 },
                { label: "Q3", colorIndex: 1 },
                { label: "Q4", colorIndex: 2 },
            ]}
        >
            {({ width, height }) => (
                <BarChart
                    data={data}
                    width={width}
                    height={height}
                    yLabel="Journals"
                />
            )}
        </ChartFrame>
    );
}

function VenueMetricsChart({
    search,
}: {
    search: ReturnType<typeof Route.useSearch>;
}) {
    const venueIds = useMemo(() => parseVenueIds(search.venue_ids), [search.venue_ids]);
    const query = useVenueMetricsChart({
        venue_type: search.venue_type,
        venue_ids: venueIds,
    });
    const data: BarGroupDatum[] = useMemo(() => {
        const rows = query.data ?? [];
        return rows.map((row) => ({
            category: row.venue_title.length > 18 ? `${row.venue_title.slice(0, 16)}…` : row.venue_title,
            values: [
                {
                    seriesName: "Total articles",
                    value: row.total_articles,
                    colorIndex: 0,
                },
                {
                    seriesName: "Avg articles/yr",
                    value: row.average_articles_per_year ?? 0,
                    colorIndex: 1,
                },
                {
                    seriesName: "Avg distinct authors/yr",
                    value: row.average_distinct_authors_per_year ?? 0,
                    colorIndex: 2,
                },
            ],
        }));
    }, [query.data]);

    return (
        <ChartFrame
            title="Venue metrics"
            height={420}
            isLoading={venueIds.length > 0 && query.isPending}
            isEmpty={venueIds.length === 0 || data.length === 0}
            emptyMessage={
                venueIds.length === 0
                    ? "Enter one or more venue IDs in the sidebar to compare them."
                    : "No data points for the selected venues."
            }
            caption="Per-venue totals plus per-year averages. Three grouped bars per venue."
            legend={[
                { label: "Total articles", colorIndex: 0 },
                { label: "Avg articles/yr", colorIndex: 1 },
                { label: "Avg authors/yr", colorIndex: 2 },
            ]}
        >
            {({ width, height }) => (
                <BarChart
                    data={data}
                    width={width}
                    height={height}
                    xLabel="Venue"
                    yLabel="Count"
                />
            )}
        </ChartFrame>
    );
}

function AuthorsVsArticlesScatter({
    search,
}: {
    search: ReturnType<typeof Route.useSearch>;
}) {
    const query = useAuthorsVsArticlesChart({
        venue_type: search.venue_type,
        maximum_points: 5000,
        minimum_articles: search.minimum_articles,
        rank_or_quartile: search.quartile ?? undefined,
    });
    const points: ScatterPoint[] = useMemo(() => {
        const rows = query.data ?? [];
        return rows
            .filter(
                (row) =>
                    row.average_articles_per_year !== null &&
                    row.average_authors_per_article_overall !== null,
            )
            .map((row) => ({
                id: row.venue_id,
                label: row.venue_title,
                x: row.average_articles_per_year as number,
                y: row.average_authors_per_article_overall as number,
                group: row.rank_or_quartile ?? "—",
                size: row.total_articles,
            }));
    }, [query.data]);

    const colorByGroup = useMemo(() => {
        const groups = Array.from(new Set(points.map((p) => p.group ?? "—")));
        const map = new Map<string, number>();
        groups.forEach((group, index) => map.set(group, index));
        return (group: string | undefined) =>
            group ? (map.get(group) ?? 0) : 0;
    }, [points]);

    const captionFragments = [
        `Each point is one ${search.venue_type}. X = average articles per year. Y = overall average authors per article. Point size scales with total articles published.`,
    ];
    if (search.minimum_articles > 0) {
        captionFragments.push(`Filtered to venues with ≥ ${search.minimum_articles} articles.`);
    }
    if (search.quartile) {
        captionFragments.push(`Restricted to ${search.quartile}.`);
    }

    return (
        <ChartFrame
            title="Authors per article vs articles per year"
            height={460}
            isLoading={query.isPending}
            isEmpty={points.length === 0}
            caption={captionFragments.join(" ")}
        >
            {({ width, height }) => (
                <ScatterPlot
                    points={points}
                    width={width}
                    height={height}
                    xLabel="Avg articles/yr"
                    yLabel="Avg authors/article"
                    sizeLabel="Total articles"
                    formatX={(value) => formatThousands(Math.round(value))}
                    formatY={(value) => value.toFixed(2)}
                    formatSize={(value) => formatThousands(Math.round(value))}
                    groupColorIndex={colorByGroup}
                    xScaleType={search.scatter_x_scale}
                    yScaleType={search.scatter_y_scale}
                />
            )}
        </ChartFrame>
    );
}

function JournalMetricsScatter({
    search,
}: {
    search: ReturnType<typeof Route.useSearch>;
}) {
    const query = useJournalMetricsChart({
        best_subject_area: search.subject_area,
        best_quartile: search.quartile,
        publisher: search.publisher,
        maximum_points: 5000,
    });

    const xAxis =
        JOURNAL_METRIC_AXIS_OPTIONS.find((option) => option.value === search.scatter_x) ??
        JOURNAL_METRIC_AXIS_OPTIONS[0];
    const yAxis =
        JOURNAL_METRIC_AXIS_OPTIONS.find((option) => option.value === search.scatter_y) ??
        JOURNAL_METRIC_AXIS_OPTIONS[5];
    const sizeAxis = search.scatter_size
        ? JOURNAL_METRIC_AXIS_OPTIONS.find((option) => option.value === search.scatter_size)
        : null;

    type ScatterRow = {
        journal_id: number;
        title: string;
        publisher: string | null;
        best_quartile: string | null;
        best_subject_area: string | null;
    } & Record<string, unknown>;

    const points: ScatterPoint[] = useMemo(() => {
        const rows = (query.data ?? []) as ScatterRow[];
        const colorBy = search.scatter_color_by;
        return rows
            .map((row) => {
                const groupValue =
                    colorBy === "none"
                        ? undefined
                        : ((row[colorBy] as string | null) ?? "—");
                const sizeValue = sizeAxis
                    ? (row[sizeAxis.value] as number | null)
                    : null;
                return {
                    id: row.journal_id,
                    label: row.title,
                    x: row[xAxis.value] as number | null,
                    y: row[yAxis.value] as number | null,
                    group: groupValue,
                    size: sizeValue,
                };
            })
            .filter(
                (point): point is ScatterPoint =>
                    point.x !== null &&
                    point.y !== null &&
                    Number.isFinite(point.x) &&
                    Number.isFinite(point.y),
            );
    }, [
        query.data,
        xAxis.value,
        yAxis.value,
        sizeAxis,
        search.scatter_color_by,
    ]);

    const colorByGroup = useMemo(() => {
        const groups = Array.from(new Set(points.map((p) => p.group ?? "—")));
        const map = new Map<string, number>();
        groups.forEach((group, index) => map.set(group, index));
        return (group: string | undefined) =>
            group ? (map.get(group) ?? 0) : 0;
    }, [points]);

    const formatAxis = (format: "thousands" | "decimal") =>
        format === "thousands"
            ? (value: number) => formatThousands(Math.round(value))
            : (value: number) => value.toFixed(2);

    const captionFragments = [
        `${xAxis.label} (X) vs ${yAxis.label} (Y). Each point is one journal.`,
    ];
    if (sizeAxis) captionFragments.push(`Point size encodes ${sizeAxis.label}.`);
    if (search.scatter_color_by !== "none") {
        const colorLabel =
            search.scatter_color_by === "best_quartile"
                ? "quartile"
                : search.scatter_color_by === "best_subject_area"
                  ? "subject area"
                  : "publisher";
        captionFragments.push(`Coloured by ${colorLabel}.`);
    }
    if (search.scatter_x_scale === "log" || search.scatter_y_scale === "log") {
        captionFragments.push("Axis scale is logarithmic where shown.");
    }

    return (
        <ChartFrame
            title="Journal metrics scatter"
            height={460}
            isLoading={query.isPending}
            isEmpty={points.length === 0}
            caption={captionFragments.join(" ")}
        >
            {({ width, height }) => (
                <ScatterPlot
                    points={points}
                    width={width}
                    height={height}
                    xLabel={xAxis.label}
                    yLabel={yAxis.label}
                    sizeLabel={sizeAxis?.label}
                    formatX={formatAxis(xAxis.format)}
                    formatY={formatAxis(yAxis.format)}
                    formatSize={sizeAxis ? formatAxis(sizeAxis.format) : undefined}
                    xScaleType={search.scatter_x_scale}
                    yScaleType={search.scatter_y_scale}
                    groupColorIndex={
                        search.scatter_color_by === "none" ? undefined : colorByGroup
                    }
                />
            )}
        </ChartFrame>
    );
}

function showsSubjectArea(_chart: ChartType): boolean {
    return false;
}

function showsForCode(_chart: ChartType): boolean {
    return false;
}

function showsVenueSelection(chart: ChartType): boolean {
    return (
        chart === "venue_comparison" ||
        chart === "venue_metrics" ||
        chart === "authors_vs_articles"
    );
}

function showsVenueIds(chart: ChartType): boolean {
    return chart === "venue_comparison" || chart === "venue_metrics";
}

function showsQuartile(chart: ChartType): boolean {
    return chart === "journal_metrics";
}

function showsYearRange(chart: ChartType): boolean {
    return (
        chart === "subject_area_yearly" ||
        chart === "for_yearly" ||
        chart === "venue_comparison" ||
        chart === "subject_area_heatmap" ||
        chart === "for_heatmap"
    );
}

function SubjectAreaHeatmap({ search, corpusYears }: RendererProps) {
    const effectiveEndYear = search.end_year ?? corpusYears.latestComplete;
    const subjectAreas = (search.subject_areas ?? "")
        .split(/\|/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
    const query = useSubjectAreaYearlyChart({
        subject_areas: subjectAreas.length ? subjectAreas : undefined,
        start_year: search.start_year,
        end_year: effectiveEndYear,
        granularity: search.granularity,
    });

    const cells: HeatmapCell[] = useMemo(() => {
        const rows = query.data ?? [];
        return rows.map((row) => ({
            row: row.best_subject_area,
            column: row.year,
            value: row.articles_count,
        }));
    }, [query.data]);

    const granularityLabel =
        search.granularity === "decade"
            ? "decade"
            : search.granularity === "five_year"
              ? "5-year bucket"
              : "year";

    return (
        <ChartFrame
            title="Subject area × year heatmap"
            height={520}
            isLoading={query.isPending}
            isEmpty={cells.length === 0}
            caption={`Article density by subject area per ${granularityLabel}. Darker navy means more articles; cream means zero. Hover any cell to read the exact count. Filter the subject areas in the sidebar to drill into a subset.`}
        >
            {({ width, height }) => (
                <Heatmap
                    cells={cells}
                    width={width}
                    height={height}
                    xLabel="Year"
                    yLabel="Subject area"
                    formatColumn={(value) => String(value)}
                    formatValue={(value) => formatThousands(value)}
                />
            )}
        </ChartFrame>
    );
}

function FieldOfResearchHeatmap({ search, corpusYears }: RendererProps) {
    const effectiveEndYear = search.end_year ?? corpusYears.latestComplete;
    const primaryFors = (search.primary_fors ?? "")
        .split(/[,\s]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);
    const query = useFieldOfResearchYearlyChart({
        primary_fors: primaryFors.length ? primaryFors : undefined,
        start_year: search.start_year,
        end_year: effectiveEndYear,
        granularity: search.granularity,
    });

    const cells: HeatmapCell[] = useMemo(() => {
        const rows = query.data ?? [];
        return rows.map((row) => ({
            row: row.primary_for_description ?? row.primary_for,
            column: row.year,
            value: row.articles_count,
        }));
    }, [query.data]);

    const granularityLabel =
        search.granularity === "decade"
            ? "decade"
            : search.granularity === "five_year"
              ? "5-year bucket"
              : "year";

    return (
        <ChartFrame
            title="Field of Research × year heatmap"
            height={520}
            isLoading={query.isPending}
            isEmpty={cells.length === 0}
            caption={`Conference article density by Field of Research per ${granularityLabel}. Darker navy means more articles; cream means zero. Hover any cell to read the exact count.`}
        >
            {({ width, height }) => (
                <Heatmap
                    cells={cells}
                    width={width}
                    height={height}
                    xLabel="Year"
                    yLabel="Field of Research"
                    formatColumn={(value) => String(value)}
                    formatValue={(value) => formatThousands(value)}
                />
            )}
        </ChartFrame>
    );
}

function PublicationCompositionChart() {
    const yearsQuery = useYearSummaries({});
    const points: StackedAreaPoint[] = useMemo(() => {
        const rows = yearsQuery.data ?? [];
        return rows.map((row) => ({
            x: row.year,
            values: {
                "Journal articles": row.journal_articles,
                "Conference articles": row.conference_articles,
            },
        }));
    }, [yearsQuery.data]);
    const series: StackedAreaSeries[] = [
        { name: "Journal articles", colorIndex: 0 },
        { name: "Conference articles", colorIndex: 1 },
    ];
    return (
        <ChartFrame
            title="Publication composition over time"
            height={460}
            isLoading={yearsQuery.isPending}
            isEmpty={points.length === 0}
            caption="Stacked annual counts of journal articles (navy) and conference articles (ochre). The combined height equals the corpus's total publications that year. Hover anywhere to read the per-venue split."
        >
            {({ width, height }) => (
                <StackedArea
                    series={series}
                    points={points}
                    width={width}
                    height={height}
                    xLabel="Year"
                    yLabel="Articles"
                />
            )}
        </ChartFrame>
    );
}

function CumulativeGrowthChart() {
    const yearsQuery = useYearSummaries({});
    const series: LineChartSeries[] = useMemo(() => {
        const rows = yearsQuery.data ?? [];
        let runningJournal = 0;
        let runningConference = 0;
        let runningTotal = 0;
        const journalPoints: { x: number; y: number }[] = [];
        const conferencePoints: { x: number; y: number }[] = [];
        const totalPoints: { x: number; y: number }[] = [];
        for (const row of rows) {
            runningJournal += row.journal_articles;
            runningConference += row.conference_articles;
            runningTotal += row.total_articles;
            journalPoints.push({ x: row.year, y: runningJournal });
            conferencePoints.push({ x: row.year, y: runningConference });
            totalPoints.push({ x: row.year, y: runningTotal });
        }
        return [
            { name: "Cumulative total", data: totalPoints, colorIndex: 0 },
            { name: "Cumulative journals", data: journalPoints, colorIndex: 1 },
            { name: "Cumulative conferences", data: conferencePoints, colorIndex: 2 },
        ];
    }, [yearsQuery.data]);

    const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
    const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
    const renderedSeries = series.filter(
        (entry) => !hiddenSeries.has(entry.name),
    );

    return (
        <ChartFrame
            title="Cumulative corpus growth"
            height={460}
            isLoading={yearsQuery.isPending}
            isEmpty={series[0]?.data.length === 0}
            caption="Running cumulative article counts year by year. Useful for spotting inflection points in the corpus growth. Drag on the chart to zoom in; click legend entries to toggle each running line."
            footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <InteractiveLegend
                        items={series.map((entry) => ({
                            key: entry.name,
                            label: entry.name,
                            colorIndex: entry.colorIndex ?? 0,
                        }))}
                        hidden={hiddenSeries}
                        onToggle={(key) =>
                            setHiddenSeries((current) => {
                                const next = new Set(current);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                            })
                        }
                        onShowAll={() => setHiddenSeries(new Set())}
                        onShowOnly={(key) =>
                            setHiddenSeries(
                                new Set(
                                    series
                                        .map((entry) => entry.name)
                                        .filter((name) => name !== key),
                                ),
                            )
                        }
                    />
                    {zoomDomain ? (
                        <div className="flex items-center gap-2 text-caption">
                            <span className="uppercase tracking-wide text-smoke">
                                Zoomed
                            </span>
                            <span className="font-mono tabular-nums text-ink">
                                {zoomDomain[0]} – {zoomDomain[1]}
                            </span>
                            <button
                                type="button"
                                onClick={() => setZoomDomain(null)}
                                className="ml-1 px-2 py-0.5 border border-hairline rounded-sm bg-cream text-ink hover:bg-linen hover:border-ochre transition-colors duration-100"
                            >
                                Reset
                            </button>
                        </div>
                    ) : (
                        <span className="text-caption uppercase tracking-wide text-smoke">
                            Drag to zoom · Double-click to reset
                        </span>
                    )}
                </div>
            }
        >
            {({ width, height }) => (
                <LineChart
                    width={width}
                    height={height}
                    xLabel="Year"
                    yLabel="Cumulative articles"
                    series={renderedSeries}
                    zoomDomain={zoomDomain}
                    onZoom={setZoomDomain}
                    onResetZoom={() => setZoomDomain(null)}
                />
            )}
        </ChartFrame>
    );
}

function TopPublishersChart() {
    const query = usePublisherQuartileChart();
    const data: HorizontalBarDatum[] = useMemo(() => {
        const totals = new Map<string, number>();
        for (const row of query.data ?? []) {
            totals.set(
                row.publisher,
                (totals.get(row.publisher) ?? 0) + row.journal_count,
            );
        }
        return Array.from(totals.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([publisher, total], index) => ({
                category:
                    publisher.length > 32
                        ? `${publisher.slice(0, 30)}…`
                        : publisher,
                value: total,
                colorIndex: index,
                secondary: `${total.toLocaleString()} indexed journals`,
            }));
    }, [query.data]);
    return (
        <ChartFrame
            title="Top publishers by indexed journals"
            height={520}
            isLoading={query.isPending}
            isEmpty={data.length === 0}
            caption="The 15 publishers with the most indexed journals across all quartiles. Bar length is the total journal count for that publisher; hover to see the exact number."
        >
            {({ width, height }) => (
                <HorizontalBarChart
                    data={data}
                    width={width}
                    height={height}
                    xLabel="Total indexed journals"
                />
            )}
        </ChartFrame>
    );
}
