import { useGameContext } from './GameContext'
import { Road } from './Road.tsx'
import { Runner } from './Runner.tsx'
import { Ground } from './Ground.tsx'

export const Game = () => {
  const { vitalSigns: { connected, speed }, map } = useGameContext()

  return (
    <>
      <Road curve={map} roadWidth={8} segments={10}/>
      <Runner curve={map} speed={connected ? speed : 30}/>
      <Ground curve={map}/>
    </>
  )
}
