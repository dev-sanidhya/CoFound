"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, Circle, Zap, AlertTriangle, FlaskConical, ChevronDown, ChevronUp } from "lucide-react";
import { Artifact } from "@/app/api/artifacts/route";

interface Props {
  artifacts: Artifact[];
  onToggle: (id: string, completed: boolean) => void;
}

const TYPE_CONFIG = {
  action: {
    label: "Actions",
    icon: Zap,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
  risk: {
    label: "Risks",
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    borderColor: "border-red-400/20",
  },
  experiment: {
    label: "Experiments",
    icon: FlaskConical,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    borderColor: "border-yellow-400/20",
  },
} as const;

export function ArtifactsPanel({ artifacts, onToggle }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((type: string) => {
    setCollapsed((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const types = (["action", "risk", "experiment"] as const).filter((t) =>
    artifacts.some((a) => a.type === t)
  );

  if (types.length === 0) return null;

  const open = artifacts.filter((a) => !a.completed).length;
  const done = artifacts.filter((a) => a.completed).length;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-2 mb-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Actions
        </p>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {done}/{open + done}
        </span>
      </div>

      {types.map((type) => {
        const cfg = TYPE_CONFIG[type];
        const Icon = cfg.icon;
        const items = artifacts.filter((a) => a.type === type);
        const isCollapsed = collapsed[type];

        return (
          <div key={type} className="flex flex-col gap-0.5">
            <button
              onClick={() => toggleSection(type)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-accent/30 transition-colors w-full text-left"
            >
              <Icon className={`w-3 h-3 flex-shrink-0 ${cfg.color}`} />
              <span className={`text-[10px] font-semibold ${cfg.color} flex-1`}>
                {cfg.label}
              </span>
              <span className="text-[9px] text-muted-foreground tabular-nums mr-1">
                {items.filter((i) => !i.completed).length} left
              </span>
              {isCollapsed ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-3 h-3 text-muted-foreground" />
              )}
            </button>

            {!isCollapsed &&
              items.map((artifact) => (
                <button
                  key={artifact.id}
                  onClick={() => onToggle(artifact.id, !artifact.completed)}
                  className="group flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/30 transition-colors w-full text-left"
                >
                  {artifact.completed ? (
                    <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${cfg.color} opacity-50`} />
                  ) : (
                    <Circle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${cfg.color}`} />
                  )}
                  <span
                    className={`text-[11px] leading-relaxed ${
                      artifact.completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground/80 group-hover:text-foreground"
                    }`}
                  >
                    {artifact.content}
                  </span>
                </button>
              ))}
          </div>
        );
      })}
    </div>
  );
}
