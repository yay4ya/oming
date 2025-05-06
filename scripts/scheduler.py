# /// script
# requires-python = ">=3.11"
# dependencies = [
#    "pydantic>=2.0,<3.0",
#    "yt-dlp==2025.04.30",
# ]
# ///

import datetime
import logging
import random
import uuid
from pathlib import Path
from typing import Annotated, Final

import yt_dlp
from pydantic import AfterValidator, BaseModel, Field

CHANNEL_ID: Final = "UC1cnByKe24JjTv38tH_7BYw"
TIME_ZONE: Final = datetime.timezone.utc
SCHEDULE_PATH: Final = Path("schedule.json")
NEW_SCHEDULE_PATH: Final = Path("schedule.new.json")
SCHEDULE_MARGIN: Final = datetime.timedelta(hours=24)
MAX_SCHEDULE_DURATION: Final = datetime.timedelta(hours=48)


logger = logging.getLogger(__name__)


class Video(BaseModel):
    id: str
    title: str
    duration: datetime.timedelta

    @property
    def url(self) -> str:
        return f"https://www.youtube.com/watch?v={self.id}"


class ScheduleEntry(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    video: Video
    start: datetime.datetime

    @property
    def end(self) -> datetime.datetime:
        return self.start + self.video.duration


def _validate_schedule_entries(entries: list[ScheduleEntry]) -> list[ScheduleEntry]:
    if not entries:
        raise ValueError("Schedule must have at least one entry.")

    entries.sort(key=lambda entry: entry.start)

    # Check for overlapping entries
    for i in range(len(entries) - 1):
        if entries[i].end > entries[i + 1].start:
            raise ValueError("Schedule entries overlap.")

    return entries


class Schedule(BaseModel):
    entries: Annotated[list[ScheduleEntry], AfterValidator(_validate_schedule_entries)]

    @property
    def start(self) -> datetime.datetime:
        return self.entries[0].start

    @property
    def end(self) -> datetime.datetime:
        return self.entries[-1].end

    @property
    def duration(self) -> datetime.timedelta:
        return self.end - self.start


def fetch_videos(channel_id: str) -> list[Video]:
    ydl_opts = {
        "quiet": True,
        "extract_flat": True,
        "force_generic_extractor": True,
        "geo_bypass": True,
        "playlist_items": "1-1000",
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        result = ydl.extract_info(
            f"https://www.youtube.com/channel/{channel_id}/streams", download=False
        )
        if not result:
            return []
        videos = [
            Video(
                id=entry["id"],
                title=entry["title"],
                duration=datetime.timedelta(seconds=entry["duration"]),
            )
            for entry in result.get("entries", [])
            if entry.get("id") and entry.get("title") and entry.get("duration")
        ]

    return videos


def fetch_previous_schedule() -> Schedule | None:
    if not SCHEDULE_PATH.exists():
        return None
    return Schedule.model_validate_json(SCHEDULE_PATH.read_text(encoding="utf-8"))


def main() -> None:
    job_start = datetime.datetime.now(TIME_ZONE)
    previous_schedule = fetch_previous_schedule()

    if previous_schedule and previous_schedule.end > job_start + SCHEDULE_MARGIN:
        logger.info("Previous schedule is still valid.")
        return

    videos = fetch_videos(CHANNEL_ID)
    if not videos:
        logger.error("No videos found.")
        raise SystemExit(1)

    first_start_time = previous_schedule.end if previous_schedule else job_start
    last_end_time = first_start_time
    entries: list[ScheduleEntry] = []
    while last_end_time - first_start_time < MAX_SCHEDULE_DURATION:
        if len(entries) % len(videos) == 0:
            random.shuffle(videos)
        video = videos[len(entries) % len(videos)]
        start_time = last_end_time
        end_time = start_time + video.duration
        entries.append(ScheduleEntry(video=video, start=start_time))
        last_end_time = end_time

    remaining_entries = (
        [entry for entry in previous_schedule.entries if entry.end >= job_start]
        if previous_schedule
        else []
    )

    schedule = Schedule(entries=remaining_entries + entries)
    with NEW_SCHEDULE_PATH.open("w", encoding="utf-8") as jsonfile:
        jsonfile.write(schedule.model_dump_json())


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )
    main()
