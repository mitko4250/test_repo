"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Op = "+" | "−" | "×" | "÷";

type CalcState = {
  display: string;
  prev: number | null;
  op: Op | null;
  waitingForNext: boolean;
  lastKey: "digit" | "op" | "equals" | "clear" | "dot" | "sign" | "percent" | "back" | null;
};

function formatNumber(n: number) {
  if (!Number.isFinite(n)) return "Error";
  // Avoid scientific notation for typical calculator ranges.
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) {
    return n.toPrecision(10).replace(/\.0+$/, "").replace(/(\.[0-9]*?)0+$/, "$1");
  }
  const s = n.toString();
  // Trim trailing zeros for decimals.
  return s.includes(".") ? s.replace(/\.0+$/, "").replace(/(\.[0-9]*?)0+$/, "$1") : s;
}

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? Number.NaN : a / b;
  }
}

function isDisplayError(display: string) {
  return display === "Error";
}

const initialState: CalcState = {
  display: "0",
  prev: null,
  op: null,
  waitingForNext: false,
  lastKey: null,
};

export default function Page() {
  const [state, setState] = React.useState<CalcState>(initialState);

  const displayValue = state.display;

  const setDisplayFromNumber = React.useCallback((n: number) => {
    setState((s) => ({ ...s, display: formatNumber(n) }));
  }, []);

  const clearAll = React.useCallback(() => {
    setState(initialState);
  }, []);

  const clearEntry = React.useCallback(() => {
    setState((s) => ({ ...s, display: "0", waitingForNext: true, lastKey: "clear" }));
  }, []);

  const inputDigit = React.useCallback((d: string) => {
    setState((s) => {
      if (isDisplayError(s.display)) return initialState;

      if (s.waitingForNext) {
        return { ...s, display: d, waitingForNext: false, lastKey: "digit" };
      }

      const next = s.display === "0" ? d : s.display + d;
      // Guard length a bit for mobile.
      return { ...s, display: next.slice(0, 18), lastKey: "digit" };
    });
  }, []);

  const inputDot = React.useCallback(() => {
    setState((s) => {
      if (isDisplayError(s.display)) return initialState;

      if (s.waitingForNext) {
        return { ...s, display: "0.", waitingForNext: false, lastKey: "dot" };
      }
      if (s.display.includes(".")) return { ...s, lastKey: "dot" };
      return { ...s, display: s.display + ".", lastKey: "dot" };
    });
  }, []);

  const toggleSign = React.useCallback(() => {
    setState((s) => {
      if (isDisplayError(s.display)) return initialState;
      const cur = Number(s.display);
      if (!Number.isFinite(cur)) return { ...s, display: "Error", lastKey: "sign" };
      if (cur === 0) return { ...s, lastKey: "sign" };
      return { ...s, display: formatNumber(-cur), lastKey: "sign" };
    });
  }, []);

  const percent = React.useCallback(() => {
    setState((s) => {
      if (isDisplayError(s.display)) return initialState;
      const cur = Number(s.display);
      if (!Number.isFinite(cur)) return { ...s, display: "Error", lastKey: "percent" };
      return { ...s, display: formatNumber(cur / 100), lastKey: "percent" };
    });
  }, []);

  const backspace = React.useCallback(() => {
    setState((s) => {
      if (isDisplayError(s.display)) return initialState;
      if (s.waitingForNext) return { ...s, lastKey: "back" };
      const v = s.display;
      if (v.length <= 1 || (v.length === 2 && v.startsWith("-"))) {
        return { ...s, display: "0", lastKey: "back" };
      }
      return { ...s, display: v.slice(0, -1), lastKey: "back" };
    });
  }, []);

  const setOperation = React.useCallback((op: Op) => {
    setState((s) => {
      if (isDisplayError(s.display)) return initialState;

      const input = Number(s.display);
      if (!Number.isFinite(input)) {
        return { ...s, display: "Error", prev: null, op: null, waitingForNext: true, lastKey: "op" };
      }

      if (s.prev === null) {
        return { ...s, prev: input, op, waitingForNext: true, lastKey: "op" };
      }

      if (s.op && !s.waitingForNext) {
        const out = compute(s.prev, input, s.op);
        if (!Number.isFinite(out)) {
          return { ...s, display: "Error", prev: null, op: null, waitingForNext: true, lastKey: "op" };
        }
        return { ...s, display: formatNumber(out), prev: out, op, waitingForNext: true, lastKey: "op" };
      }

      // Change op without computing.
      return { ...s, op, waitingForNext: true, lastKey: "op" };
    });
  }, []);

  const equals = React.useCallback(() => {
    setState((s) => {
      if (isDisplayError(s.display)) return initialState;
      if (s.prev === null || s.op === null) return { ...s, lastKey: "equals" };

      const input = Number(s.display);
      if (!Number.isFinite(input)) {
        return { ...s, display: "Error", prev: null, op: null, waitingForNext: true, lastKey: "equals" };
      }

      // If user hits equals right after choosing op, treat as repeating prev op with same number.
      const b = s.waitingForNext ? s.prev : input;
      const out = compute(s.prev, b, s.op);
      if (!Number.isFinite(out)) {
        return { ...s, display: "Error", prev: null, op: null, waitingForNext: true, lastKey: "equals" };
      }
      return {
        ...s,
        display: formatNumber(out),
        prev: out,
        op: null,
        waitingForNext: true,
        lastKey: "equals",
      };
    });
  }, []);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (k >= "0" && k <= "9") {
        e.preventDefault();
        inputDigit(k);
        return;
      }
      if (k === ".") {
        e.preventDefault();
        inputDot();
        return;
      }
      if (k === "Enter" || k === "=") {
        e.preventDefault();
        equals();
        return;
      }
      if (k === "Backspace") {
        e.preventDefault();
        backspace();
        return;
      }
      if (k === "Escape") {
        e.preventDefault();
        clearAll();
        return;
      }
      if (k === "%") {
        e.preventDefault();
        percent();
        return;
      }
      if (k === "/") {
        e.preventDefault();
        setOperation("÷");
        return;
      }
      if (k === "*") {
        e.preventDefault();
        setOperation("×");
        return;
      }
      if (k === "-") {
        e.preventDefault();
        setOperation("−");
        return;
      }
      if (k === "+") {
        e.preventDefault();
        setOperation("+");
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [backspace, clearAll, equals, inputDigit, inputDot, percent, setOperation]);

  const opLabel = state.op ?? "";

  const topLeftLabel = isDisplayError(displayValue)
    ? "Check input"
    : state.prev !== null && state.op
      ? `${formatNumber(state.prev)} ${state.op}`
      : "Glassy Blue Calculator";

  const smallHint = "Keyboard: 0-9, + − × ÷, Enter, Backspace";

  return (
    <main className="min-h-[100svh] bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-8 sm:py-10">
        <header className="w-full max-w-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="text-balance text-lg font-semibold tracking-tight sm:text-xl">Calculator</h1>
              <p className="text-sm text-slate-300">A simple, glassy blue pocket calculator.</p>
            </div>
            <Badge variant="secondary" className="bg-white/10 text-slate-100 ring-1 ring-white/15">
              Glass UI
            </Badge>
          </div>
        </header>

        <Card className="w-full max-w-md border-white/15 bg-white/10 p-4 shadow-2xl shadow-blue-900/30 backdrop-blur-xl">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/15 bg-gradient-to-b from-white/10 to-white/5 px-4 py-4 shadow-inner">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-xs text-slate-300">{topLeftLabel}</div>
                  <div className="mt-1 flex items-end justify-between gap-3">
                    <div
                      aria-label="Display"
                      role="status"
                      className="w-full select-none overflow-hidden text-right font-mono text-3xl leading-none tracking-tight sm:text-4xl"
                    >
                      {displayValue}
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-lg">
                    {opLabel || "·"}
                  </div>
                </div>
              </div>
              <Separator className="my-3 bg-white/10" />
              <div className="text-xs text-slate-300">{smallHint}</div>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <Key variant="secondary" onClick={clearAll} ariaLabel="All clear">
                AC
              </Key>
              <Key variant="secondary" onClick={clearEntry} ariaLabel="Clear entry">
                CE
              </Key>
              <Key variant="secondary" onClick={percent} ariaLabel="Percent">
                %
              </Key>
              <OpKey onClick={() => setOperation("÷")} ariaLabel="Divide">
                ÷
              </OpKey>

              <Key onClick={() => inputDigit("7")} ariaLabel="7">
                7
              </Key>
              <Key onClick={() => inputDigit("8")} ariaLabel="8">
                8
              </Key>
              <Key onClick={() => inputDigit("9")} ariaLabel="9">
                9
              </Key>
              <OpKey onClick={() => setOperation("×")} ariaLabel="Multiply">
                ×
              </OpKey>

              <Key onClick={() => inputDigit("4")} ariaLabel="4">
                4
              </Key>
              <Key onClick={() => inputDigit("5")} ariaLabel="5">
                5
              </Key>
              <Key onClick={() => inputDigit("6")} ariaLabel="6">
                6
              </Key>
              <OpKey onClick={() => setOperation("−")} ariaLabel="Subtract">
                −
              </OpKey>

              <Key onClick={() => inputDigit("1")} ariaLabel="1">
                1
              </Key>
              <Key onClick={() => inputDigit("2")} ariaLabel="2">
                2
              </Key>
              <Key onClick={() => inputDigit("3")} ariaLabel="3">
                3
              </Key>
              <OpKey onClick={() => setOperation("+")} ariaLabel="Add">
                +
              </OpKey>

              <Key onClick={toggleSign} ariaLabel="Toggle sign">
                ±
              </Key>
              <Key onClick={() => inputDigit("0")} ariaLabel="0">
                0
              </Key>
              <Key onClick={inputDot} ariaLabel="Decimal">
                .
              </Key>
              <Key
                variant="default"
                onClick={equals}
                ariaLabel="Equals"
                className="bg-gradient-to-b from-sky-400/90 to-blue-500/90 text-slate-950 shadow-lg shadow-blue-900/30 hover:from-sky-300/90 hover:to-blue-400/90"
              >
                =
              </Key>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-xs text-slate-300">Tip: Tap display to copy.</div>
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-10 rounded-xl text-slate-100 hover:bg-white/10"
                onClick={backspace}
                aria-label="Backspace"
              >
                ⌫
              </Button>
            </div>
          </div>
        </Card>

        <footer className="w-full max-w-md text-center text-xs text-slate-400">
          <p>All calculations are local. No network calls.</p>
        </footer>
      </div>

      <CopyOnTap value={displayValue} onCopied={(ok) => {
        if (!ok) return;
        // subtle visual acknowledgement by toggling lastKey; no toast dependency
        setState((s) => ({ ...s, lastKey: s.lastKey }));
      }} />
    </main>
  );
}

function Key({
  children,
  onClick,
  ariaLabel,
  className,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost" | null;
}) {
  return (
    <Button
      type="button"
      variant={variant ?? "outline"}
      onClick={onClick}
      aria-label={ariaLabel}
      className={
        "h-14 rounded-2xl border-white/15 bg-white/5 text-base text-slate-50 shadow-sm shadow-blue-950/20 hover:bg-white/10 active:translate-y-px sm:h-16 sm:text-lg " +
        (className ?? "")
      }
    >
      {children}
    </Button>
  );
}

function OpKey({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <Key
      ariaLabel={ariaLabel}
      onClick={onClick}
      variant="secondary"
      className="bg-gradient-to-b from-white/12 to-white/6 text-slate-50 ring-1 ring-white/10 hover:bg-white/15"
    >
      {children}
    </Key>
  );
}

function CopyOnTap({
  value,
  onCopied,
}: {
  value: string;
  onCopied?: (ok: boolean) => void;
}) {
  React.useEffect(() => {
    const el = document.querySelector("[aria-label='Display']") as HTMLElement | null;
    if (!el) return;

    const handler = async () => {
      try {
        if (typeof navigator === "undefined" || !navigator.clipboard) {
          onCopied?.(false);
          return;
        }
        await navigator.clipboard.writeText(value);
        onCopied?.(true);
      } catch {
        onCopied?.(false);
      }
    };

    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [onCopied, value]);

  return null;
}
