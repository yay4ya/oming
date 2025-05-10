import { VolumeIcon as Volume0Icon, Volume1Icon, Volume2Icon, VolumeXIcon } from "lucide-react";
import React from "react";
import type { YouTubePlayer } from "react-youtube";

function VolumeControl({ player, ...props }: React.HTMLProps<HTMLDivElement> & { player?: YouTubePlayer }) {
  const [volume, setVolume] = React.useState(player?.getVolume() ?? 100);
  const [mute, setMute] = React.useState(player?.isMuted() ?? false);
  const [showVolume, setShowVolume] = React.useState(false);

  React.useEffect(() => {
    if (player) {
      setVolume(player.getVolume());
    }
  }, [player]);

  const handleVolumeChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseInt(event.target.value, 10);
    setVolume(newVolume);
  }, []);

  const VolumeIcon = React.useMemo(() => {
    if (mute) return VolumeXIcon;
    if (volume > 66) {
      return Volume2Icon;
    }
    if (volume > 33) {
      return Volume1Icon;
    }
    if (volume > 0) {
      return Volume0Icon;
    }
    return VolumeXIcon;
  }, [volume, mute]);

  React.useEffect(() => {
    if (player?.g) {
      if (mute) player.mute();
      else player.unMute();
    }
  }, [player, mute]);

  React.useEffect(() => {
    if (player?.g) {
      player.setVolume(volume);
    }
  }, [player, volume]);

  return (
    <div {...props}>
      {showVolume && (
        <div
          className="absolute top-0 left-0 w-full h-full"
          onClick={() => setShowVolume(false)}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
      <VolumeIcon
        className="relative cursor-pointer z-10"
        onMouseEnter={() => setShowVolume(true)}
        onClick={() => setMute((prev: boolean) => !prev)}
      />
      <div
        className="relative w-full h-full"
        style={{ display: showVolume ? "block" : "none" }}
        onMouseLeave={() => setShowVolume(false)}
      >
        <div className="absolute bottom-1/2 -right-1/2 w-fit">
          <div className="bg-white/10 border border-white/40 rounded-lg backdrop-blur-lg shadow-xl mb-[4rem] py-4">
            <input
              type="range"
              min="0"
              max="100"
              value={mute ? 0 : volume}
              disabled={mute}
              onChange={handleVolumeChange}
              className="h-[100px] w-[3rem] cursor-pointer py-4 relative "
              style={{
                writingMode: "vertical-lr",
                direction: "rtl",
                verticalAlign: "middle",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default VolumeControl;
