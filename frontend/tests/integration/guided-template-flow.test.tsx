import { describe, expect, it } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderWithProviders } from "../helpers/render";
import { server } from "../helpers/msw-server";
import { CreateTemplateDialog } from "@/src/components/dashboard/CreateTemplateDialog";

describe("guided template flow", () => {
  it("submits low_code_spec for guided starter templates", async () => {
    let postedBody: Record<string, unknown> | null = null;

    server.use(
      http.post("http://localhost:3000/v1/templates", async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          template: {
            id: "tpl_guided",
            name: "Guided invoice",
            description: null,
            is_official: false,
            live_version: null,
            versions: [],
            created_at: 1738377600,
            updated_at: 1738377600,
          },
        });
      })
    );

    renderWithProviders(<CreateTemplateDialog open={true} onClose={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/invoice template/i), {
      target: { value: "Guided invoice" },
    });
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "guided-invoice" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => expect(postedBody).not.toBeNull());
    expect(postedBody?.name).toBe("Guided invoice");
    expect(postedBody?.source).toBeUndefined();
    expect(postedBody?.low_code_spec).toBeDefined();
  });
});
