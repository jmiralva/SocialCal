// True on touch-first devices (phones, tablets), where drag needs a long press first.
export const isCoarsePointer = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
