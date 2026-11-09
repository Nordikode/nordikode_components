/**
 * Skalaen for linjediagrammet (SIGN-1873): fra null opp til et «pent» tall
 * over den største verdien, delt i jevne trinn (1, 2, 2,5, 5 × 10^n), slik
 * at aksen alltid leser som 0 / 5 / 10 / 15 og aldri 0 / 3,7 / 7,4.
 */
export const niceStep = (rawStep: number): number => {
  if (!(rawStep > 0)) {
    return 1
  }

  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const fraction = rawStep / magnitude

  if (fraction <= 1) {
    return magnitude
  }

  if (fraction <= 2) {
    return 2 * magnitude
  }

  if (fraction <= 2.5) {
    return 2.5 * magnitude
  }

  if (fraction <= 5) {
    return 5 * magnitude
  }

  return 10 * magnitude
}

/**
 * Trinnene på y-aksen, fra 0 til og med den første pene verdien over
 * `max`. En tom eller negativ `max` gir 0 … `count` i heltall, så et
 * diagram uten tall fortsatt har en akse.
 */
export const niceTicks = (max: number, count = 4): number[] => {
  const steps = Math.max(1, Math.round(count))

  if (!(max > 0)) {
    return Array.from({ length: steps + 1 }, (_, index) => index)
  }

  const step = niceStep(max / steps)
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []

  for (let value = 0; value <= top + step / 2; value += step) {
    ticks.push(Number(value.toFixed(10)))
  }

  return ticks
}
