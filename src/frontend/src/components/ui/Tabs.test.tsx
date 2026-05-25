import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";

function TabsHarness({ initial = "a", onChange = () => undefined as void }) {
    return (
        <Tabs value={initial} onValueChange={onChange}>
            <TabsList>
                <TabsTrigger value="a">Tab A</TabsTrigger>
                <TabsTrigger value="b">Tab B</TabsTrigger>
            </TabsList>
            <TabsContent value="a">Body A</TabsContent>
            <TabsContent value="b">Body B</TabsContent>
        </Tabs>
    );
}

describe("Tabs", () => {
    it("renders the active tab's content", () => {
        render(<TabsHarness initial="a" />);
        expect(screen.getByText("Body A")).toBeInTheDocument();
        expect(screen.queryByText("Body B")).not.toBeInTheDocument();
    });

    it("invokes onValueChange with the new value", async () => {
        const handle = vi.fn();
        render(<TabsHarness initial="a" onChange={handle} />);
        await userEvent.click(screen.getByRole("tab", { name: "Tab B" }));
        expect(handle).toHaveBeenCalledWith("b");
    });

    it("marks the active tab with data-state=active", () => {
        render(<TabsHarness initial="b" />);
        expect(
            screen.getByRole("tab", { name: "Tab B" }).getAttribute("data-state"),
        ).toBe("active");
    });
});
