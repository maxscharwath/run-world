import { useGameContext } from './GameContext.tsx'
import { FaClock, FaHeart, FaRunning, FaTachometerAlt } from 'react-icons/fa'

export const BLEControls = () => {
  const { vitalSigns, connectBluetooth } = useGameContext()
  const { heartRate, pace, speed, cadence } = vitalSigns
  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col space-y-4 p-4 bg-white bg-opacity-80 rounded shadow-lg">
      <button
        onClick={connectBluetooth}
        className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow"
      >
        <FaHeart/>
        <span>Connect Garmin</span>
      </button>
      <div className="flex items-center space-x-2 text-xl font-medium text-gray-800">
        <FaHeart className="text-red-500"/>
        <span>Heart Rate: {heartRate} BPM</span>
      </div>
      <div className="flex items-center space-x-2 text-xl font-medium text-gray-800">
        <FaRunning className="text-green-500"/>
        <span>Cadence: {cadence} RPM</span>
      </div>
      <div className="flex items-center space-x-2 text-xl font-medium text-gray-800">
        <FaClock className="text-yellow-500"/>
        <span>Pace: {pace.toFixed(2)} min/km</span>
      </div>
      <div className="flex items-center space-x-2 text-xl font-medium text-gray-800">
        <FaTachometerAlt className="text-blue-500"/>
        <span>Speed: {speed.toFixed(2)} km/h</span>
      </div>
    </div>
  )
}
