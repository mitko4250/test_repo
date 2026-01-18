"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Op = "+" | "-" | "×" | "÷";

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "Error";
  const abs = Math.abs(n);
  if (abs >= 1e12) return n.toExponential(6).replace(/0+e/, "e");
  // Avoid huge trailing decimals from floating math
  const fixed = Number.isInteger(n) ? n.toString() : n.toFixed(12);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function safeEval(a: number, b: number, op: Op): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

export default function Page() {
  const [display, setDisplay] = React.useState<string>("0");
  const [acc, setAcc] = React.useState<number | null>(null);
  const [pendingOp, setPendingOp] = React.useState<Op | null>(null);
  const [isTyping, setIsTyping] = React.useState<boolean>(false);
  const [justEvaluated, setJustEvaluated] = React.useState<boolean>(false);

  const displayNumber = React.useMemo(() => {
    const n = Number(display);
    return Number.isFinite(n) ? n : NaN;
  }, [display]);

  const clearAll = React.useCallback(() => {
    setDisplay("0");
    setAcc(null);
    setPendingOp(null);
    setIsTyping(false);
    setJustEvaluated(false);
  }, []);

  const inputDigit = React.useCallback(
    (d: string) => {
      setDisplay((prev) => {
        if (prev === "Error") return d;
        if (!isTyping || justEvaluated) {
          setIsTyping(true);
          setJustEvaluated(false);
          return d;
        }
        if (prev === "0") return d;
        if (prev.length >= 18) return prev;
        return prev + d;
      });
    },
    [isTyping, justEvaluated]
  );

  const inputDot = React.useCallback(() => {
    setDisplay((prev) => {
      if (prev === "Error") return "0.";
      if (!isTyping || justEvaluated) {
        setIsTyping(true);
        setJustEvaluated(false);
        return "0.";
      }
      if (prev.includes(".")) return prev;
      return prev + ".";
    });
  }, [isTyping, justEvaluated]);

  const backspace = React.useCallback(() => {
    setDisplay((prev) => {
      if (!isTyping || justEvaluated) return prev;
      if (prev === "Error") return "0";
      if (prev.length <= 1) return "0";
      const next = prev.slice(0, -1);
      return next === "-" ? "0" : next;
    });
  }, [isTyping, justEvaluated]);

  const toggleSign = React.useCallback(() => {
    setDisplay((prev) => {
      if (prev === "Error") return prev;
      const n = Number(prev);
      if (!Number.isFinite(n)) return prev;
      return formatNumber(-n);
    });
    setJustEvaluated(false);
  }, []);

  const percent = React.useCallback(() => {
    setDisplay((prev) => {
      if (prev === "Error") return prev;
      const n = Number(prev);
      if (!Number.isFinite(n)) return prev;
      return formatNumber(n / 100);
    });
    setIsTyping(false);
    setJustEvaluated(false);
  }, []);

  const applyOp = React.useCallback(
    (op: Op) => {
      const cur = Number(display);
      if (!Number.isFinite(cur)) {
        clearAll();
        return;
      }

      if (acc === null) {
        setAcc(cur);
        setPendingOp(op);
        setIsTyping(false);
        setJustEvaluated(false);
        return;
      }

      if (pendingOp && (isTyping || justEvaluated)) {
        const res = safeEval(acc, cur, pendingOp);
        if (!Number.isFinite(res)) {
          setDisplay("Error");
          setAcc(null);
          setPendingOp(null);
          setIsTyping(false);
          setJustEvaluated(true);
          return;
        }
        setAcc(res);
        setDisplay(formatNumber(res));
        setPendingOp(op);
        setIsTyping(false);
        setJustEvaluated(true);
        return;
      }

      // Change operator without computing
      setPendingOp(op);
      setIsTyping(false);
      setJustEvaluated(false);
    },
    [acc, clearAll, display, isTyping, justEvaluated, pendingOp]
  );

  const equals = React.useCallback(() => {
    const cur = Number(display);
    if (acc === null || !pendingOp) {
      setJustEvaluated(true);
      setIsTyping(false);
      return;
    }
    if (!Number.isFinite(cur)) {
      setDisplay("Error");
      setAcc(null);
      setPendingOp(null);
      setIsTyping(false);
      setJustEvaluated(true);
      return;
    }
    const res = safeEval(acc, cur, pendingOp);
    if (!Number.isFinite(res)) {
      setDisplay("Error");
      setAcc(null);
      setPendingOp(null);
      setIsTyping(false);
      setJustEvaluated(true);
      return;
    }
    setDisplay(formatNumber(res));
    setAcc(null);
    setPendingOp(null);
    setIsTyping(false);
    setJustEvaluated(true);
  }, [acc, display, pendingOp]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;

      if (key >= "0" && key <= "9") {
        e.preventDefault();
        inputDigit(key);
        return;
      }
      if (key === ".") {
        e.preventDefault();
        inputDot();
        return;
      }
      if (key === "Enter" || key === "=") {
        e.preventDefault();
        equals();
        return;
      }
      if (key === "Backspace") {
        e.preventDefault();
        backspace();
        return;
      }
      if (key === "Escape") {
        e.preventDefault();
        clearAll();
        return;
      }
      if (key === "+") {
        e.preventDefault();
        applyOp("+");
        return;
      }
      if (key === "-") {
        e.preventDefault();
        applyOp("-");
        return;
      }
      if (key === "*" || key === "x" || key === "X") {
        e.preventDefault();
        applyOp("×");
        return;
      }
      if (key === "/") {
        e.preventDefault();
        applyOp("÷");
        return;
      }
      if (key === "%") {
        e.preventDefault();
        percent();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [applyOp, backspace, clearAll, equals, inputDigit, inputDot, percent]);

  const Key = React.useCallback(
    ({
      label,
      onClick,
      variant,
      className,
      ariaLabel,
    }: {
      label: React.ReactNode;
      onClick: () => void;
      variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | null;
      className?: string;
      ariaLabel?: string;
    }) => {
      return (
        <Button
          type="button"
          variant={variant ?? "ghost"}
          onClick={onClick}
          aria-label={ariaLabel}
          className={cn(
            "h-14 w-full rounded-2xl text-base font-medium",
            "bg-white/10 text-white backdrop-blur-xl",
            "border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.22)]",
            "hover:bg-white/15 active:bg-white/20",
            "focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-0",
            className
          )}
        >
          {label}
        </Button>
      );
    },
    []
  );

  return (
    <div className="min-h-screen w-full bg-[#050B1C] text-white">
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-4 py-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-500/35 blur-3xl" />
          <div className="absolute top-40 -left-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute bottom-0 right-[-6rem] h-80 w-80 rounded-full bg-blue-600/25 blur-3xl" />
        </div>

        <header className="relative mb-6 flex items-center justify-between">
          <div className="text-sm font-medium tracking-wide text-white/75">Glassy Calculator</div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-cyan-300" />
            <span className="text-xs text-white/55">ready</span>
          </div>
        </header>

        <main className="relative flex-1">
          <section
            className={cn(
              "rounded-[28px] border border-white/10",
              "bg-white/10 backdrop-blur-2xl",
              "shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            )}
            aria-label="Calculator"
          >
            <div className="p-5">
              <div
                className={cn(
                  "rounded-2xl border border-white/10",
                  "bg-gradient-to-br from-white/10 to-white/5",
                  "px-4 py-5",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-white/55">
                    {pendingOp ? `op: ${pendingOp}` : "op: —"}
                  </div>
                  <div className="text-xs text-white/55">
                    {acc !== null ? `acc: ${formatNumber(acc)}` : "acc: —"}
                  </div>
                </div>
                <div
                  className={cn(
                    "mt-2 select-none text-right",
                    "text-4xl leading-none tracking-tight",
                    "tabular-nums"
                  )}
                  aria-live="polite"
                >
                  {display === "Error" ? "Error" : formatNumber(displayNumber)}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-3">
                <Key label="AC" onClick={clearAll} className="bg-white/12" ariaLabel="All clear" />
                <Key label="±" onClick={toggleSign} className="bg-white/12" ariaLabel="Toggle sign" />
                <Key label="%" onClick={percent} className="bg-white/12" ariaLabel="Percent" />
                <Key
                  label="÷"
                  onClick={() => applyOp("÷")}
                  className={cn(
                    "bg-gradient-to-br from-sky-400/25 to-cyan-300/10",
                    pendingOp === "÷" && "ring-2 ring-sky-300/60"
                  )}
                  ariaLabel="Divide"
                />

                <Key label="7" onClick={() => inputDigit("7")} ariaLabel="Seven" />
                <Key label="8" onClick={() => inputDigit("8")} ariaLabel="Eight" />
                <Key label="9" onClick={() => inputDigit("9")} ariaLabel="Nine" />
                <Key
                  label="×"
                  onClick={() => applyOp("×")}
                  className={cn(
                    "bg-gradient-to-br from-sky-400/25 to-cyan-300/10",
                    pendingOp === "×" && "ring-2 ring-sky-300/60"
                  )}
                  ariaLabel="Multiply"
                />

                <Key label="4" onClick={() => inputDigit("4")} ariaLabel="Four" />
                <Key label="5" onClick={() => inputDigit("5")} ariaLabel="Five" />
                <Key label="6" onClick={() => inputDigit("6")} ariaLabel="Six" />
                <Key
                  label="-"
                  onClick={() => applyOp("-")}
                  className={cn(
                    "bg-gradient-to-br from-sky-400/25 to-cyan-300/10",
                    pendingOp === "-" && "ring-2 ring-sky-300/60"
                  )}
                  ariaLabel="Subtract"
                />

                <Key label="1" onClick={() => inputDigit("1")} ariaLabel="One" />
                <Key label="2" onClick={() => inputDigit("2")} ariaLabel="Two" />
                <Key label="3" onClick={() => inputDigit("3")} ariaLabel="Three" />
                <Key
                  label="+"
                  onClick={() => applyOp("+")}
                  className={cn(
                    "bg-gradient-to-br from-sky-400/25 to-cyan-300/10",
                    pendingOp === "+" && "ring-2 ring-sky-300/60"
                  )}
                  ariaLabel="Add"
                />

                <Key
                  label={
                    <span className="inline-flex items-center justify-center gap-2">
                      <span className="text-lg">0</span>
                      <span className="text-xs text-white/65">(⌫)</span>
                    </span>
                  }
                  onClick={() => inputDigit("0")}
                  className="col-span-2"
                  ariaLabel="Zero"
                />
                <Key label="." onClick={inputDot} ariaLabel="Decimal" />
                <Key
                  label="="
                  onClick={equals}
                  className="bg-gradient-to-br from-sky-400/45 to-cyan-300/20"
                  ariaLabel="Equals"
                />

                <Key
                  label="⌫"
                  onClick={backspace}
                  className="col-span-4 bg-white/8"
                  ariaLabel="Backspace"
                />
              </div>
            </div>
          </section>

          <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/65 backdrop-blur-xl">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="text-white/75">Keyboard:</span>
              <span>0-9</span>
              <span>+ - * /</span>
              <span>Enter/=</span>
              <span>Backspace</span>
              <span>Esc</span>
              <span>%</span>
            </div>
          </div>
        </main>

        <footer className="relative mt-8 text-center text-xs text-white/45">
          Blue glass UI • Fully responsive • Local-only
        </footer>
      </div>
    </div>
  );
}
