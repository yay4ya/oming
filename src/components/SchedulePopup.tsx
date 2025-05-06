import type { Schedule } from "@/types";
import { ListVideoIcon } from "lucide-react";
import React from "react";
import ScheduleList, { type ScheduleListHandler } from "./ScheduleList";

function SchedulePopup({ schedule, ...props }: React.HTMLProps<HTMLDivElement> & { schedule: Schedule }) {
  const [show, setShow] = React.useState(false);
  const listRef = React.useRef<ScheduleListHandler>(null);

  React.useEffect(() => {
    if (show) listRef.current?.scrollIntoView();
  }, [show]);

  return (
    <div {...props}>
      <ListVideoIcon className="relative cursor-pointer" onClick={() => setShow((prev) => !prev)} />
      <div className="relative w-full h-full">
        <div
          className="absolute bottom-[4.7rem] -right-1/2 w-[500px] max-w-svw h-[500px] max-h-svh bg-white/40 backdrop-blur-xl border border-white/40 shadow-xl rounded-xl"
          style={{ display: show ? "block" : "none", maxHeight: "calc(100vh - 150px)" }}
        >
          <ScheduleList ref={listRef} schedule={schedule} className="relative h-full overflow-y-auto p-4" />
        </div>
      </div>
    </div>
  );
}

export default SchedulePopup;
