"use client";

import * as React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { AlertCircle, Clock } from "lucide-react";
import type { ColorMode } from "@/lib/domain/constants";
import { ACTIVITY_LABELS, FORMAT_LABELS, PLATFORM_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/domain/constants";
import type { Campaign, Post } from "@/lib/domain/types";
import { deadlineLevel } from "@/lib/insights/alerts";
import { timeOf } from "@/lib/dates";
import { cn, tint } from "@/lib/utils";
import { FormatLabel, PlatformIcon, postColor } from "@/components/posts/post-badges";

export interface ChipContext {
  colorMode: ColorMode;
  campaigns: Map<string, Campaign>;
  onOpen: (id: string) => void;
}

export function chipTitle(post: Post) {
  return `${post.title}\n${ACTIVITY_LABELS[post.activity]} · ${PLATFORM_LABELS[post.platform]} · ${FORMAT_LABELS[post.format]} · ${STATUS_LABELS[post.status]}`;
}

/** Carte compacte d'une publication, déplaçable par glisser-déposer. */
export function PostChip({
  post,
  ctx,
  variant = "compact",
  className,
  style,
  footer,
}: {
  post: Post;
  ctx: ChipContext;
  variant?: "compact" | "month" | "block" | "card";
  className?: string;
  style?: React.CSSProperties;
  footer?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `post:${post.id}`, data: { post } });
  const color = postColor(post, ctx.colorMode, ctx.campaigns);
  const deadline = deadlineLevel(post);
  const done = post.status === "publie";

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        ctx.onOpen(post.id);
      }}
      title={chipTitle(post)}
      className={cn(
        "group/chip relative flex w-full min-w-0 touch-manipulation select-none items-center gap-1.5 overflow-hidden rounded-md border-l-[3px] text-left text-xs transition-[box-shadow,opacity,transform] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variant === "compact" && "px-1.5 py-1",
        variant === "month" && "flex-col items-start gap-0.5 px-1.5 py-1",
        variant === "block" && "flex-col items-start gap-0.5 px-2 py-1.5",
        variant === "card" && "shrink-0 flex-col items-start gap-1.5 border bg-card px-3 py-2.5 shadow-sm",
        isDragging && "opacity-30",
        done && "opacity-70",
        className,
      )}
      style={{
        borderLeftColor: color,
        backgroundColor: variant === "card" ? undefined : tint(color, 0.1),
        ...style,
      }}
    >
      {variant === "compact" ? (
        <>
          {post.scheduledAt && <span className="shrink-0 tabular text-[10.5px] text-muted-foreground">{timeOf(post.scheduledAt)}</span>}
          <PlatformIcon platform={post.platform} className="h-3 w-3 text-muted-foreground" />
          <span className={cn("truncate font-medium", done && "line-through decoration-muted-foreground/50")}>{post.title}</span>
          {deadline && <AlertCircle className={cn("ml-auto h-3 w-3 shrink-0", deadline === "late" ? "text-red-500" : "text-amber-500")} aria-label={deadline === "late" ? "En retard" : "À risque"} />}
        </>
      ) : variant === "month" ? (
        <>
          <span className="flex w-full items-center gap-1 text-[10px] leading-none text-muted-foreground">
            {post.scheduledAt && <span className="tabular">{timeOf(post.scheduledAt)}</span>}
            <PlatformIcon platform={post.platform} className="h-2.5 w-2.5" />
            <FormatLabel format={post.format} iconOnly className="[&_svg]:h-2.5 [&_svg]:w-2.5" />
            {deadline && <AlertCircle className={cn("ml-auto h-3 w-3 shrink-0", deadline === "late" ? "text-red-500" : "text-amber-500")} aria-label={deadline === "late" ? "En retard" : "À risque"} />}
          </span>
          <span className={cn("line-clamp-2 w-full font-medium leading-tight", done && "line-through decoration-muted-foreground/50")}>{post.title}</span>
        </>
      ) : (
        <>
          <div className="flex w-full items-center gap-1.5 text-[11px] text-muted-foreground">
            {post.scheduledAt && (
              <span className="inline-flex items-center gap-0.5 tabular">
                <Clock className="h-3 w-3" />
                {timeOf(post.scheduledAt)}
              </span>
            )}
            <PlatformIcon platform={post.platform} className="h-3 w-3" />
            <FormatLabel format={post.format} iconOnly />
            <span className="ml-auto inline-flex items-center gap-1">
              {deadline && <AlertCircle className={cn("h-3 w-3", deadline === "late" ? "text-red-500" : "text-amber-500")} />}
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[post.status] }} title={STATUS_LABELS[post.status]} />
            </span>
          </div>
          <span className={cn("line-clamp-2 w-full font-medium leading-snug", done && "line-through decoration-muted-foreground/50")}>{post.title}</span>
          {variant === "card" && post.hook && <span className="line-clamp-2 text-[11px] text-muted-foreground">{post.hook}</span>}
          {variant === "card" && footer}
        </>
      )}
    </button>
  );
}

/** Zone de dépôt générique. */
export function DropZone({
  id,
  children,
  className,
  activeClassName = "bg-primary/5 ring-2 ring-inset ring-primary/30",
  ...rest
}: { id: string; children?: React.ReactNode; className?: string; activeClassName?: string } & React.HTMLAttributes<HTMLDivElement>) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(className, isOver && activeClassName)} {...rest}>
      {children}
    </div>
  );
}
