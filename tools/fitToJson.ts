import * as fs from "fs";
// @ts-expect-error FitParser is not typed
import FitParser from "fit-file-parser";

export type Point = [number, number, number];

interface FitRecord {
  timestamp: Date;
  position_lat?: number;
  position_long?: number;
  enhanced_altitude?: number;
}

interface FitData {
  records: FitRecord[];
}

interface GPSPoint {
  lat: number;
  lon: number;
  alt: number;
}

/**
 * Computes the haversine distance (in meters) between two GPS coordinates.
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts a GPS point to a Three.js coordinate relative to a reference GPS point.
 * FLIPPED version:
 *   x = -R * dLat,
 *   z = -R * dLon * cos(ref.lat),
 *   y = altitude difference.
 */
function gpsToThree(p: GPSPoint, ref: GPSPoint): Point {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((p.lat - ref.lat) * Math.PI) / 180;
  const dLon = ((p.lon - ref.lon) * Math.PI) / 180;
  const x = -R * dLat;
  const z = -R * dLon * Math.cos(ref.lat * Math.PI / 180);
  const y = p.alt - ref.alt;
  return [x, y, z];
}

/**
 * Converts a .fit file (as a Buffer) into a JSON path in the Three.js coordinate system.
 * The resulting path is a list of points [x, y, z] spaced at regular intervals (default 1 meter),
 * with coordinates computed relative to the first GPS point.
 */
export function convertFitToJson(
  buffer: Buffer,
  spacing: number = 1
): Promise<Point[]> {
  return new Promise((resolve, reject) => {
    const fitParser = new (FitParser as {
      default: new (options: { force: boolean; mode: string }) => FitParser;
    }).default({ force: true, mode: "list" });
    fitParser.parse(buffer, (error: Error, data: FitData) => {
      if (error) {
        return reject(error);
      }
      const records = data.records;
      const gpsRecords = records.filter(
        (rec) =>
          typeof rec.position_lat === "number" &&
          typeof rec.position_long === "number"
      );
      if (gpsRecords.length < 2) {
        return reject(
          new Error(`Not enough GPS data points found. Found ${gpsRecords.length}`)
        );
      }
      const rawPoints: GPSPoint[] = gpsRecords.map((rec) => ({
        lat: rec.position_lat as number,
        lon: rec.position_long as number,
        alt: rec.enhanced_altitude ?? 0,
      }));

      // Compute cumulative horizontal distances along the path.
      const cumDistances: number[] = [0];
      for (let i = 1; i < rawPoints.length; i++) {
        const d = haversineDistance(
          rawPoints[i - 1].lat,
          rawPoints[i - 1].lon,
          rawPoints[i].lat,
          rawPoints[i].lon
        );
        cumDistances.push(cumDistances[i - 1] + d);
      }
      const totalDistance = cumDistances[cumDistances.length - 1];

      // Resample points at regular spacing.
      const resampled: GPSPoint[] = [];
      for (let d = 0; d <= totalDistance; d += spacing) {
        let i = 0;
        while (i < cumDistances.length - 1 && cumDistances[i + 1] < d) {
          i++;
        }
        if (i >= cumDistances.length - 1) {
          i = cumDistances.length - 2;
        }
        const segmentDist = cumDistances[i + 1] - cumDistances[i];
        const t = segmentDist === 0 ? 0 : (d - cumDistances[i]) / segmentDist;
        const interpLat =
          rawPoints[i].lat + t * (rawPoints[i + 1].lat - rawPoints[i].lat);
        const interpLon =
          rawPoints[i].lon + t * (rawPoints[i + 1].lon - rawPoints[i].lon);
        const interpAlt =
          rawPoints[i].alt + t * (rawPoints[i + 1].alt - rawPoints[i].alt);
        resampled.push({ lat: interpLat, lon: interpLon, alt: interpAlt });
      }
      // Convert to Three.js coordinates using the first point as reference.
      const ref = rawPoints[0];
      const threePoints: Point[] = resampled.map((p) => gpsToThree(p, ref));
      resolve(threePoints);
    });
  });
}

/**
 * Merges similar points to avoid overlapping road segments.
 * For each point, if a point that occurred at least `minIndexDiff` earlier is within `tolerance` (in meters),
 * the new point is snapped to the earlier point.
 *
 * @param points - Array of points ([x, y, z]).
 * @param tolerance - Distance tolerance in meters (default is 0.5).
 * @param minIndexDiff - Minimum index difference to consider for merging (default is 10).
 * @returns A new array of points with similar points merged.
 */
export function mergeSimilarPoints(
  points: Point[],
  tolerance: number = 0.5,
  minIndexDiff: number = 10
): Point[] {
  const merged = [...points];
  for (let i = minIndexDiff; i < merged.length; i++) {
    for (let j = 0; j < i - minIndexDiff; j++) {
      const dx = merged[i][0] - merged[j][0];
      const dy = merged[i][1] - merged[j][1];
      const dz = merged[i][2] - merged[j][2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < tolerance) {
        merged[i] = merged[j];
        break;
      }
    }
  }
  return merged;
}

/**
 * Saves an array of Points to a JSON file.
 *
 * @param points - Array of points ([x, y, z]).
 * @param filename - Output filename.
 */
export function savePointsToJson(points: Point[], filename: string): void {
  fs.writeFileSync(filename, JSON.stringify(points, null, 2), { encoding: "utf8" });
}

// Example usage:
(async () => {
  try {
    const buffer = fs.readFileSync("./centralpark.fit");
    const points = await convertFitToJson(buffer, 10);
    const mergedPoints = mergeSimilarPoints(points, 10, 10);
    savePointsToJson(mergedPoints, "./centralpark.json");
    console.log(`Saved ${mergedPoints.length} points to pathPoints.json`);
  } catch (err) {
    console.error("Error:", err);
  }
})();
