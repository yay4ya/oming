import React from 'react'
import { ListVideoIcon } from 'lucide-react'
import { type Schedule } from '@/types'
import { getLiveEntry, formatDate, entryStart, getThumbnailURL } from '@/utils'


function ScheduleList({ schedule, ...props }: React.HTMLProps<HTMLDivElement> & { schedule: Schedule }) {
  const [show, setShow] = React.useState(false)

  const liveEntry = React.useMemo(() => {
    return getLiveEntry(schedule)
  }, [schedule])

  React.useEffect(() => {
    if (show) {
      const liveEntryElement = document.querySelector(`div[data-live="true"]`)
      if (liveEntryElement) {
        liveEntryElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [show])

  return (
    <div {...props}>
      <ListVideoIcon
        className="w-6 h-6 cursor-pointer"
        onClick={() => setShow(prev => !prev)}
      />
      <div
        className="fixed bottom-[70px] right-0 w-full max-w-[500px] h-[500px] bg-white/40 backdrop-blur-xl border border-white/40 shadow-xl rounded-xl"
        style={{ display: show ? 'block' : 'none', maxHeight: 'calc(100vh - 150px)' }}
      >
        <div className="relative h-full overflow-y-auto p-4">
          {schedule.entries.map((entry, index) => (
            <div
              key={index}
              className={`mt-2 h-[5rem] flex gap-2 items-center px-3 py-2 rounded-lg ${liveEntry?.video.id == entry.video.id ? 'bg-white/50' : ''}`}
              data-live={liveEntry?.video.id == entry.video.id}
            >
              <div className="shrink-0 w-[100px]">
                <img
                  src={getThumbnailURL(entry.video.id, 'default')}
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
      </div >
    </div >
  )
}

export default ScheduleList
