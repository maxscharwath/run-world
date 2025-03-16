import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { GameProvider } from './GameContext'
import { BLEControls } from './BLEControls.tsx'
import { ElevationChart } from './ElevationChart.tsx'
import { Game } from './Game.tsx'

export const App = () => {
  return (
    <GameProvider>
      <div className="w-screen h-screen relative">
        <BLEControls />
        <ElevationChart />
        <Canvas shadows className="w-full h-full">
          <Suspense fallback={null}>
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[100, 300, 100]}
              intensity={1}
              castShadow
            />
            <Game />
          </Suspense>
        </Canvas>
      </div>
    </GameProvider>
  );
};
