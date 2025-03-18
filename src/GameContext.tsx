import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react'
import { CatmullRomCurve3, Vector3 } from 'three'

const useJson = <T, > (importer: () => Promise<{ default: T }>) => {
  const [data, setData] = useState<T>()
  void useMemo(async () => {
    const { default: json } = await importer()
    setData(json)
  }, [importer])
  return data
}

interface GameContextProps {
  vitalSigns: {
    connected: boolean;
    heartRate: number;
    pace: number;
    speed: number;
    cadence: number;
  };
  map: CatmullRomCurve3;
  connectBluetooth: () => void;
}

const GameContext = createContext<GameContextProps>({
  vitalSigns: {
    connected: false,
    heartRate: 0,
    pace: 0,
    speed: 0,
    cadence: 0
  },
  map: new CatmullRomCurve3([]),
  connectBluetooth: () => {}
})

export const GameProvider = ({ children }: PropsWithChildren) => {
  const [connected, setConnected] = useState<boolean>(false)
  const [heartRate, setHeartRate] = useState<number>(0)
  const [speed, setSpeed] = useState<number>(0)
  const [pace, setPace] = useState<number>(0)
  const [cadence, setCadence] = useState<number>(0)

  async function connectBluetooth () {
    try {
      console.log('Requesting Bluetooth Device...')
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['running_speed_and_cadence']
      })
      setConnected(true)

      console.log('Connecting to GATT Server...')
      const server = await device.gatt?.connect()

      // Heart Rate Service
      console.log('Getting Heart Rate Service...')
      const hrService = await server?.getPrimaryService('heart_rate')
      console.log('Getting Heart Rate Measurement Characteristic...')
      const hrCharacteristic = await hrService?.getCharacteristic('heart_rate_measurement')
      await hrCharacteristic?.startNotifications()
      console.log('Heart Rate Notifications started')

      hrCharacteristic?.addEventListener('characteristicvaluechanged', (event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic
        const value = target.value
        if (!value) return

        const bpm = value.getUint8(0) & 0x01
          ? value.getUint16(1, true)
          : value.getUint8(1)
        setHeartRate(bpm)
      })

      // Running Speed and Cadence Service
      console.log('Getting Running Speed and Cadence Service...')
      const rscService = await server?.getPrimaryService('running_speed_and_cadence')
      console.log('Getting Running Speed and Cadence Measurement Characteristic...')
      // Standard UUID for RSC Measurement is 0x2A53
      const rscCharacteristic = await rscService?.getCharacteristic(0x2A53)
      await rscCharacteristic?.startNotifications()
      console.log('Running Speed and Cadence Notifications started')

      rscCharacteristic?.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic
        if (!target.value) return
        const value = target.value
        // RSC Measurement layout based on the XML specification:
        // Byte 0: Flags
        // Bytes 1-2: Instantaneous Speed (unit: m/s with resolution 1/256)
        // Byte 3: Instantaneous Cadence (steps per minute)
        const instantaneousSpeedRaw = value.getUint16(1, true)
        // Convert raw speed: value in m/s = raw / 256, then convert to km/h
        const speedMS = instantaneousSpeedRaw / 256
        const speedKmh = speedMS * 3.6
        setSpeed(speedKmh)
        setPace(speedKmh > 0 ? 60 / speedKmh : 0)
        const cadenceRaw = value.getUint8(3)
        setCadence(cadenceRaw)
      })
    } catch (error) {
      console.error('Bluetooth error:', error)
    }
  }

  const jsonMap = useJson(() => import('./assets/puidoux.json'))
  const map = useMemo(() => {
    if (!jsonMap) return new CatmullRomCurve3([], true, 'centripetal')
    const points = jsonMap.map(
      ([x, y, z]: number[]) => new Vector3(x, y, z)
    )
    if (points.length < 2) return new CatmullRomCurve3([])
    if (points[0].distanceTo(points[points.length - 1]) < 1e-6) {
      points.pop()
    }
    return new CatmullRomCurve3(points, true, 'centripetal')
  }, [jsonMap])

  return (
    <GameContext.Provider value={{
      vitalSigns: { connected, heartRate, pace, speed, cadence },
      map,
      connectBluetooth
    }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGameContext = () => useContext(GameContext)
