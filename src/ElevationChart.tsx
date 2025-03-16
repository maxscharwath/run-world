import { useMemo } from 'react'
import { useGameContext } from './GameContext'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

export const ElevationChart = () => {
  const { map } = useGameContext()

  const data = useMemo(() => {
    if (map.points.length === 0) {
      return []
    }

    const numSamples = 100
    const points = map.getPoints(numSamples)
    let cumulativeDistance = 0
    const dataArray = points.map((point, i) => {
      if (i > 0) {
        cumulativeDistance += point.distanceTo(points[i - 1])
      }
      return {
        distance: parseFloat(cumulativeDistance.toFixed(2)),
        elevation: parseFloat(point.y.toFixed(2))
      }
    })
    const minElevation = Math.min(...dataArray.map(d => d.elevation))
    if (minElevation < 0) {
      return dataArray.map(d => ({
        ...d,
        elevation: parseFloat((d.elevation - minElevation).toFixed(2))
      }))
    }
    return dataArray
  }, [map])

  return (
    <div className="w-96 h-24 bg-white bg-opacity-90 rounded shadow-lg absolute top-4 right-4 z-10">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorElevation" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#8884d8"
            fillOpacity={1}
            fill="url(#colorElevation)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
