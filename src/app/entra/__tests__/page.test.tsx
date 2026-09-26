import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const signInWithOtp = vi.hoisted(() => vi.fn());
vi.mock("@/data/supabase", () => ({ client: () => ({ auth: { signInWithOtp } }) }));

import Entra from "../page";

/** Il modulo si invia con submit: jsdom non fa la validazione interattiva del browser. */
function invia() {
  fireEvent.submit(screen.getByRole("button", { name: "ENTRA CON UN LINK" }).closest("form")!);
}

beforeEach(() => {
  signInWithOtp.mockReset().mockResolvedValue({ error: null });
  window.history.replaceState(null, "", "/entra");
});

describe("Entra (spec fase 6 §C)", () => {
  it("Marchio pieno, Dispesa, il campo EMAIL con la sua etichetta e ENTRA CON UN LINK", () => {
    const { container } = render(<Entra />);

    expect(screen.getByRole("heading", { level: 1, name: "Dispesa" })).toBeInTheDocument();
    const campo = screen.getByLabelText("EMAIL");
    expect(campo).toHaveAttribute("type", "email");
    expect(campo).toHaveAttribute("autocomplete", "email");
    expect(campo).toBeRequired();
    expect(screen.getByRole("button", { name: "ENTRA CON UN LINK" })).toHaveAttribute("type", "submit");
    const caselle = container.querySelectorAll("[data-area]");
    expect(caselle).toHaveLength(6);
    caselle.forEach((c) => expect(c).toHaveAttribute("data-stato", "pieno"));
    expect(container.querySelector("[class*=\"bg-\"], [class*=\"flex-\"]")).toBeNull();
  });

  it("invia il link con il ritorno su /auth/callback, poi dice a quale indirizzo", async () => {
    render(<Entra />);
    fireEvent.change(screen.getByLabelText("EMAIL"), { target: { value: "andrea@example.it" } });
    invia();

    await waitFor(() => expect(signInWithOtp).toHaveBeenCalledWith({
      email: "andrea@example.it",
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    }));
    const frase = await screen.findByText(/Ti ho mandato un link a/);
    expect(frase).toHaveTextContent("Ti ho mandato un link a andrea@example.it: aprilo per entrare.");
    expect(screen.queryByLabelText("EMAIL")).not.toBeInTheDocument();
  });

  it("USA UN'ALTRA EMAIL torna al modulo, col campo vuoto", async () => {
    render(<Entra />);
    fireEvent.change(screen.getByLabelText("EMAIL"), { target: { value: "andrea@example.it" } });
    invia();
    fireEvent.click(await screen.findByRole("button", { name: "USA UN'ALTRA EMAIL" }));

    expect(screen.getByLabelText("EMAIL")).toHaveValue("");
    expect(screen.queryByText(/Ti ho mandato/)).not.toBeInTheDocument();
  });

  it("in volo il tasto è disabled e il testo non cambia", async () => {
    signInWithOtp.mockReturnValue(new Promise(() => {}));
    render(<Entra />);
    fireEvent.change(screen.getByLabelText("EMAIL"), { target: { value: "andrea@example.it" } });
    invia();

    await waitFor(() => expect(screen.getByRole("button", { name: "ENTRA CON UN LINK" })).toBeDisabled());
  });

  it("se l'invio fallisce: il messaggio in --errore, come alert, e il modulo resta", async () => {
    const errore = vi.spyOn(console, "error").mockImplementation(() => {});
    signInWithOtp.mockResolvedValue({ error: new Error("rate limit") });
    render(<Entra />);
    fireEvent.change(screen.getByLabelText("EMAIL"), { target: { value: "andrea@example.it" } });
    invia();

    const msg = await screen.findByRole("alert");
    expect(msg).toHaveTextContent("Non siamo riusciti a inviare il link. Riprova.");
    expect(msg.style.color).toBe("var(--errore)");
    expect(screen.getByLabelText("EMAIL")).toBeInTheDocument();
    errore.mockRestore();
  });

  it.each([
    ["link-non-valido", "Questo link non è valido. Richiedine uno nuovo qui sotto."],
    ["accesso-fallito", "Non siamo riusciti a completare l'accesso. Richiedi un nuovo link."],
    ["boh", "Non siamo riusciti a completare l'accesso. Riprova."],
  ])("?errore=%s dice «%s»", async (codice, testo) => {
    window.history.replaceState(null, "", `/entra?errore=${codice}`);
    render(<Entra />);
    expect(await screen.findByRole("alert")).toHaveTextContent(testo);
  });
});
