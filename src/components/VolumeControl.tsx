import React from 'react'
import { VolumeXIcon, VolumeIcon as Volume0Icon, Volume1Icon, Volume2Icon } from 'lucide-react'
import { type YouTubePlayer } from 'react-youtube'

function VolumeControl({ player, ...props }: React.HTMLProps<HTMLDivElement> & { player?: YouTubePlayer }) {
  const [volume, setVolume] = React.useState(player?.getVolume() ?? 100)
  const [mute, setMute] = React.useState(player?.isMuted() ?? false)
  const [showVolume, setShowVolume] = React.useState(false)

  React.useEffect(() => {
    if (player) {
      setVolume(player.getVolume())
    }
  }, [player])

  const handleVolumeChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(event.target.value, 10)
    setVolume(newVolume)
    if (player && player.g) {
      player.setVolume(newVolume)
    }
  }, [player])

  const VolumeIcon = React.useMemo(() => {
    if (mute) return VolumeXIcon
    if (volume > 66) {
      return Volume2Icon
    } else if (volume > 33) {
      return Volume1Icon
    } else if (volume > 0) {
      return Volume0Icon
    }
    return VolumeXIcon
  }, [volume, mute])

  React.useEffect(() => {
    if (player && player.g) {
      if (mute) player.mute()
      else player.unMute()
    }
  }, [player, mute])

  return (
    <div {...props}>
      <VolumeIcon
        className="z-10 relative cursor-pointer"
        onMouseEnter={() => setShowVolume(true)}
        onClick={() => setMute((prev: boolean) => !prev)}
      />
      <div
        className="relative w-full h-full"
        style={{ display: showVolume ? 'block' : 'none' }}
        onMouseLeave={() => setShowVolume(false)}
      >
        <div className="absolute bottom-1/2 -left-1/2 w-fit bg-gray">
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
                writingMode: 'vertical-lr',
                direction: 'rtl',
                verticalAlign: 'middle',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default VolumeControl
