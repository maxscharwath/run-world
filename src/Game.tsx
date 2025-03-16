import { useGameContext } from "./GameContext";
import { Road } from './Road.tsx'
import { Runner } from './Runner.tsx'

export const Game = () => {
  const { vitalSigns:{speed}, map } = useGameContext();

  return (
    <>
      <Road curve={map} roadWidth={6} segments={10} />
      <Runner curve={map} speed={speed} />
    </>
  );
};
