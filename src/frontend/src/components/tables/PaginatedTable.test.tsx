import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PaginatedTable, type PaginatedTableColumn } from "./PaginatedTable";

interface Row {
    id: number;
    title: string;
    count: number;
}

const columns: PaginatedTableColumn<Row>[] = [
    { key: "title", header: "Title", render: (row) => row.title },
    { key: "count", header: "Count", numeric: true, render: (row) => row.count },
];

const rows: Row[] = [
    { id: 1, title: "First", count: 10 },
    { id: 2, title: "Second", count: 20 },
];

describe("PaginatedTable", () => {
    it("renders headers and rows", () => {
        render(
            <PaginatedTable
                columns={columns}
                rows={rows}
                page={1}
                pageSize={10}
                totalItems={2}
                isLoading={false}
                onPageChange={() => undefined}
                rowKey={(row) => row.id}
            />,
        );
        expect(screen.getByText("Title")).toBeInTheDocument();
        expect(screen.getByText("First")).toBeInTheDocument();
        expect(screen.getByText("Second")).toBeInTheDocument();
        expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("renders skeleton rows while loading", () => {
        const { container } = render(
            <PaginatedTable
                columns={columns}
                rows={[]}
                page={1}
                pageSize={10}
                totalItems={0}
                isLoading
                onPageChange={() => undefined}
                rowKey={(row) => row.id}
            />,
        );
        const skeletons = container.querySelectorAll(".animate-pulse");
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders the empty state when not loading and there are no rows", () => {
        render(
            <PaginatedTable
                columns={columns}
                rows={[]}
                page={1}
                pageSize={10}
                totalItems={0}
                isLoading={false}
                onPageChange={() => undefined}
                rowKey={(row) => row.id}
                emptyTitle="Nothing yet"
                emptyDescription="Try later"
            />,
        );
        expect(screen.getByText("Nothing yet")).toBeInTheDocument();
        expect(screen.getByText("Try later")).toBeInTheDocument();
    });

    it("invokes onRowClick on row click and forwards the row", async () => {
        const onRowClick = vi.fn();
        render(
            <PaginatedTable
                columns={columns}
                rows={rows}
                page={1}
                pageSize={10}
                totalItems={2}
                isLoading={false}
                onPageChange={() => undefined}
                rowKey={(row) => row.id}
                onRowClick={onRowClick}
            />,
        );
        await userEvent.click(screen.getByText("First"));
        expect(onRowClick).toHaveBeenCalledWith(rows[0]);
    });
});
