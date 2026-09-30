/**
 * Builders for multi-file callouts played through `playSoundSequence`.
 * Every pack carries the digits 0-9, "thousand" and "ten thousand", so numbers
 * are spelled out from those rather than recorded per value.
 */

/**
 * Build audio sequence for "standard crosschecked, passing FL XXX"
 * @param targetAlt Target altitude in feet
 * @returns Array of audio filenames to play in sequence
 */
export const buildPassingAltitudeSequence = (targetAlt: number): string[] => {
  const sequence: string[] = ["standard_cross_checked.ogg", "passing_flight_level.ogg"]

  const flightLevel = Math.round(targetAlt / 100)
  //  FL050, FL100, FL250, etc.
  const flString = flightLevel.toString().padStart(3, "0")

  for (const digit of flString) {
    sequence.push(`${digit}.ogg`)
  }

  return sequence
}
