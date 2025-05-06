import type { Schedule } from "@/types";
import { entryStart, formatDate, getLiveEntry, getThumbnailURL } from "@/utils";
import React from "react";

export interface ScheduleListHandler {
  scrollIntoView: () => void;
}

const ScheduleList = React.forwardRef(
  (
    { schedule, ...props }: React.HTMLProps<HTMLDivElement> & { schedule: Schedule },
    ref: React.Ref<ScheduleListHandler>,
  ) => {
    const liveEntryRef = React.useRef<HTMLDivElement | null>(null);

    const liveEntry = React.useMemo(() => {
      return getLiveEntry(schedule);
    }, [schedule]);

    React.useImperativeHandle(ref, () => ({
      scrollIntoView: () => {
        if (liveEntryRef.current) {
          liveEntryRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      },
    }));

    return (
      <div {...props}>
        {schedule.entries.map((entry) => (
          <div
            key={entry.id}
            className={`mt-2 h-[5rem] flex gap-2 items-center px-3 py-2 rounded-lg ${liveEntry?.video.id === entry.video.id ? "bg-white/50" : ""}`}
            {...{ ref: liveEntry?.video.id === entry.video.id ? liveEntryRef : undefined }}
          >
            <div className="shrink-0 w-[100px]">
              <img
                alt={entry.video.title}
                src={getThumbnailURL(entry.video.id, "default")}
                className="aspect-video object-cover overflow-hidden rounded-lg"
                width={100}
              />
            </div>
            <div>
              <div className="text-xs text-gray-600 ml-2">{formatDate(entryStart(entry))}</div>
              <div className="text-sm mt-1 line-clamp-2">{entry.video.title}</div>
            </div>
          </div>
        ))}
      </div>
    );
  },
);

export default ScheduleList;
